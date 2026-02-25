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
  metadata?: LethusMetadata | null;
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
  spans_selected: Array<{ start: number; end: number }>;
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

// Streaming chat completions using Server-Sent Events (OpenAI-compatible).
// Calls the same endpoint but with stream: true and parses SSE chunks,
// invoking callbacks as tokens arrive.
export async function sendMessageStream(
  message: string,
  {
    conversationId,
    model = "gpt-4o-mini",
    onToken,
    onDone,
  }: {
    conversationId?: string;
    model?: string;
    onToken?: (token: string) => void;
    onDone?: (info: { conversationId: string }) => void;
  },
): Promise<void> {
  const res = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: headers(conversationId),
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "Failed to send message");
  }

  const resolvedConversationId =
    res.headers.get("X-Lethus-Conversation-Id") ?? conversationId ?? "";

  const body = res.body;
  if (!body) {
    throw new Error("Streaming response body is not available");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);

        if (!rawEvent) continue;

        const lines = rawEvent
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const dataStr = line.slice(5).trim();

          if (dataStr === "[DONE]") {
            onDone?.({ conversationId: resolvedConversationId });
            return;
          }

          try {
            const payload = JSON.parse(dataStr) as {
              choices?: Array<{
                delta?: { content?: string | null };
              }>;
            };

            const delta = payload.choices?.[0]?.delta?.content ?? undefined;
            if (delta && onToken) {
              onToken(delta);
            }
          } catch {
            // ignore malformed data lines
          }
        }
      }
    }
  } finally {
    // Ensure we signal completion even if the stream ends without [DONE]
    onDone?.({ conversationId: resolvedConversationId });
  }
}
