"use client";

import { useState } from "react";

interface ChatInputProps {
    onSend?: (message: string) => void;
    disabled?: boolean;
}

const suggestions = [
    { label: "Write code", icon: "code" },
    { label: "Analyze data", icon: "chart" },
    { label: "Summarize", icon: "doc" },
    { label: "Brainstorm", icon: "bulb" },
];

const iconMap: Record<string, React.ReactNode> = {
    code: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    ),
    chart: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    ),
    doc: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
    ),
    bulb: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
        </svg>
    ),
};

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
    const [query, setQuery] = useState("");

    const handleSend = () => {
        const text = query.trim();
        if (!text || disabled) return;
        onSend?.(text);
        setQuery("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestion = (label: string) => {
        if (disabled) return;
        onSend?.(label);
    };

    return (
        <div className="w-full max-w-[640px]">
            <div className="bg-surface-white rounded-2xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.03)] p-4 flex flex-col gap-3 transition-shadow duration-300 focus-within:shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(92,53,230,0.08)]">
                <div className="flex items-center gap-3 w-full">
                    <div className="w-7 h-7 rounded-lg bg-brand-purple-light flex items-center justify-center shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" fill="var(--color-brand-purple)" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        disabled={disabled}
                        className="flex-1 border-none outline-none font-primary text-[14px] font-normal text-text-primary bg-transparent placeholder:text-text-tertiary disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={disabled || !query.trim()}
                        className="w-8 h-8 rounded-lg bg-brand-purple border-none cursor-pointer flex items-center justify-center shrink-0 transition-colors duration-150 hover:bg-brand-purple-hover disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {suggestions.map(({ label, icon }) => (
                        <button
                            key={label}
                            onClick={() => handleSuggestion(label)}
                            disabled={disabled}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-page-bg text-text-secondary font-primary text-[12px] font-medium border border-border-subtle cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-brand-purple-light hover:text-brand-purple hover:border-brand-purple/15"
                        >
                            {iconMap[icon]}
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
