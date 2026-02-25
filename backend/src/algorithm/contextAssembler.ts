//   1. Check cold start (< COLD_START_THRESHOLD turns)
//      → If cold start, just return all turns as-is
//
//   2. Classify intent of current message
//      → Different intents use different strategies
//
//   3. CLARIFICATION: return just last assistant turn
//      CONTINUATION: return last N turns, skip embedding search
//      NEW_TOPIC: return state doc only
//      RECALL: run full pipeline below
//
//   4. Full pipeline (RECALL + CONTINUATION fallback):
//      a. Embed the current query
//      b. Search Milvus for similar turns
//      c. Fetch all turn scores (for z-score normalization)
//      d. Z-score normalize scores
//      e. Apply changelog boost
//      f. Calculate Kadane gain values
//      g. Find best contiguous spans
//      h. Apply token budget
//      i. Get recent turns (always included)
//      j. Assemble final context with state doc
//
//   5. Return turns + metadata (for observability panel)

import { embed } from "../services/llm";
import { milvus, COLLECTION_NAME } from "../db/milvus";
import { classifyIntent } from "../services/intent";
import { getActiveChangelog } from "../services/changelog";
import { getStateDoc } from "../services/statedoc";
import {
  getAllTurns,
  getRecentTurns,
  getTurnCount,
} from "../services/turnStorage";
import { countTokens } from "../services/tokenizer";
import { zScoreNormalize } from "./zscore";
import { applyChangelogBoost } from "./boost";
import { findBestSpans } from "./kadane";
import { applyTokenBudget } from "./budget";
import { config } from "../config";
import type {
  Intent,
  RetrievalResult,
  StoredTurn,
  ChatMessage,
} from "../types";

