// API client for Lethus backend communication.
// Manages browser ID persistence and all backend endpoint calls.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("lethus-browser-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lethus-browser-id", id);
  }
  return id;
}

function headers(conversationId?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Lethus-Browser-Id": getBrowserId(),
  };
  if (conversationId) h["X-Lethus-Conversation-Id"] = conversationId;
  return h;
}

// ── Types ──────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
  lastMessage: string | null;
}

export interface Turn {
  id: string;
  conversationId: string;
  turnNumber: number;
  role: "user" | "assistant" | "system";
  content: string;
  tokenCount: number;
  createdAt: string;
}

export interface ChangelogEntry {
  id: string;
  conversationId: string;
  turnNumber: number;
  category: string;
  content: string;
  supersededBy: number | null;
}

export interface StateDoc {
  content: string | null;
  version: number;
}

export interface LethusMetadata {
  original_tokens: number;
  retrieved_tokens: number;
  reduction_percent: number;
  intent: string;
  spans_selected: number;
  changelog_entries_used: number;
  processing_ms: number;
}

export interface ChatResponse {
  id: string;
  choices: { message: { role: string; content: string } }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    lethus_metadata?: LethusMetadata;
  };
  conversationId: string;
}

// ── Endpoints ──────────────────────────────────────────────

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/conversations`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to list conversations");
  return res.json();
}

export async function getConversationTurns(
  conversationId: string,
): Promise<Turn[]> {
  const res = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/turns?limit=200`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error("Failed to fetch turns");
  return res.json();
}

export async function getChangelog(
  conversationId: string,
): Promise<ChangelogEntry[]> {
  const res = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/changelog`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error("Failed to fetch changelog");
  return res.json();
}

export async function getStateDoc(
  conversationId: string,
): Promise<StateDoc> {
  const res = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/state`,
    { headers: headers() },
  );
  if (!res.ok) throw new Error("Failed to fetch state doc");
  return res.json();
}

export async function deleteConversation(
  conversationId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE", headers: headers() },
  );
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function sendMessage(
  message: string,
  conversationId?: string,
  model = "gpt-4o-mini",
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: headers(conversationId),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to send message");
  }

  const data = await res.json();
  return {
    ...data,
    conversationId:
      res.headers.get("X-Lethus-Conversation-Id") ?? conversationId ?? "",
  };
}
