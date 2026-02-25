"use client";

import React, { useState, useEffect, useRef } from "react";

/* Base conversation — always visible in Full History mode */
const convo = [
    { id: "T1", role: "user", text: "Build a REST API with Node.js and Express" },
    { id: "T2", role: "ai", text: "Setting up Express + TypeScript project..." },
    { id: "T3", role: "user", text: "Use PostgreSQL for the database" },
    { id: "T4", role: "ai", text: "Configured PostgreSQL with Prisma ORM" },
    { id: "T5", role: "user", text: "Switch to MongoDB — data too flexible for SQL" },
    { id: "T6", role: "ai", text: "Migrated to MongoDB with Mongoose" },
    { id: "T7", role: "user", text: "/orders endpoint returns a 500 error" },
    { id: "T8", role: "ai", text: "Fixed — missing await on DB query" },
    { id: "T9", role: "user", text: "Add full-text search for products" },
    { id: "T10", role: "ai", text: "Added text index on name + description" },
];

/* New requests that arrive on Play — each triggers resending the ENTIRE history */
const newRequests = [
    { id: "T11", role: "user", text: "Add user authentication with JWT" },
    { id: "T12", role: "ai", text: "Added JWT auth middleware and login route" },

];

const baseTokens = 360; // tokens for T1-T10
const newTokensEach = [38, 36, 34, 40, 42]; // tokens per new message
/* Cumulative tokens: base conversation + all new messages up to step */
const historyTokens = newTokensEach.reduce<number[]>((a, t) => {
    a.push((a.at(-1) ?? baseTokens) + t);
    return a;
}, []);
// e.g. step 1 → 360+38=398, step 2 → 434, ..., step 5 → 550

const ragScores = [0.12, 0.08, 0.72, 0.45, 0.94, 0.81, 0.05, 0.04, 0.11, 0.09];

type Mode = "history" | "summary" | "rag";

const modes: { key: Mode; label: string; icon: string }[] = [
    { key: "history", label: "Full History", icon: "📋" },
    { key: "summary", label: "Summarization", icon: "📝" },
    { key: "rag", label: "RAG Retrieval", icon: "🔍" },
];

/* ─── tiny sub-components ─── */

function Msg({ i, score }: { i: number; score?: number }) {
    const m = convo[i];
    const isUser = m.role === "user";
    return (
        <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${isUser ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                }`}>
                {isUser ? "U" : "✦"}
            </div>
            {/* Bubble */}
            <div className={`flex flex-col gap-0.5 min-w-0 ${isUser ? "items-end" : "items-start"}`} style={{ maxWidth: "85%" }}>
                <span className={`text-[11px] font-semibold ${isUser ? "text-indigo-500" : "text-emerald-500"}`}>
                    {isUser ? "You" : "Assistant"}
                </span>
                <div className={`text-[13px] leading-relaxed px-3 py-2 rounded-xl ${isUser
                    ? "bg-indigo-50 text-gray-700 rounded-tr-sm"
                    : "bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100"
                    }`}>
                    {m.text}
                </div>
            </div>
            {score !== undefined && (
                <span className={`text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded self-center ${score >= 0.6 ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-gray-50 text-gray-300"
                    }`}>
                    {score.toFixed(2)}
                </span>
            )}
        </div>
    );
}

function PanelShell({ title, badge, children, innerRef }: {
    title: string; badge?: { text: string; color: string }; children: React.ReactNode; innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
    const badgeColor: Record<string, string> = {
        green: "text-emerald-500 bg-emerald-50 border-emerald-100",
        amber: "text-amber-600 bg-amber-50 border-amber-100",
        red: "text-red-500 bg-red-50 border-red-100",
        gray: "text-gray-400 bg-gray-50 border-gray-200",
    };
    return (
        <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                </div>
                <span className="text-[11px] text-gray-400 font-medium ml-2">{title}</span>
                {badge && (
                    <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded border ${badgeColor[badge.color] ?? badgeColor.gray}`}>
                        {badge.text}
                    </span>
                )}
            </div>
            <div
                ref={innerRef}
                className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1.5 max-h-[320px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
                {children}
            </div>
        </div>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <div className="flex-1 flex items-center justify-center text-gray-300 text-sm min-h-[120px]">{children}</div>;
}

