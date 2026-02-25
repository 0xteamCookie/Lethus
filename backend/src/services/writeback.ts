// The cold path orchestrator.
//
// Called after the response is sent to the user.
// Runs all async post-processing in the correct order.
//
// Order matters:
//   1. Ensure conversation record exists
//   2. Store turns in PostgreSQL (needed by later steps)
//   3. Store embeddings in Milvus (for future retrieval)
//   4. Extract + save changelog entries (needs turn text)
//   5. Update state doc if interval reached (needs changelog)
//
// Each step has independent error handling.
// A failure in step 3 should not prevent step 4 from running.
//
// Fire-and-forget pattern:
//   Caller does: scheduleWriteback(job)  — returns immediately
//   This function runs in the background, catches errors.

import { config } from "../config";
import {
  ensureConversation,
  storeTurnPair,
  storeTurnEmbedding,
  getTurnCount,
} from "./turnStorage";
import { saveChangelogEntries } from "./changelog";
import { upsertStateDoc } from "./statedoc";
import type { WritebackJob } from "../types";

// ── Core Writeback Logic ──────────────────────────────────────

async function runWriteback(job: WritebackJob): Promise<void> {
  const {
    conversationId,
    turnNumber,
    userMessage,
    assistantResponse,
    userTokens,
    assistantTokens,
  } = job;

  const startMs = Date.now();

  // Step 1: Ensure conversation record exists
  // This is idempotent — creates only if missing
  await ensureConversation(conversationId);

  // Step 2: Store turns in PostgreSQL
  // We need this before anything else because other services
  // query the turns table
  try {
    await storeTurnPair(
      conversationId,
      turnNumber,
      userMessage,
      assistantResponse,
    );
    console.log(
      `[Writeback] Stored turns for conversation ${conversationId} turn ${turnNumber}`,
    );
  } catch (error) {
    console.error("[Writeback] Failed to store turns:", error);
    // If we can't store turns, the rest won't work — bail out
    return;
  }

  // Steps 3, 4, 5 run in parallel where possible.
  // They are independent of each other (given turns exist).

  // Step 3: Store embedding in Milvus
  const embeddingPromise = storeTurnEmbedding(
    conversationId,
    turnNumber,
    userMessage,
    assistantResponse,
  ).catch((error) => {
    console.error("[Writeback] Failed to store embedding:", error);
    // Non-fatal: retrieval degrades gracefully (fewer vectors)
  });

  // Step 4: Extract and save changelog entries
  const changelogPromise = saveChangelogEntries(
    conversationId,
    turnNumber,
    userMessage,
    assistantResponse,
  ).catch((error) => {
    console.error("[Writeback] Failed to save changelog:", error);
    // Non-fatal: less structured memory, but still works
  });

  // Wait for both to complete before possibly updating state doc
  // (state doc update needs the latest changelog)
  await Promise.all([embeddingPromise, changelogPromise]);

  // Step 5: Update state doc if we've hit the interval
  const totalTurns = await getTurnCount(conversationId);
  const shouldUpdateStateDoc = totalTurns % config.stateDocUpdateInterval === 0;

  if (shouldUpdateStateDoc) {
    try {
      await upsertStateDoc(conversationId, turnNumber);
    } catch (error) {
      console.error("[Writeback] Failed to update state doc:", error);
      // Non-fatal: stale state doc is better than no state doc
    }
  }

  const elapsed = Date.now() - startMs;
  console.log(
    `[Writeback] Completed in ${elapsed}ms — ` +
      `conversation ${conversationId}, turn ${turnNumber}, ` +
      `tokens: ${userTokens + assistantTokens}`,
  );
}

// ── Fire and Forget ───────────────────────────────────────────
// This is what the proxy calls. It starts the writeback and
// returns immediately — it does NOT await the writeback.
//
// The user's response has already been sent. This runs in
// the background. If the Node.js process dies before it
// finishes, the turn simply isn't stored.
//
// For production you'd use a job queue (BullMQ, etc).
// For a hackathon, fire-and-forget is fine.

export function scheduleWriteback(job: WritebackJob): void {
  // Start async, don't await, catch top-level errors
  runWriteback(job).catch((error) => {
    console.error(
      `[Writeback] Unhandled error for conversation ${job.conversationId}:`,
      error,
    );
  });
}
