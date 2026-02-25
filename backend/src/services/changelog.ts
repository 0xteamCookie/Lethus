// Extracts structured changelog entries from a conversation turn.
//
// A "changelog entry" captures what actually happened in a turn
// in a structured, queryable form. Raw conversation text is hard
// to reason about. Structured entries are not.
//
// Example:
//   Raw turn: "I think we should switch from PostgreSQL to SQLite
//              since we don't need concurrent writes in this demo"
//
//   Extracted:
//     { category: "UPDATE", content: "Database changed from PostgreSQL to SQLite.
//                                     Reason: no concurrent writes needed in demo." }
//     { category: "DECISION", content: "Use SQLite for persistence layer." }
//
// Supersession detection:
//   If a new UPDATE contradicts an existing DECISION, we mark
//   that DECISION as superseded. This prevents the state doc
//   from containing conflicting information.

import { chat } from "./llm";
import { prisma } from "../db/prisma";
import type { ChangelogCategory, StoredChangelogEntry } from "../types";

interface ExtractedEntry {
  category: ChangelogCategory;
  content: string;
}

const CHANGELOG_SYSTEM_PROMPT = `You extract structured changelog entries from a conversation turn.

A changelog entry captures a meaningful event: a decision made, something updated, a problem found, a problem solved, or important context established.

NOT every turn generates changelog entries. If the turn is just chatting, explaining a concept, or simple acknowledgment — return an empty array.

Generate entries for:
- Explicit decisions ("we'll use X", "let's go with Y", "I've decided to Z")  
- Updates or changes to previous decisions ("switch from X to Y", "actually let's use Z instead")
- Problems identified ("the issue is X", "there's a bug in Y", "X is failing")
- Problems resolved ("fixed by X", "the solution was Y", "resolved by Z")
- Important technical context that will need to be recalled later

Each entry:
- category: "DECISION" | "UPDATE" | "ISSUE" | "RESOLUTION" | "CONTEXT"
- content: one clear sentence describing what happened. Be specific. Include names, values, reasons when present.

Respond with JSON only: {"entries": [{"category": "...", "content": "..."}]}
If no meaningful entries, respond: {"entries": []}`;

export async function extractChangelogEntries(
  turnNumber: number,
  userMessage: string,
  assistantResponse: string,
): Promise<ExtractedEntry[]> {
  try {
    const response = await chat(
      [
        { role: "system", content: CHANGELOG_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `User (turn ${turnNumber}): ${userMessage}\n\n` +
            `Assistant (turn ${turnNumber}): ${assistantResponse}`,
        },
      ],
      {
        model: "gpt-4o-mini",
        maxTokens: 400,
        jsonMode: true,
      },
    );

    const parsed = JSON.parse(response) as {
      entries: Array<{ category: string; content: string }>;
    };

    if (!Array.isArray(parsed.entries)) {
      return [];
    }

    const validCategories: ChangelogCategory[] = [
      "DECISION",
      "UPDATE",
      "ISSUE",
      "RESOLUTION",
      "CONTEXT",
    ];

    return parsed.entries
      .filter(
        (e) =>
          validCategories.includes(e.category as ChangelogCategory) &&
          typeof e.content === "string" &&
          e.content.trim().length > 0,
      )
      .map((e) => ({
        category: e.category as ChangelogCategory,
        content: e.content.trim(),
      }));
  } catch (error) {
    // Changelog extraction failing is non-fatal.
    // The conversation still works — we just have less structured memory.
    console.error(`Changelog extraction failed for turn ${turnNumber}:`, error);
    return [];
  }
}

// ── Supersession Detection ────────────────────────────────────
// When we see a new UPDATE entry, check if it supersedes an
// existing DECISION.
//
// Approach: use embedding similarity.
// An UPDATE about "database → SQLite" should supersede a DECISION
// about "database → PostgreSQL" because both are about the same
// subject (database choice).
//
// use keyword overlap.
// Production version would use embeddings.
//
// Why keyword overlap is acceptable here:
//   The changelog entries are already structured and short.
//   "Database changed from PostgreSQL to SQLite" and
//   "Use PostgreSQL for persistence" share "PostgreSQL" and
//   "database" — that's enough signal.

