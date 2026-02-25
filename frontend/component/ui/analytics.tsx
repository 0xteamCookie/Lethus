"use client";

import { useConversation } from "@/lib/conversation";
import { useState, useEffect } from "react";
import type { LethusMetadata } from "@/lib/api";

interface Props {
    open: boolean;
    onToggle: () => void;
}

const intentConfig: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
    RECALL: { 
        label: "RECALL", 
        icon: "🔄", 
        color: "text-blue-600", 
        bg: "bg-blue-50", 
        border: "border-blue-200" 
    },
    CONTINUATION: { 
        label: "CONTINUATION", 
        icon: "⏭️", 
        color: "text-green-600", 
        bg: "bg-green-50", 
        border: "border-green-200" 
    },
    NEW_TOPIC: { 
        label: "NEW_TOPIC", 
        icon: "✨", 
        color: "text-purple-600", 
        bg: "bg-purple-50", 
        border: "border-purple-200" 
    },
    CLARIFICATION: { 
        label: "CLARIFICATION", 
        icon: "🔍", 
        color: "text-orange-600", 
        bg: "bg-orange-50", 
        border: "border-orange-200" 
    },
};

export default function AnalyticsSection({ open, onToggle }: Props) {
    const { messages, currentId } = useConversation();
    const [totalStats, setTotalStats] = useState({
        totalOriginalTokens: 0,
        totalRetrievedTokens: 0,
        totalSavedTokens: 0,
        totalReductionPercent: 0,
        totalTurns: 0,
    });

    useEffect(() => {
        const messagesWithMetadata = messages.filter((m) => m.metadata);
        
        if (messagesWithMetadata.length === 0) {
            setTotalStats({
                totalOriginalTokens: 0,
                totalRetrievedTokens: 0,
                totalSavedTokens: 0,
                totalReductionPercent: 0,
                totalTurns: 0,
            });
            return;
        }

        let totalOriginal = 0;
        let totalRetrieved = 0;

        messagesWithMetadata.forEach((msg) => {
            const meta = msg.metadata!;
            totalOriginal += meta.original_tokens || 0;
            totalRetrieved += meta.retrieved_tokens || 0;
        });

        const totalSaved = totalOriginal - totalRetrieved;
        const reductionPercent = totalOriginal > 0 
            ? Math.round((totalSaved / totalOriginal) * 100) 
            : 0;

        setTotalStats({
            totalOriginalTokens: totalOriginal,
            totalRetrievedTokens: totalRetrieved,
            totalSavedTokens: totalSaved,
            totalReductionPercent: reductionPercent,
            totalTurns: messagesWithMetadata.length,
        });
    }, [messages]);

    // Get latest message metadata for per-turn display
    const latestMessage = messages[messages.length - 1];
    const latestMetadata = latestMessage?.metadata;

    return (
        <div className="rounded-xl border border-border overflow-hidden flex-1 flex flex-col">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-none bg-page-bg font-primary text-[13px] font-semibold text-text-primary"
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Analytics
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
            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-[600px]" : "max-h-0"}`}>
                <div className="px-3 pb-3 flex flex-col gap-4 bg-surface-white border-t border-border-subtle overflow-y-auto max-h-[600px]">
                    {!currentId ? (
                        <p className="text-[12px] text-text-tertiary italic py-4 text-center">
                            Select a conversation
                        </p>
                    ) : (
                        <>
                            {/* 1. Token Reduction Tracker - Hero Metric */}
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                                        Token Reduction
                                    </span>
                                    {totalStats.totalReductionPercent > 0 && (
                                        <span className="text-[12px] font-bold text-brand-purple bg-brand-purple-light px-2 py-0.5 rounded">
                                            {totalStats.totalReductionPercent}% Saved
                                        </span>
                                    )}
                                </div>
                                
                                {/* Side-by-side comparison */}
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="text-[10px] text-text-tertiary">Naive Context</div>
                                        <div className="h-8 bg-red-50 border border-red-200 rounded flex items-center justify-center">
                                            <span className="text-[11px] font-semibold text-red-600">
                                                {totalStats.totalOriginalTokens.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[12px] text-text-tertiary">→</div>
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="text-[10px] text-text-tertiary">Lethus Context</div>
                                        <div className="h-8 bg-brand-purple-light border border-brand-purple rounded flex items-center justify-center">
                                            <span className="text-[11px] font-semibold text-brand-purple">
                                                {totalStats.totalRetrievedTokens.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full h-3 bg-page-bg rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-brand-purple transition-all duration-500"
                                        style={{ width: `${totalStats.totalReductionPercent}%` }}
                                    />
                                </div>
                                <div className="text-[10px] text-text-tertiary text-center">
                                    {totalStats.totalSavedTokens.toLocaleString()} tokens saved across {totalStats.totalTurns} turns
                                </div>
                            </div>

                            {/* Latest Turn Details */}
                            {latestMetadata && (
                                <div className="flex flex-col gap-2 pt-1 border-t border-border-subtle">
                                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                                        Latest Turn
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 text-[10px] text-text-tertiary">
                                            Naive: {latestMetadata.original_tokens?.toLocaleString() || "N/A"} tokens
                                        </div>
                                        <div className="flex-1 text-[10px] text-text-tertiary">
                                            Lethus: {latestMetadata.retrieved_tokens?.toLocaleString() || "N/A"} tokens
                                        </div>
                                        {latestMetadata.reduction_percent !== undefined && (
                                            <div className="text-[11px] font-semibold text-brand-purple">
                                                {latestMetadata.reduction_percent}% saved
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 2. Active Memory Spans - Brain Activity Map */}
                            {latestMetadata?.spans_selected && Array.isArray(latestMetadata.spans_selected) && latestMetadata.spans_selected.length > 0 && (
                                <div className="flex flex-col gap-2 pt-1 border-t border-border-subtle">
                                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                                        Active Memory Spans
                                    </span>
                                    <div className="text-[10px] text-text-tertiary mb-1">
                                        Turns highlighted in context for this response:
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {latestMetadata.spans_selected.map((span: { start: number; end: number }, idx: number) => (
                                            <div
                                                key={idx}
                                                className="px-2 py-1 bg-brand-purple-light border border-brand-purple rounded text-[10px] font-mono text-brand-purple"
                                            >
                                                T{span.start}{span.end !== span.start ? `-${span.end}` : ""}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Real-Time Intent Routing */}
                            {latestMetadata?.intent && (
                                <div className="flex flex-col gap-2 pt-1 border-t border-border-subtle">
                                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                                        Intent Classification
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {(() => {
                                            const config = intentConfig[latestMetadata.intent] || {
                                                label: latestMetadata.intent,
                                                icon: "❓",
                                                color: "text-gray-600",
                                                bg: "bg-gray-50",
                                                border: "border-gray-200",
                                            };
                                            return (
                                                <div className={`px-2.5 py-1.5 rounded-lg border ${config.border} ${config.bg} flex items-center gap-1.5`}>
                                                    <span className="text-[14px]">{config.icon}</span>
                                                    <span className={`text-[11px] font-semibold ${config.color}`}>{config.label}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-[10px] text-text-tertiary">
                                        {latestMetadata.intent === "RECALL" && "Searching history for relevant context"}
                                        {latestMetadata.intent === "CONTINUATION" && "Using recent conversation context"}
                                        {latestMetadata.intent === "NEW_TOPIC" && "Starting fresh with minimal context"}
                                        {latestMetadata.intent === "CLARIFICATION" && "Focusing on the last assistant response"}
                                    </div>
                                </div>
                            )}

                            {/* Additional Stats */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-page-bg border border-border-subtle">
                                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Total Turns</span>
                                    <span className="text-[16px] font-semibold text-text-primary">{totalStats.totalTurns}</span>
                                </div>
                                {latestMetadata?.processing_ms !== undefined && (
                                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-page-bg border border-border-subtle">
                                        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Processing</span>
                                        <span className="text-[16px] font-semibold text-text-primary">{latestMetadata.processing_ms}ms</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
