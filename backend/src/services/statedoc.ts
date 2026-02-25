// Manages the "State Document" — a living, structured summary
// of the conversation's current state.
//
// What it contains:
//   - Current decisions (active, not superseded)
//   - Open issues
//   - Technical context (language, framework, constraints)
//   - Current task / what we're working on
//
// What it does NOT contain:
//   - The actual conversation history
//   - Superseded decisions
//   - Resolved issues
//
// When is it updated?
//   Every STATE_DOC_UPDATE_INTERVAL turns (default: 3).
//   So at turns 3, 6, 9, 12...
//   Update is async (cold path) — never blocks response.
//
// Why update periodically instead of every turn?
//   - LLM calls are expensive (~200ms)
//   - The state doc doesn't change radically every single turn
//   - Batching gives the LLM more context to synthesize from
//
// Token budget:
//   Target 300-400 tokens. The state doc is prepended to every
//   prompt — it must be small enough to leave room for turns.

import { chat } from "./llm";
import { prisma } from "../db/prisma";
import { getActiveChangelog } from "./changelog";
import type { StoredStateDoc } from "../types";

const STATE_DOC_SYSTEM_PROMPT = `You maintain a "State Document" for an ongoing conversation.

The State Document is a concise, structured summary of the conversation's current state. It is used to prime an AI assistant with context before it responds.

Format (use exactly these sections, omit empty ones):
## Current State
[One sentence: what are we building/doing right now?]

## Active Decisions
[Bullet list of decisions that are still in effect. Only include active ones.]

## Open Issues
[Bullet list of unresolved problems. Remove resolved ones.]

## Technical Context
[Bullet list: language, framework, database, key constraints, architecture choices]

## Recent Focus
[One sentence: what was the last thing we worked on?]

Rules:
- Maximum 350 tokens total
- Be extremely concise — every word counts
- Use present tense
- No explanations, no hedging
- If a section would be empty, omit it entirely`;

// ── Generate State Doc From Scratch ──────────────────────────
// Called when no state doc exists yet.
// Uses the first N turns + changelog to bootstrap.

async function generateStateDoc(
  conversationId: string,
  recentTurnsText: string,
  changelogText: string,
): Promise<string> {
  return chat(
    [
      { role: "system", content: STATE_DOC_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Generate a State Document from this conversation.\n\n` +
          `RECENT TURNS:\n${recentTurnsText}\n\n` +
          `CHANGELOG:\n${changelogText}\n\n` +
          `Respond with the State Document only.`,
      },
    ],
    { model: "gpt-4o-mini", maxTokens: 400 },
  );
}

// ── Update Existing State Doc ─────────────────────────────────
// More efficient than regenerating from scratch.
// Shows the model the current state doc + what changed recently
// and asks it to update only what changed.

async function updateStateDoc(
  currentDoc: string,
  recentTurnsText: string,
  newChangelogText: string,
): Promise<string> {
  return chat(
    [
      { role: "system", content: STATE_DOC_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Update this State Document based on recent turns.\n\n` +
          `CURRENT STATE DOCUMENT:\n${currentDoc}\n\n` +
          `RECENT TURNS (update based on these):\n${recentTurnsText}\n\n` +
          `NEW CHANGELOG ENTRIES:\n${newChangelogText}\n\n` +
          `Return the updated State Document only. ` +
          `Keep what hasn't changed. Update what has.`,
      },
    ],
    { model: "gpt-4o-mini", maxTokens: 400 },
  );
}

// ── Main Export: Upsert State Doc ────────────────────────────
// Called by the writeback job every STATE_DOC_UPDATE_INTERVAL turns.
// Idempotent — safe to call multiple times for the same turn.

export async function upsertStateDoc(
  conversationId: string,
  currentTurnNumber: number,
): Promise<void> {
  // Get the last 6 turns of actual conversation text for context
  const recentTurns = await prisma.turn.findMany({
    where: { conversationId },
    orderBy: [{ turnNumber: "desc" }, { role: "asc" }],
    take: 12, // 6 user + 6 assistant turns
  });

  if (recentTurns.length === 0) return;

  const recentTurnsText = recentTurns
    .reverse()
    .map((t) => `[Turn ${t.turnNumber} - ${t.role}]: ${t.content}`)
    .join("\n\n");

  // Get active changelog entries
  const changelog = await getActiveChangelog(conversationId);
  const changelogText =
    changelog.length > 0
      ? changelog
          .map((e) => `[Turn ${e.turnNumber}] ${e.category}: ${e.content}`)
          .join("\n")
      : "No significant decisions or issues logged yet.";

  // Check if state doc exists
  const existing = await prisma.stateDoc.findUnique({
    where: { conversationId },
  });

  let newContent: string;

  if (!existing) {
    // First time — generate from scratch
    newContent = await generateStateDoc(
      conversationId,
      recentTurnsText,
      changelogText,
    );
  } else {
    // Update from existing — more efficient
    // Only show changelog entries since last update
    const newEntries = changelog.filter(
      (e) => e.turnNumber > existing.lastUpdatedAtTurn,
    );
    const newChangelogText =
      newEntries.length > 0
        ? newEntries
            .map((e) => `[Turn ${e.turnNumber}] ${e.category}: ${e.content}`)
            .join("\n")
        : "No new changelog entries since last update.";

    newContent = await updateStateDoc(
      existing.content,
      recentTurnsText,
      newChangelogText,
    );
  }

  // Upsert to database
  await prisma.stateDoc.upsert({
    where: { conversationId },
    create: {
      conversationId,
      content: newContent,
      version: 1,
      lastUpdatedAtTurn: currentTurnNumber,
    },
    update: {
      content: newContent,
      version: { increment: 1 },
      lastUpdatedAtTurn: currentTurnNumber,
    },
  });

  console.log(
    `State doc updated for conversation ${conversationId} ` +
      `at turn ${currentTurnNumber} ` +
      `(version ${(existing?.version ?? 0) + 1})`,
  );
}

// ── Get State Doc ─────────────────────────────────────────────
// Returns current state doc content, or null if none exists.
// Hot path uses this to prepend to retrieval context.

export async function getStateDoc(
  conversationId: string,
): Promise<StoredStateDoc | null> {
  const doc = await prisma.stateDoc.findUnique({
    where: { conversationId },
  });

  return doc as StoredStateDoc | null;
}
