"use client";

import React, { useState, useEffect, useRef } from "react";

const turns = [
    { id: "T1", text: "build an e-commerce backend" },
    { id: "T2", text: "use Node + Express" },
    { id: "T3", text: "PostgreSQL for the DB" },
    { id: "T4", text: "add Stripe for payments" },
    { id: "T5", text: "switch to MongoDB, data too flexible" },
    { id: "T6", text: "set up user auth" },
    { id: "T7", text: "use JWT tokens" },
    { id: "T8", text: "add orders collection" },
    { id: "T9", text: "orders endpoint 500 error" },
    { id: "T10", text: "fixed it, missing await" },
    { id: "T11", text: "add product search" },
    { id: "T12", text: "search too slow" },
    { id: "T13", text: "add index on product name" },
    { id: "T14", text: "Stripe fees too high, use PayPal" },
    { id: "T15", text: "PayPal sandbox ready" },
    { id: "T16", text: "add order status tracking" },
    { id: "T17", text: "statuses: pending → shipped → delivered" },
    { id: "T18", text: "search still slow at 100k rows" },
    { id: "T19", text: "add Redis for caching?" },
    { id: "T20", text: "yes, add Redis" },
];

interface StateDoc {
    project: string;
    stack: string[];
    currentTask: string;
    openQuestions: string[];
    resolved: string[];
}

const stateSnapshots: Record<number, StateDoc> = {
    3: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: PostgreSQL"], currentTask: "Setting up database", openQuestions: [], resolved: [] },
    6: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Payments: Stripe"], currentTask: "Setting up user authentication", openQuestions: [], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)"] },
    9: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Auth: JWT", "Payments: Stripe"], currentTask: "Debugging orders endpoint", openQuestions: ["Orders 500 error cause unknown"], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)"] },
    12: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Auth: JWT", "Payments: Stripe"], currentTask: "Optimizing search performance", openQuestions: ["Search too slow on large datasets"], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)", "Fixed orders 500 error at T10 (missing await)"] },
    15: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Auth: JWT", "Payments: PayPal"], currentTask: "PayPal configuration", openQuestions: [], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)", "Fixed orders 500 error at T10 (missing await)", "Added product name index at T13 (search too slow)", "Switched Stripe → PayPal at T14 (too many fees)"] },
    18: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Auth: JWT", "Payments: PayPal"], currentTask: "Search performance issue", openQuestions: ["Search still slow on 100k products despite index"], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)", "Fixed orders 500 error at T10 (missing await)", "Added product name index at T13 (search too slow)", "Switched Stripe → PayPal at T14 (too many fees)"] },
    20: { project: "E-commerce backend", stack: ["Runtime: Node + Express", "DB: MongoDB", "Auth: JWT", "Payments: PayPal", "Cache: Redis (just added)"], currentTask: "Adding Redis for search caching", openQuestions: ["Redis implementation details not decided yet"], resolved: ["Switched PostgreSQL → MongoDB at T5 (flexible data)", "Switched Stripe → PayPal at T14 (too many fees)", "Fixed orders 500 error at T10 (missing await)", "Added product name index at T13 (search too slow)"] },
};

const changelog: Record<number, string> = {
    1: "User wants to build an e-commerce backend",
    2: "Stack decision: Node.js + Express",
    3: "Database chosen: PostgreSQL",
    4: "Integrating Stripe for payments",
    5: "Switched DB → MongoDB (data too flexible for SQL)",
    6: "Setting up user authentication",
    7: "Auth strategy: JWT tokens",
    8: "Added orders collection to MongoDB",
    9: "Bug: /orders endpoint returns 500 error",
    10: "Fixed orders bug — missing await on DB query",
    11: "Adding product search feature",
    12: "Search performance too slow on large datasets",
    13: "Added text index on product name field",
    14: "Switching Stripe → PayPal (fees too high)",
    15: "PayPal sandbox environment ready",
    16: "Adding order status tracking",
    17: "Order statuses: pending → shipped → delivered",
    18: "Search still slow at 100k rows despite index",
    19: "Evaluating Redis for search caching",
    20: "Confirmed: adding Redis cache layer",
};

function StateDocView({ doc, flash }: { doc: StateDoc; flash: boolean }) {
    return (
        <div className={`flex flex-col gap-2 transition-all duration-300 ${flash ? "ring-2 ring-indigo-200 ring-offset-1" : ""}`}>
            <Section heading="Project" items={[doc.project]} />
            <Section heading="Stack" items={doc.stack} />
            <Section heading="Current Task" items={[doc.currentTask]} highlight />
            {doc.openQuestions.length > 0 && (
                <Section heading="Open Questions" items={doc.openQuestions} warn />
            )}
            {doc.resolved.length > 0 && (
                <Section heading="Resolved" items={doc.resolved} />
            )}
        </div>
    );
}

