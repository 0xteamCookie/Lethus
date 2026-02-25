"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    <div className="flex-1 w-full max-w-180 overflow-y-auto px-4 py-6 flex flex-col gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed font-primary ${
              msg.role === "user"
                ? "bg-brand-purple text-white rounded-br-md whitespace-pre-wrap"
                : "bg-surface-white border border-border text-text-primary rounded-bl-md"
            }`}
          >
            {msg.role === "user" ? (
              msg.content
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-0.5">{children}</li>,
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <code className="block bg-page-bg rounded-lg px-3 py-2 my-2 text-[13px] font-mono overflow-x-auto whitespace-pre">{children}</code>
                    ) : (
                      <code className="bg-page-bg rounded px-1 py-0.5 text-[13px] font-mono" {...props}>{children}</code>
                    );
                  },
                  pre: ({ children }) => <pre className="my-2">{children}</pre>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-purple underline">{children}</a>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-brand-purple/30 pl-3 my-2 text-text-secondary italic">{children}</blockquote>,
                  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="text-[13px] border-collapse w-full">{children}</table></div>,
                  th: ({ children }) => <th className="border border-border px-2 py-1 bg-page-bg text-left font-semibold">{children}</th>,
                  td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
                  hr: () => <hr className="my-3 border-border" />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
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