// ── Main Assembly Function ────────────────────────────────────
export async function assembleContext(
  conversationId: string,
  currentMessage: string,
  systemPrompt?: string,
): Promise<RetrievalResult> {
  const startMs = Date.now();

  // Get total turn count to check for cold start
  const totalTurns = await getTurnCount(conversationId);
  const allTurns = await getAllTurns(conversationId);

  // Calculate "original" token count (if we sent everything)
  const originalTokenCount = allTurns.reduce((sum, t) => sum + t.tokenCount, 0);

  // ── Cold Start Path ───────────────────────────────────────
  // If we have fewer turns than the threshold, there's not
  // enough history to make retrieval meaningful.
  // Just return everything as-is.
  if (totalTurns <= config.coldStartThreshold) {
    return {
      selectedTurns: allTurns,
      tokenCount: originalTokenCount,
      metadata: {
        intent: "CONTINUATION",
        totalTurns,
        originalTokenCount,
        retrievedTokenCount: originalTokenCount,
        reductionPercent: 0,
        spansSelected: [],
        changelogEntriesUsed: 0,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // ── Get recent turns for context ─────────────────────────
  const recentTurns = await getRecentTurns(
    conversationId,
    config.recentTurnsCount,
  );

  // Build recent context string for intent classification
  const recentContextStr = recentTurns
    .slice(-2) // Last 1 exchange for classification
    .map((t) => `${t.role}: ${t.content.slice(0, 200)}`)
    .join("\n");

  // ── Classify Intent ───────────────────────────────────────
  const intent = await classifyIntent(currentMessage, recentContextStr);

  // ── Intent-Specific Shortcuts ─────────────────────────────

  // CLARIFICATION: User wants the last assistant response explained.
  // Just give them the last turn — nothing else needed.
  if (intent === "CLARIFICATION") {
    const lastAssistantTurns = allTurns.filter((t) => t.role === "assistant");
    const lastAssistant = lastAssistantTurns.at(-1);
    const selectedTurns = lastAssistant ? [lastAssistant] : recentTurns;
    const tokenCount = selectedTurns.reduce((sum, t) => sum + t.tokenCount, 0);

    return {
      selectedTurns,
      tokenCount,
      metadata: {
        intent,
        totalTurns,
        originalTokenCount,
        retrievedTokenCount: tokenCount,
        reductionPercent: Math.round(
          (1 - tokenCount / originalTokenCount) * 100,
        ),
        spansSelected: [],
        changelogEntriesUsed: 0,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // NEW_TOPIC: User is starting fresh. Only state doc context.
  // Return no historical turns — just the state doc will be prepended.
  if (intent === "NEW_TOPIC") {
    const recentTokens = recentTurns.reduce((sum, t) => sum + t.tokenCount, 0);
    return {
      selectedTurns: recentTurns, // Keep very recent turns only
      tokenCount: recentTokens,
      metadata: {
        intent,
        totalTurns,
        originalTokenCount,
        retrievedTokenCount: recentTokens,
        reductionPercent: Math.round(
          (1 - recentTokens / originalTokenCount) * 100,
        ),
        spansSelected: [],
        changelogEntriesUsed: 0,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // CONTINUATION: User is continuing recent work.
  // Return last N turns. Skip expensive embedding search.
  if (intent === "CONTINUATION") {
    const continuationTurns = await getRecentTurns(
      conversationId,
      config.recentTurnsCount + 2, // Slightly more than usual
    );
    const tokenCount = continuationTurns.reduce(
      (sum, t) => sum + t.tokenCount,
      0,
    );
    return {
      selectedTurns: continuationTurns,
      tokenCount,
      metadata: {
        intent,
        totalTurns,
        originalTokenCount,
        retrievedTokenCount: tokenCount,
        reductionPercent: Math.round(
          (1 - tokenCount / originalTokenCount) * 100,
        ),
        spansSelected: [],
        changelogEntriesUsed: 0,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // ── Full Pipeline (RECALL) ────────────────────────────────
  // Step 1: Embed the current query
  const queryEmbedding = await embed(currentMessage);

  // Step 2: Search Milvus for ALL turns in this conversation
  // We fetch ALL of them (not just top-K) because we need
  // the full score distribution for z-score normalization.
  const searchResult = await milvus.search({
    collection_name: COLLECTION_NAME,
    vectors: [queryEmbedding],
    filter: `conversation_id == "${conversationId}"`,
    output_fields: ["turn_number", "conversation_id"],
    limit: Math.min(totalTurns + 10, 16384), // Milvus max
    params: { nprobe: 16 }, // Search 16 clusters (more = accurate but slower)
  });

  const searchHits = (searchResult.results ?? []).flat() as unknown as Array<{
    id: string;
    score: number;
    turn_number?: number;
  }>;

  if (searchHits.length === 0) {
    // No results from Milvus — fall back to recent turns
    const tokenCount = recentTurns.reduce((sum, t) => sum + t.tokenCount, 0);
    return {
      selectedTurns: recentTurns,
      tokenCount,
      metadata: {
        intent,
        totalTurns,
        originalTokenCount,
        retrievedTokenCount: tokenCount,
        reductionPercent: 0,
        spansSelected: [],
        changelogEntriesUsed: 0,
        processingMs: Date.now() - startMs,
      },
    };
  }

  // Step 3: Extract scores from Milvus results
  const rawScores = searchHits.map((hit) => ({
    turnNumber: Number(hit.turn_number ?? hit.id.split("_")[1]),
    score: hit.score,
  }));

  // Step 4: Z-score normalize
  const normalized = zScoreNormalize(rawScores);

  // Step 5: Get active changelog for boost
  const activeChangelog = await getActiveChangelog(conversationId);

  // Step 6: Apply changelog boost
  const boosted = applyChangelogBoost(
    normalized.map((n) => ({
      turnNumber: n.turnNumber,
      zScore: n.zScore,
    })),
    activeChangelog,
  );

  // Step 7: Find best contiguous spans with Kadane's
  const spans = findBestSpans(boosted, 3);

  // Collect all turn numbers selected by Kadane's
  const kadaneTurnNumbers = spans.flatMap((s) => s.turnNumbers);

  // Step 8: Apply token budget
  const budgetResult = applyTokenBudget(
    allTurns,
    recentTurns,
    kadaneTurnNumbers,
  );

  const processingMs = Date.now() - startMs;
  const reductionPercent =
    originalTokenCount > 0
      ? Math.round((1 - budgetResult.totalTokens / originalTokenCount) * 100)
      : 0;

  return {
    selectedTurns: budgetResult.includedTurns,
    tokenCount: budgetResult.totalTokens,
    metadata: {
      intent,
      totalTurns,
      originalTokenCount,
      retrievedTokenCount: budgetResult.totalTokens,
      reductionPercent,
      spansSelected: spans.map((s) => ({
        start: s.startTurn,
        end: s.endTurn,
      })),
      changelogEntriesUsed: activeChangelog.length,
      processingMs,
    },
  };
}

// ── Build Final Messages Array ────────────────────────────────
// Converts retrieval result + state doc into the messages array
// that gets sent to the upstream LLM.
//
// Structure:
//   [system prompt with state doc injected]
//   [retrieved historical turns]
//   [current user message]

export async function buildFinalMessages(
  conversationId: string,
  currentMessage: string,
  originalSystemPrompt: string | undefined,
  retrieval: RetrievalResult,
): Promise<ChatMessage[]> {
  // Get state doc to prepend
  const stateDoc = await getStateDoc(conversationId);

  // Build system prompt with state doc injected
  let systemContent = originalSystemPrompt ?? "You are a helpful assistant.";

  if (stateDoc) {
    systemContent +=
      "\n\n---\n## Conversation State\n" +
      stateDoc.content +
      "\n---\n\n" +
      "The above represents the current state of this conversation. " +
      "Use it as ground truth for any questions about prior decisions or context.";
  }

  const messages: ChatMessage[] = [{ role: "system", content: systemContent }];

  // Add retrieved turns in chronological order
  for (const turn of retrieval.selectedTurns) {
    messages.push({
      role: turn.role as "user" | "assistant",
      content: turn.content,
    });
  }

  // Add current user message
  messages.push({ role: "user", content: currentMessage });

  return messages;
}
