// Unified request handler for the proxy.
//
// Works with any OpenAI-compatible client: simple frontends,
// Copilot, Cursor, or any tool-calling agent.
//
// Conversation ID: opt-in via X-Lethus-Conversation-Id header.
//   - Without it: proxy only — no DB, no history, no tracking.
//   - With it: cross-session memory, history injection, writeback.
//
// Client detection:
//   - No assistant messages → thin client (e.g. our frontend).
//     Lethus fetches and injects history via the retrieval pipeline
//     (embed → Milvus → z-score → changelog boost → Kadane).
//   - Has assistant messages → thick client (e.g. Copilot/Cursor).
//     Client manages its own history. Lethus adds state doc and
//     reduces if over budget with Kadane-scored trimming.
//
// Full OpenAI format is always preserved: tool_calls, content
// arrays, developer role, etc. are forwarded verbatim.

import type { Request, Response } from "express";
import { assembleContext } from "../algorithm/contextAssembler";
import { callUpstreamStreaming, callUpstreamRaw } from "../services/llm";
import { getTurnCount, ensureConversation } from "../services/turnStorage";
import { scheduleWriteback } from "../services/writeback";
import { config } from "../config";
import type { ProxyRequest, OpenAIMessage } from "../types";
import {
  extractTextContent,
  countOpenAIMessagesTokens,
  reduceMessages,
} from "./classify";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleChatCompletion(
  req: Request,
  res: Response,
): Promise<void> {
  const startMs = Date.now();

  try {
    // ── Validate ────────────────────────────────────────────
    const body = req.body as ProxyRequest;

    if (!body.messages || !Array.isArray(body.messages)) {
      res.status(400).json({
        error: {
          message: "messages field is required and must be an array",
          type: "invalid_request_error",
        },
      });
      return;
    }

    if (!body.model) {
      res.status(400).json({
        error: {
          message: "model field is required",
          type: "invalid_request_error",
        },
      });
      return;
    }

    const messages = body.messages as OpenAIMessage[];

    // ── Conversation (opt-in) ───────────────────────────────
    const rawConversationId = req.headers["x-lethus-conversation-id"] as
      | string
      | undefined;
    const conversationId = rawConversationId ?? null;

    if (conversationId && !UUID_RE.test(conversationId)) {
      res.status(400).json({
        error: {
          message: "X-Lethus-Conversation-Id must be a valid UUID",
          type: "invalid_request_error",
        },
      });
      return;
    }

    const hasConversation = conversationId !== null;
    let currentTurnNumber = 0;

    if (hasConversation) {
      const browserId = (req.headers["x-lethus-browser-id"] as string) ?? null;
      await ensureConversation(conversationId, browserId);
      currentTurnNumber = (await getTurnCount(conversationId)) + 1;
    }

    // ── Extract User Text ───────────────────────────────────
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    const currentUserText = lastUserMsg ? extractTextContent(lastUserMsg) : "";

    // ── Build Final Messages ────────────────────────────────
    // Thin client (no assistant messages + conv ID): inject retrieved history.
    // Thick client (has assistant messages): passthrough + reduce if needed.
    const hasClientHistory = messages.some(m => m.role === "assistant");

    let finalMessages: OpenAIMessage[];
    let reductionPercent = 0;
    let intent: string | undefined;

    if (hasConversation && !hasClientHistory && currentUserText) {
      // ── Thin Client: Retrieval + Injection ────────────────
      const retrieval = await assembleContext(
        conversationId,
        currentUserText,
      );

      // Collect system/developer messages from the client
      const clientSystemMsgs = messages.filter(
        m => m.role === "system" || m.role === "developer",
      );

      const systemContent = clientSystemMsgs.length > 0
        ? clientSystemMsgs.map(m => extractTextContent(m)).join("\n\n")
        : "You are a helpful assistant.";

      finalMessages = [{ role: "system", content: systemContent }];

      for (const turn of retrieval.selectedTurns) {
        finalMessages.push({
          role: turn.role as "user" | "assistant",
          content: turn.content,
        });
      }

      finalMessages.push({ role: "user", content: currentUserText });

      reductionPercent = retrieval.metadata.reductionPercent;
      intent = retrieval.metadata.intent;
    } else {
      // ── Thick Client / No Conversation: Passthrough ───────
      const incomingTokens = countOpenAIMessagesTokens(messages);

      if (incomingTokens <= config.agenticTokenThreshold) {
        finalMessages = [...messages];
      } else {
        // Over budget — reduce with Kadane-scored trimming
        finalMessages = reduceMessages(
          messages,
          config.agenticTokenThreshold,
          config.agenticTailPreserve,
          currentUserText,
        );
        const reducedTokens = countOpenAIMessagesTokens(finalMessages);
        reductionPercent = Math.round(
          (1 - reducedTokens / incomingTokens) * 100,
        );

        console.log(
          `[lethus] Reduced ${incomingTokens} → ${reducedTokens} tokens ` +
            `(${reductionPercent}% reduction)` +
            (hasConversation ? ` conv=${conversationId}` : ""),
        );
      }
    }

    // ── Forward to Upstream ─────────────────────────────────
    const { messages: _ignored, ...restBody } = body;
    void _ignored;

    const upstreamCtx: UpstreamContext = {
      conversationId,
      hasConversation,
      currentTurnNumber,
      currentUserText,
      reductionPercent,
      intent,
      startMs,
    };

    if (restBody.stream) {
      await handleStreaming(res, restBody, finalMessages, upstreamCtx);
    } else {
      await handleNonStreaming(res, restBody, finalMessages, upstreamCtx);
    }
  } catch (error) {
    console.error("Proxy handler error:", error);
    res.status(500).json({
      error: {
        message:
          error instanceof Error ? error.message : "Internal server error",
        type: "internal_error",
      },
    });
  }
}

