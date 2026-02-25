"use client";

import { useState, useEffect } from "react";
import { getChangelog, type ChangelogEntry } from "@/lib/api";

type ChangeLogTag = "CONTEXT" | "DECISION" | "UPDATE" | "ISSUE" | "RESOLUTION";

const tagConfig: Record<ChangeLogTag, { bg: string; text: string; dot: string; label: string }> = {
    CONTEXT: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", label: "CTX" },
    DECISION: { bg: "bg-brand-purple-light", text: "text-brand-purple", dot: "bg-brand-purple/40", label: "DEC" },
    UPDATE: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "UPD" },
    ISSUE: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "ISS" },
    RESOLUTION: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", label: "RES" },
};

const defaultTag = { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", label: "---" };

interface Props {
    open: boolean;
    onToggle: () => void;
    conversationId: string | null;
}

export default function ChangeLogSection({ open, onToggle, conversationId }: Props) {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);

    useEffect(() => {
        if (!conversationId) {
            setEntries([]);
            return;
        }
        getChangelog(conversationId)
            .then(setEntries)
            .catch(() => setEntries([]));
    }, [conversationId]);

    return (
        <div className="rounded-xl border border-border overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-none bg-page-bg font-primary text-[13px] font-semibold text-text-primary"
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12 8 12 12 14 14" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                    Change Log
                    <span className="inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-surface-white border border-border text-[10px] font-medium text-text-tertiary">
                        {entries.length}
                    </span>
                </div>
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-transform duration-200 text-text-tertiary ${open ? "rotate-180" : ""}`}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-125" : "max-h-0"}`}>
                <div className="overflow-y-auto max-h-110 bg-surface-white border-t border-border-subtle [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-col">
                        {entries.length === 0 ? (
                            <p className="text-[12px] text-text-tertiary italic py-4 text-center">
                                {conversationId ? "No changelog entries yet" : "Select a conversation"}
                            </p>
                        ) : entries.map((entry, i) => {
                            const config = tagConfig[(entry.category ?? "").toUpperCase() as ChangeLogTag] ?? defaultTag;
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-start gap-2.5 px-3.5 py-2 transition-colors duration-100 hover:bg-page-bg ${i !== entries.length - 1 ? "border-b border-border-subtle" : ""}`}
                                >
                                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                        {i !== entries.length - 1 && (
                                            <div className="w-px flex-1 min-h-3 bg-border-subtle" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-semibold text-text-tertiary">
                                                T{entry.turnNumber}
                                            </span>
                                            <span className={`text-[9px] font-semibold px-1.5 py-px rounded ${config.bg} ${config.text}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <span className="text-[12px] text-text-secondary leading-snug">
                                            {entry.content}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
