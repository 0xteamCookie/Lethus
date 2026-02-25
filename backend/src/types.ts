// ── OpenAI Message Format ────────────────────────────────────
// This is what OpenAI's chat completions API expects.
// It's also what arrives at our proxy in the request body.
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Conversation Turn ────────────────────────────────────────
// How we represent a single turn once it's been stored.
// Matches the Prisma Turn model but as a plain object.
export interface StoredTurn {
  id: string;
  conversationId: string;
  turnNumber: number;
  role: "user" | "assistant";
  content: string;
  tokenCount: number;
  metadata?: RetrievalMetadata | null;
  createdAt: Date;
}

// ── Changelog Entry ──────────────────────────────────────────
// The five categories cover everything that matters in a
// technical or project-focused conversation.
//
// DECISION   — a choice was made ("we'll use PostgreSQL")
// UPDATE     — a decision was changed ("switch to SQLite")
// ISSUE      — a problem was identified ("memory leak in worker")
// RESOLUTION — a problem was solved ("fixed by limiting pool size")
// CONTEXT    — background info that may be needed later
export type ChangelogCategory =
  | "DECISION"
  | "UPDATE"
  | "ISSUE"
  | "RESOLUTION"
  | "CONTEXT";

export interface StoredChangelogEntry {
  id: string;
  conversationId: string;
  turnNumber: number;
  category: ChangelogCategory;
  content: string;
  supersededBy: number | null;
  createdAt: Date;
}

// ── State Document ───────────────────────────────────────────
// The living summary of current conversation state.
export interface StoredStateDoc {
  id: string;
  conversationId: string;
  content: string;
  version: number;
  lastUpdatedAtTurn: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Intent ───────────────────────────────────────────────────
// What kind of query is the user making?
// This determines retrieval strategy in the hot path.
//
// RECALL       — asking about something discussed earlier
//                ("what DB did we decide on?")
// CONTINUATION — continuing recent work, needs last few turns
//                ("okay now add error handling")
// CLARIFICATION — asking for explanation of something just said
//                ("what do you mean by connection pooling?")
// NEW_TOPIC    — starting something unrelated to prior context
//                ("let's talk about auth now")
export type Intent = "RECALL" | "CONTINUATION" | "CLARIFICATION" | "NEW_TOPIC";

// ── Scored Turn ──────────────────────────────────────────────
// A turn with its similarity score, used during retrieval.
export interface ScoredTurn {
  turn: StoredTurn;
  rawScore: number; // Cosine similarity from Milvus (-1 to 1)
  normalizedScore: number; // After z-score normalization (mean=0, std=1)
  boostedScore: number; // After changelog boost applied
  gainScore: number; // (boostedScore - gainShift) for Kadane's
}

// ── Retrieval Result ─────────────────────────────────────────
// What the hot path returns: the context to inject + metadata
// for the observability panel.
export interface RetrievalResult {
  selectedTurns: StoredTurn[];
  tokenCount: number;
  metadata: RetrievalMetadata;
}

export interface RetrievalMetadata {
  intent: Intent;
  totalTurns: number;
  originalTokenCount: number;
  retrievedTokenCount: number;
  reductionPercent: number;
  spansSelected: Array<{ start: number; end: number }>;
  changelogEntriesUsed: number;
  processingMs: number;
}

// ── Proxy Request/Response ───────────────────────────────────
// What arrives at our proxy endpoint.
// Must be a valid OpenAI chat completions request body.
export interface ProxyRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  // Any other OpenAI params — we pass them through untouched
  [key: string]: unknown;
}

// ── Cold Path Context ────────────────────────────────────────
// Everything the cold path writeback needs to do its work.
// Passed as a fire-and-forget job after the response is sent.
export interface WritebackJob {
  conversationId: string;
  turnNumber: number;
  userMessage: string;
  assistantResponse: string;
  userTokens: number;
  assistantTokens: number;
  metadata?: RetrievalMetadata; // Analytics metadata from hot path
}