// ── Upstream Forwarding ─────────────────────────────────────

interface UpstreamContext {
  conversationId: string | null;
  hasConversation: boolean;
  currentTurnNumber: number;
  currentUserText: string;
  reductionPercent: number;
  intent?: string;
  startMs: number;
}

async function handleStreaming(
  res: Response,
  restBody: Record<string, unknown>,
  finalMessages: OpenAIMessage[],
  ctx: UpstreamContext,
): Promise<void> {
  const processingMs = Date.now() - ctx.startMs;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (ctx.hasConversation) {
    res.setHeader("X-Lethus-Conversation-Id", ctx.conversationId!);
  }
  res.setHeader(
    "X-Lethus-Reduction-Percent",
    ctx.reductionPercent.toString(),
  );
  if (ctx.intent) res.setHeader("X-Lethus-Intent", ctx.intent);
  res.setHeader("X-Lethus-Processing-Ms", processingMs.toString());

  const upstreamResponse = await callUpstreamStreaming({
    ...restBody,
    messages: finalMessages,
  });

  if (!upstreamResponse.body) {
    res.status(500).json({
      error: {
        message: "Upstream response body is missing",
        type: "internal_error",
      },
    });
    return;
  }

  const reader = upstreamResponse.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let assistantContent = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);

        if (!rawEvent) continue;

        res.write(rawEvent + "\n\n");

        const lines = rawEvent
          .split("\n")
          .map(l => l.trim())
          .filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();
          if (dataStr === "[DONE]") break;
          try {
            const payload = JSON.parse(dataStr) as {
              choices?: Array<{
                delta?: { content?: string | null };
              }>;
            };
            const delta = payload.choices?.[0]?.delta?.content;
            if (delta) assistantContent += delta;
          } catch {
            // ignore non-JSON data lines
          }
        }
      }
    }

    if (buffer.length > 0) res.write(buffer);
    res.end();
  } finally {
    if (
      ctx.hasConversation &&
      assistantContent.trim().length > 10 &&
      ctx.currentUserText
    ) {
      scheduleWriteback({
        conversationId: ctx.conversationId!,
        turnNumber: ctx.currentTurnNumber,
        userMessage: ctx.currentUserText,
        assistantResponse: assistantContent,
        userTokens: 0,
        assistantTokens: 0,
      });
    }
  }
}

async function handleNonStreaming(
  res: Response,
  restBody: Record<string, unknown>,
  finalMessages: OpenAIMessage[],
  ctx: UpstreamContext,
): Promise<void> {
  const { json: upstreamResult, content } = await callUpstreamRaw({
    ...restBody,
    messages: finalMessages,
  });

  if (ctx.hasConversation) {
    res.setHeader("X-Lethus-Conversation-Id", ctx.conversationId!);
  }
  res.setHeader(
    "X-Lethus-Reduction-Percent",
    ctx.reductionPercent.toString(),
  );
  if (ctx.intent) res.setHeader("X-Lethus-Intent", ctx.intent);
  res.setHeader(
    "X-Lethus-Processing-Ms",
    (Date.now() - ctx.startMs).toString(),
  );

  res.json(upstreamResult);

  if (
    ctx.hasConversation &&
    content.trim().length > 10 &&
    ctx.currentUserText
  ) {
    scheduleWriteback({
      conversationId: ctx.conversationId!,
      turnNumber: ctx.currentTurnNumber,
      userMessage: ctx.currentUserText,
      assistantResponse: content,
      userTokens: 0,
      assistantTokens: 0,
    });
  }
}
