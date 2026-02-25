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
  sendMessage,
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
          .map((t: Turn) => ({ role: t.role as "user" | "assistant", content: t.content })),
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
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      try {
        const resp = await sendMessage(text, currentId ?? undefined);
        const assistantContent =
          resp.choices[0]?.message?.content ?? "";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantContent,
            metadata: resp.usage.lethus_metadata,
          },
        ]);

        // If this was a new conversation, update currentId
        if (!currentId && resp.conversationId) {
          setCurrentId(resp.conversationId);
        }
        // Refresh sidebar
        refreshConversations();
        return resp.conversationId;
      } catch (err) {
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.slice(0, -1));
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