async function detectAndMarkSuperseded(
  conversationId: string,
  turnNumber: number,
  newEntries: ExtractedEntry[],
): Promise<void> {
  const updateEntries = newEntries.filter((e) => e.category === "UPDATE");

  if (updateEntries.length === 0) return;

  // Get all active DECISION entries for this conversation
  const activeDecisions = await prisma.changelogEntry.findMany({
    where: {
      conversationId,
      category: "DECISION",
      supersededBy: null, // Only active decisions
    },
  });

  if (activeDecisions.length === 0) return;

  for (const updateEntry of updateEntries) {
    const stopwords = new Set([
      "the", "a", "an", "is", "was", "are", "were", "been", "be",
      "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "shall", "can",
      "to", "for", "of", "in", "on", "at", "by", "with",
      "and", "or", "but", "not", "no", "nor",
      "this", "that", "these", "those", "it", "its",
      "from", "into", "about", "than", "then", "also",
      "just", "more", "some", "such", "only", "very",
      "what", "which", "who", "whom", "how", "when", "where", "why",
      "each", "every", "both", "few", "many", "most", "other",
      "over", "under", "again", "further", "once",
      "here", "there", "all", "any", "same",
      "need", "needs", "needed", "using", "used", "use",
    ]);

    const extractWords = (text: string) =>
      new Set(
        text
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3 && !stopwords.has(w)),
      );

    const updateWords = extractWords(updateEntry.content);

    for (const decision of activeDecisions) {
      const decisionWords = extractWords(decision.content);

      const intersection = [...updateWords].filter((w) => decisionWords.has(w));

      // Require 3+ significant non-stopword overlap to supersede
      if (intersection.length >= 3) {
        await prisma.changelogEntry.update({
          where: { id: decision.id },
          data: { supersededBy: turnNumber },
        });

        console.log(
          `Marked changelog entry ${decision.id} as superseded at turn ${turnNumber}. ` +
            `Overlapping words: ${intersection.join(", ")}`,
        );
      }
    }
  }
}

// ── Save Changelog Entries ────────────────────────────────────
// Extracts, validates, supersedes conflicts, and saves.
// Returns the saved entries.

export async function saveChangelogEntries(
  conversationId: string,
  turnNumber: number,
  userMessage: string,
  assistantResponse: string,
): Promise<StoredChangelogEntry[]> {
  // Step 1: Extract entries from the turn
  const extracted = await extractChangelogEntries(
    turnNumber,
    userMessage,
    assistantResponse,
  );

  if (extracted.length === 0) {
    return [];
  }

  // Step 2: Check for supersessions before saving
  await detectAndMarkSuperseded(conversationId, turnNumber, extracted);

  // Step 3: Save to database
  const saved = await prisma.$transaction(
    extracted.map((entry) =>
      prisma.changelogEntry.create({
        data: {
          conversationId,
          turnNumber,
          category: entry.category,
          content: entry.content,
          supersededBy: null,
        },
      }),
    ),
  );

  console.log(
    `Saved ${saved.length} changelog entries for ` +
      `conversation ${conversationId} turn ${turnNumber}`,
  );

  return saved as unknown as StoredChangelogEntry[];
}

// ── Get Active Changelog ──────────────────────────────────────
// Returns all non-superseded entries for a conversation.
// Used by state doc update and hot path boost.

export async function getActiveChangelog(
  conversationId: string,
): Promise<StoredChangelogEntry[]> {
  const entries = await prisma.changelogEntry.findMany({
    where: {
      conversationId,
      supersededBy: null,
    },
    orderBy: { turnNumber: "asc" },
  });

  return entries as unknown as StoredChangelogEntry[];
}
