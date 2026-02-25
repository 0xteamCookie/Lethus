"use client";

import { useState } from "react";

const pills = [
    {
        label: "AI Copilot",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
            </svg>
        ),
    },
    {
        label: "Image Generation",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" />
            </svg>
        ),
    },
    {
        label: "Summary",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor" />
            </svg>
        ),
    },
    {
        label: "More",
        icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" />
            </svg>
        ),
    },
];

export default function ChatInput() {
    const [query, setQuery] = useState("");

    return (
        <div className="w-full max-w-[680px] bg-surface-white rounded-[20px] border border-border shadow-[0_4px_24px_rgba(92,53,230,0.06),0_1px_4px_rgba(0,0,0,0.04)] p-5 px-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 w-full">
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="shrink-0"
                >
                    <path
                        d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                        fill="var(--color-brand-purple)"
                    />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Initiate a query or send a command to the AI..."
                    className="flex-1 border-none outline-none font-primary text-[15px] font-normal text-text-primary bg-transparent placeholder:text-text-secondary"
                />
                <button
                    className="w-9 h-9 rounded-[10px] bg-brand-purple border-none cursor-pointer flex items-center justify-center shrink-0 transition-all duration-150 hover:scale-105 hover:shadow-[0_2px_12px_rgba(92,53,230,0.3)]"
                    aria-label="Send message"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white" />
                    </svg>
                </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {pills.map(({ label, icon }) => (
                    <button
                        key={label}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[10px] bg-brand-purple-light text-text-primary font-primary text-[13px] font-medium border-none cursor-pointer whitespace-nowrap transition-all duration-150 hover:bg-[#dde0ff] hover:-translate-y-px"
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
