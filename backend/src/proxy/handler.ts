// Request handler for the proxy endpoint.
//
// Flow:
//   1. Parse incoming OpenAI-format request
//   2. Extract or generate conversation ID
//   3. Get current turn number
//   4. Run hot path (assemble context)
//   5. Build final messages array
//   6. Call upstream LLM
//   7. Send response to user
//   8. Fire writeback (async, non-blocking)
//   9. Return (user's request is complete)
//
// Conversation ID:
//   Passed in X-Lethus-Conversation-Id header.
//   If not provided, we generate a new UUID.
//   The response includes this header so the client can
//   use the same ID on the next request.
//
// Drop-in compatibility:
//   The request and response format is identical to OpenAI's
//   /v1/chat/completions. Your users can point their existing
//   OpenAI client at Lethus by changing only the base URL.

import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import {
  assembleContext,
  buildFinalMessages,
} from "../algorithm/contextAssembler";
import { callUpstream, callUpstreamStreaming } from "../services/llm";
import { getTurnCount, ensureConversation } from "../services/turnStorage";
import { scheduleWriteback } from "../services/writeback";
import type { ProxyRequest, ChatMessage } from "../types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleChatCompletion(
  req: Request,
  res: Response,
): Promise<void> {
  const startMs = Date.now();

  try {
    // ── Parse Request ───────────────────────────────────────
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

    // ── Extract Conversation ID ─────────────────────────────
    const rawConversationId = req.headers["x-lethus-conversation-id"] as
      | string
      | undefined;
    const conversationId = rawConversationId ?? randomUUID();

    if (!UUID_RE.test(conversationId)) {
      res.status(400).json({
        error: {
          message:
            "X-Lethus-Conversation-Id must be a valid UUID",
          type: "invalid_request_error",
        },
      });
      return;
    }

    // ── Extract Browser ID ────────────────────────────
    const browserId = (req.headers["x-lethus-browser-id"] as string) ?? null;

    // Ensure the conversation record exists in PostgreSQL
    await ensureConversation(conversationId, browserId);

    // ── Extract Message Parts ───────────────────────────────
    // Split the incoming messages into:
    //   - system prompt (if any)
    //   - current user message (last user message)
    //   - prior history (everything in between)
    //
    // The client sends us: [system?, history..., user_message]
    // We throw away their history and replace it with our retrieval.

    const systemMessage = body.messages.find(
      (m: ChatMessage) => m.role === "system",
    );
    const userMessages = body.messages.filter(
      (m: ChatMessage) => m.role === "user",
    );

    if (userMessages.length === 0) {
      res.status(400).json({
        error: {
          message: "At least one user message is required",
          type: "invalid_request_error",
        },
      });
      return;
    }

    // The current message is always the last user message
    const currentMessage = userMessages.at(-1)!.content;

    // ── Get Turn Number ─────────────────────────────────────
    const currentTurnNumber = (await getTurnCount(conversationId)) + 1;

    // ── Hot Path: Assemble Context ──────────────────────────
    const retrieval = await assembleContext(
      conversationId,
      currentMessage,
      systemMessage?.content,
    );

    // ── Build Final Messages ────────────────────────────────
    const finalMessages = await buildFinalMessages(
      conversationId,
      currentMessage,
      systemMessage?.content,
      retrieval,
    );

    // ── Call Upstream LLM ───────────────────────────────────
    // Strip the messages from the original body and add our
    // assembled messages. Pass all other params through (temperature, etc.)
    const { messages: _ignored, ...restBody } = body;
    void _ignored;

    // If the client requested streaming, proxy the upstream SSE stream.
    if (restBody.stream) {
      // ── Streaming Mode ────────────────────────────────────
      const processingMs = Date.now() - startMs;

      // Set headers before starting the stream
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      res.setHeader("X-Lethus-Conversation-Id", conversationId);
      res.setHeader(
        "X-Lethus-Reduction-Percent",
        retrieval.metadata.reductionPercent.toString(),
      );
      res.setHeader("X-Lethus-Intent", retrieval.metadata.intent);
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

          // Split into SSE events separated by double newlines
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);

            if (!rawEvent) {
              continue;
            }

            // Forward the event as-is
            res.write(rawEvent + "\n\n");

            // Extract assistant content from OpenAI-style SSE
            const lines = rawEvent
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const dataStr = line.slice(5).trim();

              if (dataStr === "[DONE]") {
                break;
              }

              try {
                const payload = JSON.parse(dataStr) as {
                  choices?: Array<{
                    delta?: { content?: string | null };
                  }>;
                };

                const delta =
                  payload.choices?.[0]?.delta?.content ?? undefined;
                if (delta) {
                  assistantContent += delta;
                }
              } catch {
                // ignore JSON parse errors on non-JSON data lines
              }
            }
          }
        }

        // Ensure any remaining buffered data is flushed
        if (buffer.length > 0) {
          res.write(buffer);
        }

        res.end();
      } finally {
        // Fire writeback with whatever content we accumulated.
        // We don't have reliable token counts in streaming mode, so pass 0s.
        scheduleWriteback({
          conversationId,
          turnNumber: currentTurnNumber,
          userMessage: currentMessage,
          assistantResponse: assistantContent,
          userTokens: 0,
          assistantTokens: 0,
        });
      }
    } else {
      // ── Non-streaming Mode (existing behaviour) ────────────
      const { content, inputTokens, outputTokens } = await callUpstream({
        ...restBody,
        messages: finalMessages,
      });

      const processingMs = Date.now() - startMs;

      // ── Send Response ─────────────────────────────────────
      // Response is OpenAI-compatible so existing clients work unchanged.
      // We add Lethus metadata in the response headers.
      res.setHeader("X-Lethus-Conversation-Id", conversationId);
      res.setHeader(
        "X-Lethus-Reduction-Percent",
        retrieval.metadata.reductionPercent.toString(),
      );
      res.setHeader("X-Lethus-Intent", retrieval.metadata.intent);
      res.setHeader("X-Lethus-Processing-Ms", processingMs.toString());

      // OpenAI-format response body
      res.json({
        id: `chatcmpl-lethus-${randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content,
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          // Lethus metadata in usage object
          lethus_metadata: {
            original_tokens: retrieval.metadata.originalTokenCount,
            retrieved_tokens: retrieval.metadata.retrievedTokenCount,
            reduction_percent: retrieval.metadata.reductionPercent,
            intent: retrieval.metadata.intent,
            spans_selected: retrieval.metadata.spansSelected,
            changelog_entries_used: retrieval.metadata.changelogEntriesUsed,
            processing_ms: processingMs,
          },
        },
      });

      // ── Fire Cold Path ────────────────────────────────────
      // This runs AFTER the response is sent.
      // The user is not waiting for this.
      scheduleWriteback({
        conversationId,
        turnNumber: currentTurnNumber,
        userMessage: currentMessage,
        assistantResponse: content,
        userTokens: inputTokens,
        assistantTokens: outputTokens,
      });
    }
  } catch (error) {
    console.error("Proxy handler error:", error);

    // Return an OpenAI-compatible error format
    res.status(500).json({
      error: {
        message:
          error instanceof Error ? error.message : "Internal server error",
        type: "internal_error",
      },
    });
  }
}
