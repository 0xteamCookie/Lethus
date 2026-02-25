"use client";

import React, { useState, useEffect, useRef } from "react";

type Intent = "RECALL" | "CONTINUATION" | "CLARIFICATION" | "NEW_TOPIC";

interface Message {
    role: "user" | "assistant";
    text: string;
    intent?: Intent;
    reasoning?: string;
}

const conversation: Message[] = [
    { role: "user", text: "I want to plan a trip to Japan", intent: "NEW_TOPIC", reasoning: "Starting a brand new topic" },
    { role: "assistant", text: "Great choice! When are you thinking of going? Spring for cherry blossoms is popular." },
    { role: "user", text: "April sounds good, maybe 10 days", intent: "CONTINUATION", reasoning: "Continuing the current thread" },
    { role: "assistant", text: "Perfect. For 10 days I'd suggest Tokyo (4 days), Kyoto (3 days), and Osaka (3 days)." },
    { role: "user", text: "Why those three cities specifically?", intent: "CLARIFICATION", reasoning: "Asking about the last response" },
    { role: "assistant", text: "Tokyo for modern culture, Kyoto for temples and history, Osaka for street food. They're connected by bullet train." },
    { role: "user", text: "What budget did we settle on earlier?", intent: "RECALL", reasoning: "Searching past conversation history" },
    { role: "assistant", text: "You mentioned around $3000 total back when we first discussed it." },
    { role: "user", text: "Okay add Hiroshima too", intent: "CONTINUATION", reasoning: "Building on the itinerary" },
    { role: "assistant", text: "Done. I'd take one day from Osaka for a Hiroshima day trip via bullet train." },
    { role: "user", text: "Can you explain the rail pass thing again?", intent: "CLARIFICATION", reasoning: "Asking about a previous explanation" },
    { role: "assistant", text: "A 14-day Japan Rail Pass costs around $380 and gives unlimited bullet train rides. Saves money vs individual tickets." },
    { role: "user", text: "Actually lets also plan food recommendations", intent: "NEW_TOPIC", reasoning: "Switching to a new subject" },
    { role: "assistant", text: "Sure! Each city has specialties. Want me to go city by city?" },
    { role: "user", text: "Yeah go ahead", intent: "CONTINUATION", reasoning: "Continuing the food topic" },
    { role: "assistant", text: "Tokyo: sushi at Tsukiji, ramen in Shinjuku. Kyoto: matcha desserts, kaiseki dinner. Osaka: takoyaki, okonomiyaki." },
];

const intentConfig: Record<Intent, { color: string; bg: string; border: string; strategy: string }> = {
    RECALL: {
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        strategy: "Search full history",
    },
    CONTINUATION: {
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        strategy: "Use last 2-3 turns",
    },
    CLARIFICATION: {
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        strategy: "Use last response only",
    },
    NEW_TOPIC: {
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
        strategy: "State doc only",
    },
};

const allIntents: Intent[] = ["RECALL", "CONTINUATION", "CLARIFICATION", "NEW_TOPIC"];