function Section({ heading, items, highlight, warn }: { heading: string; items: string[]; highlight?: boolean; warn?: boolean }) {
    const headingColor = highlight
        ? "text-indigo-600 bg-indigo-50 border-indigo-100"
        : warn
            ? "text-amber-600 bg-amber-50 border-amber-100"
            : "text-gray-500 bg-gray-50 border-gray-200";

    return (
        <div>
            <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border mb-1 ${headingColor}`}>
                {heading}
            </span>
            {items.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 pl-2 py-px">
                    <span className="text-gray-300 mt-1 text-[8px]">•</span>
                    <span className="text-gray-600 text-[13px] leading-relaxed">{item}</span>
                </div>
            ))}
        </div>
    );
}

function ChangelogView({ turnCount, flash }: { turnCount: number; flash: boolean }) {
    const entries = Array.from({ length: turnCount }, (_, i) => ({
        turn: i + 1,
        text: changelog[i + 1],
    })).filter((e) => e.text);

    return (
        <div className="flex flex-col gap-1">
            {entries.map((entry, idx) => (
                <div
                    key={entry.turn}
                    className={`flex items-start gap-2 px-2 py-1 rounded-lg transition-all duration-300 ${idx === entries.length - 1 && flash ? "bg-violet-50 border border-violet-200" : ""
                        }`}
                    style={{ animation: idx === entries.length - 1 && flash ? "fadeSlideIn 0.3s ease-out" : undefined }}
                >
                    <span className="text-[9px] font-mono font-bold text-gray-300 shrink-0 w-6 pt-0.5">T{entry.turn}</span>
                    <span className="text-[12px] text-gray-600 leading-snug">{entry.text}</span>
                </div>
            ))}
        </div>
    );
}

const OurSolutionSlide = () => {
    const [visibleTurn, setVisibleTurn] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [flash, setFlash] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const changelogRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const play = () => {
        if (visibleTurn >= 20) {
            setVisibleTurn(0);
        }
        setIsPlaying(true);
    };

    const pause = () => {
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const reset = () => {
        pause();
        setVisibleTurn(0);
    };

    useEffect(() => {
        if (!isPlaying) return;

        intervalRef.current = setInterval(() => {
            setVisibleTurn((prev) => {
                if (prev >= 20) {
                    setIsPlaying(false);
                    return 20;
                }
                return prev + 1;
            });
        }, 800);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying]);

    useEffect(() => {
        if (visibleTurn > 0) {
            setFlash(true);
            const t = setTimeout(() => setFlash(false), 400);
            return () => clearTimeout(t);
        }
    }, [visibleTurn]);

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
        if (changelogRef.current) {
            changelogRef.current.scrollTop = changelogRef.current.scrollHeight;
        }
    }, [visibleTurn]);

    const currentState = (() => {
        if (visibleTurn <= 0) return null;
        const keys = Object.keys(stateSnapshots).map(Number).sort((a, b) => a - b);
        let best: number | null = null;
        for (const k of keys) {
            if (k <= visibleTurn) best = k;
        }
        return best !== null ? stateSnapshots[best] : null;
    })();

    return (
        <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-2 mb-1">
                <button
                    onClick={isPlaying ? pause : play}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 bg-gray-900 border-gray-900 text-white hover:bg-gray-800"
                >
                    {isPlaying ? "⏸ Pause" : visibleTurn >= 20 ? "↻ Replay" : "▶ Play"}
                </button>
                <button
                    onClick={reset}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200"
                >
                    Reset
                </button>
                <div className="flex items-center gap-2 ml-auto">
                    <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${(visibleTurn / 20) * 100}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                        {visibleTurn}/20
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
                <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <div className="flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium ml-2">conversation.log</span>
                    </div>
                    <div
                        ref={chatRef}
                        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5 max-h-[340px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {turns.slice(0, visibleTurn).map((turn, i) => (
                            <div
                                key={turn.id}
                                className="flex items-start gap-2.5"
                                style={{
                                    animation: i === visibleTurn - 1 ? "fadeSlideIn 0.3s ease-out" : undefined,
                                }}
                            >
                                <span className="text-[11px] font-mono font-bold text-gray-300 shrink-0 w-6 pt-0.5">
                                    {turn.id}
                                </span>
                                <div className="flex items-start gap-1.5">
                                    <span className="text-[13px] font-semibold text-indigo-500 shrink-0">User:</span>
                                    <span className="text-[14px] text-gray-600 leading-snug">
                                        {turn.text}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {visibleTurn === 0 && (
                            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm">
                                Press Play to start the demo
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <div className="flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium ml-2">state_log.md</span>
                        {visibleTurn > 0 && (
                            <span className="ml-auto text-[9px] font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[340px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {currentState ? (
                            <StateDocView doc={currentState} flash={flash && visibleTurn in stateSnapshots} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm h-full min-h-[200px]">
                                Waiting for conversation...
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                        <div className="flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium ml-2">changelog</span>
                        {visibleTurn > 0 && (
                            <span className="ml-auto text-[9px] font-medium text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                                {visibleTurn} entries
                            </span>
                        )}
                    </div>
                    <div
                        ref={changelogRef}
                        className="flex-1 overflow-y-auto px-3 py-3 max-h-[340px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {visibleTurn > 0 ? (
                            <ChangelogView turnCount={visibleTurn} flash={flash} />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm h-full min-h-[200px]">
                                Waiting for conversation...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OurSolutionSlide;