function Badge({ text, warn }: { text: string; warn?: boolean }) {
    return (
        <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border mb-1 ${warn ? "text-red-500 bg-red-50 border-red-100" : "text-gray-400 bg-gray-50 border-gray-200"
            }`}>
            {text}
        </span>
    );
}

/* ─── main component ─── */

const ProblemSlide = () => {
    const [mode, setMode] = useState<Mode>("history");
    const [step, setStep] = useState(0);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);

    const max = mode === "history" ? newRequests.length : 3;

    const next = () => { if (step < max) setStep(s => s + 1); };
    const reset = () => { setStep(0); };
    const pick = (m: Mode) => { setMode(m); setStep(0); };

    useEffect(() => {
        leftRef.current?.scrollTo({ top: leftRef.current.scrollHeight, behavior: "smooth" });
        rightRef.current?.scrollTo({ top: rightRef.current.scrollHeight, behavior: "smooth" });
    }, [step]);

    /* token badge color */
    const tc = (n: number) => n > 480 ? "red" : n > 400 ? "amber" : "green";

    /* ── right-panel per mode ── */
    const rightBadge = (): { text: string; color: string } | undefined => {
        if (mode === "history" && step > 0) return { text: `${historyTokens[step - 1]} tokens`, color: tc(historyTokens[step - 1]) };
        if (mode === "summary" && step >= 1) return { text: "~40 tokens · LOSSY", color: "amber" };
        if (mode === "rag" && step >= 1) return { text: "FRAGMENTED", color: "amber" };
        return undefined;
    };

    return (
        <div className="flex flex-col gap-3 flex-1">
            {/* ── controls ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {modes.map(m => (
                    <button key={m.key} onClick={() => pick(m.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 ${mode === m.key ? "bg-gray-900 border-gray-900 text-white" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}>{m.icon} {m.label}</button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={step >= max ? reset : next}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-gray-900 border-gray-900 text-white hover:bg-gray-800 transition-all duration-200">
                        {step >= max ? "↻ Reset" : "Next Step →"}
                    </button>
                    <button onClick={reset}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200">
                        Reset
                    </button>
                    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300 bg-indigo-500"
                            style={{ width: `${(step / max) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono tabular-nums">{step}/{max}</span>
                </div>
            </div>

            {/* ── panels ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 flex-1 min-h-0">
                {/* LEFT — conversation */}
                <PanelShell title="conversation.log" innerRef={leftRef}>
                    {/* Base conversation — always visible in all modes */}
                    {convo.map((_, i) => (
                        <Msg key={i} i={i} score={mode === "rag" && step >= 2 ? ragScores[i] : undefined} />
                    ))}
                    {/* History: play hint + new messages */}
                    {mode === "history" && step === 0 && (
                        <div className="text-center text-gray-300 text-[11px] mt-2 py-2 border-t border-dashed border-gray-200">
                            Press Next Step — new requests will resend this entire history
                        </div>
                    )}
                    {mode === "history" && step > 0 && (
                        <div className="border-t border-dashed border-gray-200 mt-2 pt-2">
                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">New requests</span>
                        </div>
                    )}
                    {mode === "history" && newRequests.slice(0, step).map((m, i) => {
                        const isUser = m.role === "user";
                        return (
                            <div key={`new-${i}`} className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                                style={{ animation: i === step - 1 ? "fadeSlideIn 0.3s ease-out" : undefined }}>
                                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${isUser ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
                                    }`}>
                                    {isUser ? "U" : "✦"}
                                </div>
                                <div className={`flex flex-col gap-0.5 min-w-0 ${isUser ? "items-end" : "items-start"}`} style={{ maxWidth: "85%" }}>
                                    <span className={`text-[11px] font-semibold ${isUser ? "text-indigo-500" : "text-emerald-500"}`}>
                                        {isUser ? "You" : "Assistant"}
                                    </span>
                                    <div className={`text-[13px] leading-relaxed px-3 py-2 rounded-xl ${isUser
                                        ? "bg-indigo-50 text-gray-700 rounded-tr-sm"
                                        : "bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100"
                                        }`}>
                                        {m.text}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {/* Summary / RAG: new user message appears on step 1 */}
                    {(mode === "summary" || mode === "rag") && step >= 1 && (
                        <div className="flex gap-2.5 flex-row-reverse mt-2" style={{ animation: step === 1 ? "fadeSlideIn 0.3s ease-out" : undefined }}>
                            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 bg-indigo-100 text-indigo-600">U</div>
                            <div className="flex flex-col gap-0.5 min-w-0 items-end" style={{ maxWidth: "85%" }}>
                                <span className="text-[11px] font-semibold text-indigo-500">You</span>
                                <div className="text-[13px] leading-relaxed px-3 py-2 rounded-xl bg-indigo-50 text-gray-700 rounded-tr-sm">
                                    Why did we switch from PostgreSQL to MongoDB?
                                </div>
                            </div>
                        </div>
                    )}
                </PanelShell>

                {/* RIGHT — what the LLM sees */}
                <PanelShell title={mode === "history" ? "sent_to_llm.txt" : mode === "summary" ? "compressed.md" : "retrieved_chunks.txt"}
                    badge={rightBadge()} innerRef={rightRef}>

                    {/* ── FULL HISTORY ── */}
                    {mode === "history" && step === 0 && <Empty>Waiting for a new request...</Empty>}
                    {mode === "history" && step > 0 && (
                        <div className="flex flex-col gap-1">
                            {/* All base messages resent */}
                            {convo.map((m, i) => (
                                <div key={i} className="text-[12px] leading-snug py-0.5 pl-2 border-l-2 border-gray-200 text-gray-400">
                                    <span className="font-mono text-gray-300 text-[9px] mr-1">{m.id}</span>
                                    {m.text}
                                </div>
                            ))}
                            {/* New messages also sent */}
                            {newRequests.slice(0, step).map((m, i) => (
                                <div key={`nr-${i}`}
                                    className="text-[12px] leading-snug py-0.5 pl-2 border-l-2 border-indigo-200 text-gray-600"
                                    style={{ animation: i === step - 1 ? "fadeSlideIn 0.3s ease-out" : undefined }}>
                                    <span className="font-mono text-indigo-400 text-[9px] mr-1">{m.id}</span>
                                    {m.text}
                                    {i === step - 1 && <span className="text-indigo-500 text-[9px] ml-1">NEW</span>}
                                </div>
                            ))}
                            {/* Token bar */}
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(historyTokens[step - 1] / 600) * 100}%`,
                                            background: step >= max ? "#ef4444" : "#6366f1",
                                        }} />
                                </div>
                                <span className={`text-[10px] font-mono font-bold tabular-nums ${step >= max ? "text-red-500" : "text-indigo-500"}`}>
                                    {historyTokens[step - 1]} tok
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── SUMMARIZATION ── */}
                    {mode === "summary" && step === 0 && <Empty>Press Next Step...</Empty>}
                    {mode === "summary" && step >= 1 && (
                        <div className="flex flex-col gap-3" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
                            <div>
                                <Badge text="Compressed summary" />
                                <p className="text-[12px] text-gray-700 leading-relaxed mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                    User is building a Node.js REST API. Using MongoDB with Mongoose for the database. Has products with full-text search. Orders endpoint is working.
                                </p>
                                <div className="text-[10px] text-emerald-500 font-mono mt-1">~40 tokens</div>
                            </div>
                            {step >= 2 && (
                                <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                                    <Badge text="Details permanently lost" warn />
                                    <div className="flex flex-col gap-1.5 mt-1">
                                        {[
                                            "PostgreSQL → MongoDB switch reason (flexible schema)",
                                            "The 500 error was a missing await on DB query",
                                            "Prisma was replaced by Mongoose during migration",
                                            "TypeScript configuration decisions",
                                        ].map((d, i) => (
                                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-400 pl-2 border-l-2 border-red-200">
                                                <span className="shrink-0">✕</span>
                                                <span className="line-through">{d}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {step >= 3 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2" style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">LLM Response</span>
                                    <p className="text-[12px] text-gray-600 leading-relaxed mt-1 italic">
                                        &quot;The project uses MongoDB for the database.&quot; — No reasoning or context about the switch available.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RAG ── */}
                    {mode === "rag" && step === 0 && <Empty>Press Next Step...</Empty>}
                    {mode === "rag" && step >= 1 && (
                        <div className="flex flex-col gap-3" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
                            <div>
                                <Badge text="Top-3 retrieved chunks" />
                                <div className="flex flex-col gap-1.5 mt-1">
                                    {[2, 4, 5].map(idx => (
                                        <div key={idx} className="text-[11px] text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-mono text-indigo-400 text-[9px] font-bold">{convo[idx].id}</span>
                                                <span className="text-[9px] font-mono text-indigo-500">{ragScores[idx].toFixed(2)}</span>
                                            </div>
                                            <span>{convo[idx].text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {step >= 2 && (
                                <div style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                                    <Badge text="Missing context" warn />
                                    <div className="flex flex-col gap-1.5 mt-1">
                                        {[
                                            { id: "T4", text: "Prisma ORM → Mongoose migration details" },
                                            { id: "T7-T8", text: "Related 500 error fix (missing await on DB)" },
                                            { id: "T1-T2", text: "Project setup context (Node + Express + TS)" },
                                        ].map((d, i) => (
                                            <div key={i} className="flex items-start gap-2 text-[11px] text-red-400 pl-2 border-l-2 border-red-200">
                                                <span className="font-mono text-[9px] shrink-0">{d.id}</span>
                                                <span>{d.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </PanelShell>
            </div>
        </div>
    );
};

export default ProblemSlide;
