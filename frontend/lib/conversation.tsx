// Shared conversation state across components.

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  listConversations,
  getConversationTurns,
  sendMessageStream,
  type ConversationSummary,
  type Turn,
  type LethusMetadata,
} from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: LethusMetadata;
}

interface ConversationContextValue {
  conversations: ConversationSummary[];
  currentId: string | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  refreshConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  send: (text: string) => Promise<string>;
  clearCurrent: () => void;
}

const Ctx = createContext<ConversationContextValue | null>(null);

export function useConversation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConversation must be inside ConversationProvider");
  return ctx;
}

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      /* keep stale list on error */
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    setCurrentId(id);
    try {
      const turns = await getConversationTurns(id);
      setMessages(
        turns
          .filter((t: Turn) => t.role === "user" || t.role === "assistant")
          .map((t: Turn) => ({ 
            role: t.role as "user" | "assistant", 
            content: t.content,
            metadata: t.metadata || undefined,
          })),
      );
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const send = useCallback(
    async (text: string): Promise<string> => {
      setSending(true);
      // Optimistically add user message and an empty assistant message to stream into.
      let assistantIndex = -1;
      setMessages((prev) => {
        const next: Message[] = [...prev, { role: "user" as const, content: text }, { role: "assistant" as const, content: "" }];
        assistantIndex = next.length - 1;
        return next;
      });

      let resolvedConversationId = currentId ?? "";

      try {
        await sendMessageStream(text, {
          conversationId: currentId ?? undefined,
          onToken: (token) => {
            setMessages((prev) => {
              // Fallback to last message if index is not yet set
              const idx =
                assistantIndex >= 0 ? assistantIndex : Math.max(prev.length - 1, 0);
              const next = [...prev];
              const target = next[idx] ?? { role: "assistant", content: "" };
              next[idx] = {
                ...target,
                content: (target.content ?? "") + token,
              };
              return next;
            });
          },
          onDone: ({ conversationId }) => {
            resolvedConversationId = conversationId;
          },
        });

        if (!currentId && resolvedConversationId) {
          setCurrentId(resolvedConversationId);
        }
        // Refresh sidebar
        await refreshConversations();
        return resolvedConversationId;
      } catch (err) {
        // Remove the optimistic user + assistant messages on failure
        setMessages((prev) => prev.slice(0, -2));
        throw err;
      } finally {
        setSending(false);
      }
    },
    [currentId, refreshConversations],
  );

  const clearCurrent = useCallback(() => {
    setCurrentId(null);
    setMessages([]);
  }, []);

  return (
    <Ctx.Provider
      value={{
        conversations,
        currentId,
        messages,
        loading,
        sending,
        refreshConversations,
        loadConversation,
        send,
        clearCurrent,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
