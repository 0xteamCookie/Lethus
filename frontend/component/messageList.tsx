"use client";

import { useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: Message[];
  loading?: boolean;
  sending?: boolean;
}

export default function MessageList({ messages, loading, sending }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 w-full max-w-[720px] overflow-y-auto px-4 py-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed font-primary whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-brand-purple text-white rounded-br-md"
                : "bg-surface-white border border-border text-text-primary rounded-bl-md"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
      {sending && (
        <div className="flex justify-start">
          <div className="bg-surface-white border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