function ContextBar({ intent }: { intent: Intent | null }) {
    const blocks = [
        { label: "State Doc", always: true },
        { label: "Full History", for: ["RECALL"] as Intent[] },
        { label: "Last N Turns", for: ["CONTINUATION"] as Intent[] },
        { label: "Last Response", for: ["CLARIFICATION"] as Intent[] },
    ];

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {blocks.map((block) => {
                const active = intent && (block.always || block.for?.includes(intent));
                return (
                    <div
                        key={block.label}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border transition-all duration-300 ${active
                                ? "bg-gray-900 border-gray-900 text-white"
                                : "bg-white border-gray-200 text-gray-300"
                            }`}
                    >
                        {block.label}
                    </div>
                );
            })}
        </div>
    );
}

const IntentSlide = () => {
    const [visibleCount, setVisibleCount] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [classifyingIdx, setClassifyingIdx] = useState<number | null>(null);
    const [classifiedIdx, setClassifiedIdx] = useState<number | null>(null);
    const chatRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clear = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const play = () => {
        if (visibleCount >= conversation.length) {
            setVisibleCount(0);
            setClassifyingIdx(null);
            setClassifiedIdx(null);
        }
        setIsPlaying(true);
    };

    const reset = () => {
        clear();
        setIsPlaying(false);
        setVisibleCount(0);
        setClassifyingIdx(null);
        setClassifiedIdx(null);
    };

    useEffect(() => {
        if (!isPlaying) return;

        intervalRef.current = setInterval(() => {
            setVisibleCount((prev) => {
                const next = prev + 1;
                if (next > conversation.length) {
                    setIsPlaying(false);
                    return conversation.length;
                }

                const msg = conversation[next - 1];
                if (msg.intent) {
                    setClassifyingIdx(next - 1);
                    setTimeout(() => {
                        setClassifyingIdx(null);
                        setClassifiedIdx(next - 1);
                    }, 600);
                }

                return next;
            });
        }, 1200);

        return () => clear();
    }, [isPlaying]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [visibleCount]);

    const lastUserIntent = (() => {
        const idx = classifiedIdx ?? classifyingIdx;
        if (idx !== null) {
            const msg = conversation[idx];
            if (msg.intent) return { intent: msg.intent, reasoning: msg.reasoning || "", classifying: classifyingIdx === idx };
        }
        for (let i = visibleCount - 1; i >= 0; i--) {
            if (conversation[i].intent) {
                return { intent: conversation[i].intent!, reasoning: conversation[i].reasoning || "", classifying: false };
            }
        }
        return null;
    })();

    return (
        <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
                <button
                    onClick={isPlaying ? () => { clear(); setIsPlaying(false); } : play}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 bg-gray-900 border-gray-900 text-white hover:bg-gray-800"
                >
                    {isPlaying ? "Pause" : visibleCount >= conversation.length ? "Replay" : "Play"}
                </button>
                <button
                    onClick={reset}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200"
                >
                    Reset
                </button>
                <div className="flex items-center gap-2 ml-auto">
                    <div className="h-1 w-28 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gray-900 rounded-full transition-all duration-300"
                            style={{ width: `${(visibleCount / conversation.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                        {visibleCount}/{conversation.length}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
                <div className="lg:col-span-3 flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400 font-medium">Conversation</span>
                    </div>
                    <div
                        ref={chatRef}
                        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 max-h-[310px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {conversation.slice(0, visibleCount).map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-2 items-start ${msg.role === "assistant" ? "" : ""}`}
                                style={{ animation: i === visibleCount - 1 ? "fadeSlideIn 0.25s ease-out" : undefined }}
                            >
                                <span className={`text-[10px] font-semibold shrink-0 w-12 pt-0.5 ${msg.role === "user" ? "text-indigo-500" : "text-gray-400"
                                    }`}>
                                    {msg.role === "user" ? "User" : "LLM"}
                                </span>
                                <span className={`text-[12px] leading-relaxed ${msg.role === "user" ? "text-gray-800" : "text-gray-500"
                                    }`}>
                                    {msg.text}
                                </span>
                                {msg.intent && i < visibleCount && (classifiedIdx === i || (classifiedIdx !== null && classifiedIdx >= i) || (!isPlaying && visibleCount > i)) && (
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-auto ${intentConfig[msg.intent].bg
                                        } ${intentConfig[msg.intent].color} ${intentConfig[msg.intent].border} border`}>
                                        {msg.intent}
                                    </span>
                                )}
                            </div>
                        ))}
                        {visibleCount === 0 && (
                            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm h-full min-h-[200px]">
                                Press Play to start
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400 font-medium">Intent Classifier</span>
                    </div>

                    <div className="flex-1 flex flex-col px-4 py-3 gap-3">
                        <div className="flex gap-1.5 flex-wrap">
                            {allIntents.map((intent) => {
                                const config = intentConfig[intent];
                                const isMatch = lastUserIntent && !lastUserIntent.classifying && lastUserIntent.intent === intent;
                                const isPulsing = lastUserIntent?.classifying;
                                return (
                                    <div
                                        key={intent}
                                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all duration-300 ${isMatch
                                                ? `${config.bg} ${config.border} ${config.color}`
                                                : isPulsing
                                                    ? "bg-gray-50 border-gray-200 text-gray-400 animate-pulse"
                                                    : "bg-white border-gray-100 text-gray-300"
                                            }`}
                                    >
                                        {intent}
                                    </div>
                                );
                            })}
                        </div>

                        {lastUserIntent && !lastUserIntent.classifying && (
                            <div
                                className={`rounded-lg border p-3 flex flex-col gap-1.5 ${intentConfig[lastUserIntent.intent].bg
                                    } ${intentConfig[lastUserIntent.intent].border}`}
                                style={{ animation: "fadeSlideIn 0.25s ease-out" }}
                            >
                                <span className={`text-[12px] font-bold ${intentConfig[lastUserIntent.intent].color}`}>
                                    {lastUserIntent.intent}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                    {lastUserIntent.reasoning}
                                </span>
                                <span className="text-[11px] text-gray-600 font-medium">
                                    {intentConfig[lastUserIntent.intent].strategy}
                                </span>
                            </div>
                        )}

                        {lastUserIntent?.classifying && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-center">
                                <span className="text-[11px] text-gray-400 animate-pulse">Classifying...</span>
                            </div>
                        )}

                        <div className="mt-auto">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                                Sent to LLM
                            </p>
                            <ContextBar intent={lastUserIntent && !lastUserIntent.classifying ? lastUserIntent.intent : null} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntentSlide;
