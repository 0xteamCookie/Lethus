// Handles storing turns in both PostgreSQL and Milvus.
//
// Two storage operations per turn exchange:
//   1. PostgreSQL: stores text content + metadata
//   2. Milvus: stores vector embedding + reference IDs
//
// These two are separate because they serve different purposes:
//   - PostgreSQL: "give me the text of turn 12"
//   - Milvus: "give me all turns similar to this query"
//
// When we retrieve turns, we:
//   1. Search Milvus to get turn numbers
//   2. Fetch text from PostgreSQL by turn number
//
// We store a combined embedding of user+assistant turn.
// Reason: the pair is more semantically meaningful than either alone.
// "What DB to use? PostgreSQL." is more searchable than just
// "What DB to use?" or just "PostgreSQL."

import { prisma } from "../db/prisma";
import { milvus, COLLECTION_NAME } from "../db/milvus";
import { embed } from "./llm";
import { countTokens } from "./tokenizer";
import type { StoredTurn } from "../types";

// ── Ensure Conversation Exists ────────────────────────────────
// Creates the conversation record if it doesn't exist.
// Idempotent — safe to call multiple times.

export async function ensureConversation(
  conversationId: string,
  browserId?: string | null,
): Promise<void> {
  await prisma.conversation.upsert({
    where: { id: conversationId },
    create: { id: conversationId, ...(browserId ? { browserId } : {}) },
    update: browserId ? { browserId } : {},
  });
}

// ── Store a Turn Pair ─────────────────────────────────────────
// Stores both the user message and assistant response for a turn.
// Returns the turn number assigned to this exchange.

export async function storeTurnPair(
  conversationId: string,
  turnNumber: number,
  userMessage: string,
  assistantResponse: string,
): Promise<{ userTurn: StoredTurn; assistantTurn: StoredTurn }> {
  const userTokens = countTokens(userMessage);
  const assistantTokens = countTokens(assistantResponse);

  // Store both turns in a single transaction.
  // If one fails, both fail — we never have half-stored turns.
  const [userTurn, assistantTurn] = await prisma.$transaction([
    prisma.turn.upsert({
      where: {
        conversationId_turnNumber_role: {
          conversationId,
          turnNumber,
          role: "user",
        },
      },
      create: {
        conversationId,
        turnNumber,
        role: "user",
        content: userMessage,
        tokenCount: userTokens,
      },
      update: {}, // Don't overwrite if already stored
    }),
    prisma.turn.upsert({
      where: {
        conversationId_turnNumber_role: {
          conversationId,
          turnNumber,
          role: "assistant",
        },
      },
      create: {
        conversationId,
        turnNumber,
        role: "assistant",
        content: assistantResponse,
        tokenCount: assistantTokens,
      },
      update: {},
    }),
  ]);

  return {
    userTurn: userTurn as unknown as StoredTurn,
    assistantTurn: assistantTurn as unknown as StoredTurn,
  };
}

// ── Store Embeddings ──────────────────────────────────────────
// Generates and stores the embedding for a turn pair.
// We embed the combined "user + assistant" text because:
//   - The combined text captures the full semantic exchange
//   - Searching for "database decision" will match both
//     "what DB?" and "use PostgreSQL" in the same turn
//
// One Milvus entry per turn number (not per role).

export async function storeTurnEmbedding(
  conversationId: string,
  turnNumber: number,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  // Create the combined text for embedding
  // Format: "User: {message}\nAssistant: {response}"
  // Truncate each to 500 chars to stay within embedding token limits
  const combinedText =
    `User: ${userMessage.slice(0, 500)}\n` +
    `Assistant: ${assistantResponse.slice(0, 500)}`;

  const embedding = await embed(combinedText);

  // Milvus insert format: object with field arrays.
  // Note: Milvus SDK for Node uses this array-of-objects format.
  await milvus.insert({
    collection_name: COLLECTION_NAME,
    data: [
      {
        id: `${conversationId}_${turnNumber}`,
        conversation_id: conversationId,
        turn_number: turnNumber,
        role: "combined", // We combined user+assistant
        embedding: embedding,
      },
    ],
  });
}

// ── Get All Turns ─────────────────────────────────────────────
// Returns all turns for a conversation, ordered by turn number.
// Used by the hot path to fetch full turn content after
// Milvus returns which turns are relevant.

export async function getAllTurns(
  conversationId: string,
): Promise<StoredTurn[]> {
  const turns = await prisma.turn.findMany({
    where: { conversationId },
    orderBy: [{ turnNumber: "asc" }, { role: "asc" }],
  });

  return turns as unknown as StoredTurn[];
}

// ── Get Turn Count ────────────────────────────────────────────
// Returns number of complete turn exchanges.
// A "turn exchange" = one user message + one assistant response.
// We divide by 2 because each exchange creates 2 rows.

export async function getTurnCount(conversationId: string): Promise<number> {
  const count = await prisma.turn.count({
    where: { conversationId },
  });
  return Math.floor(count / 2);
}

// ── Get Recent Turns ──────────────────────────────────────────
// Returns the N most recent turn exchanges.
// Used for CONTINUATION intent — no need for full embedding search.

export async function getRecentTurns(
  conversationId: string,
  count: number,
): Promise<StoredTurn[]> {
  // Get the last N turn numbers
  const recentTurnNumbers = await prisma.turn.findMany({
    where: { conversationId, role: "user" },
    orderBy: { turnNumber: "desc" },
    take: count,
    select: { turnNumber: true },
  });

  const turnNumbers = recentTurnNumbers.map((t) => t.turnNumber);

  if (turnNumbers.length === 0) return [];

  const turns = await prisma.turn.findMany({
    where: {
      conversationId,
      turnNumber: { in: turnNumbers },
    },
    orderBy: [{ turnNumber: "asc" }, { role: "asc" }],
  });

  return turns as unknown as StoredTurn[];
}
