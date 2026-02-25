"use client";

import React, { useState, useEffect, useRef } from "react";

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

const tokensEach = [28, 32, 24, 36, 48, 42, 38, 32, 36, 44];
const cumTokens = tokensEach.reduce<number[]>((a, t) => { a.push((a.at(-1) ?? 0) + t); return a; }, []);
const obsolete = new Set([2, 3]); // T3, T4 become obsolete after MongoDB switch
const ragScores = [0.12, 0.08, 0.72, 0.45, 0.94, 0.81, 0.05, 0.04, 0.11, 0.09];
const ragHits = new Set([2, 4, 5]); // T3, T5, T6

type Mode = "history" | "summary" | "rag";

const modes: { key: Mode; label: string; icon: string }[] = [
    { key: "history", label: "Full History", icon: "📋" },
    { key: "summary", label: "Summarization", icon: "📝" },
    { key: "rag", label: "RAG Retrieval", icon: "🔍" },
];

/* ─── tiny sub-components ─── */

function Msg({ i, isNew, dim, hl, strike, score }: {
    i: number; isNew?: boolean; dim?: boolean; hl?: boolean; strike?: boolean; score?: number;
}) {
    const m = convo[i];
    return (
        <div
            className={`flex items-start gap-2 transition-all duration-300
        ${dim ? "opacity-25" : ""} ${strike ? "line-through opacity-40" : ""}
        ${hl ? "bg-indigo-50 -mx-2 px-2 py-1 rounded-lg border border-indigo-100" : ""}`}
            style={{ animation: isNew ? "fadeSlideIn 0.3s ease-out" : undefined }}
        >
            <span className="text-[10px] font-mono font-bold text-gray-300 shrink-0 w-6 pt-0.5">{m.id}</span>
            <span className={`text-[11px] font-semibold shrink-0 ${m.role === "user" ? "text-indigo-500" : "text-emerald-500"}`}>
                {m.role === "user" ? "User:" : "AI:"}
            </span>
            <span className="text-[12px] text-gray-600 leading-snug flex-1">{m.text}</span>
            {score !== undefined && (
                <span className={`text-[9px] font-mono shrink-0 px-1 py-0.5 rounded ${score >= 0.6 ? "bg-indigo-100 text-indigo-700 font-bold" : "bg-gray-50 text-gray-300"}`}>
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
    const [playing, setPlaying] = useState(false);
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);

    const max = mode === "history" ? 10 : 5;
    const spd = mode === "history" ? 700 : 1100;

    const play = () => { if (step >= max) setStep(0); setPlaying(true); };
    const pause = () => { setPlaying(false); if (timer.current) clearInterval(timer.current); };
    const reset = () => { pause(); setStep(0); };
    const pick = (m: Mode) => { pause(); setMode(m); setStep(0); };

    useEffect(() => {
        if (!playing) return;
        timer.current = setInterval(() => {
            setStep(p => { if (p >= max) { setPlaying(false); return max; } return p + 1; });
        }, spd);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, [playing, max, spd]);

    useEffect(() => {
        leftRef.current?.scrollTo({ top: leftRef.current.scrollHeight, behavior: "smooth" });
        rightRef.current?.scrollTo({ top: rightRef.current.scrollHeight, behavior: "smooth" });
    }, [step]);

    /* token badge color */
    const tc = (n: number) => n > 280 ? "red" : n > 150 ? "amber" : "green";

    /* ── right-panel per mode ── */
    const rightBadge = (): { text: string; color: string } | undefined => {
        if (mode === "history" && step > 0) return { text: `${cumTokens[step - 1]} tokens`, color: tc(cumTokens[step - 1]) };
        if (mode === "summary" && step >= 3) return { text: "~40 tokens · LOSSY", color: "amber" };
        if (mode === "rag" && step >= 4) return { text: "FRAGMENTED", color: "amber" };
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
                    <button onClick={playing ? pause : play}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-gray-900 border-gray-900 text-white hover:bg-gray-800 transition-all duration-200">
                        {playing ? "⏸ Pause" : step >= max ? "↻ Replay" : "▶ Play"}
                    </button>
                    <button onClick={reset}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200">
                        Reset
                    </button>
                    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${(step / max) * 100}%`,
                                background: mode === "history" && step > 0 ? (cumTokens[step - 1] > 280 ? "#ef4444" : cumTokens[step - 1] > 150 ? "#f59e0b" : "#6366f1") : "#6366f1",
                            }} />
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono tabular-nums">{step}/{max}</span>
                </div>
            </div>

            {/* ── panels ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* LEFT — conversation */}
                <PanelShell title="conversation.log" innerRef={leftRef}>
                    {step === 0 && <Empty>Press Play to simulate</Empty>}
                    {mode === "history" && convo.slice(0, step).map((_, i) => (
                        <Msg key={i} i={i} isNew={i === step - 1} strike={step >= 5 && obsolete.has(i)} />
                    ))}
                    {mode === "summary" && step >= 1 && convo.map((_, i) => (
                        <Msg key={i} i={i} dim={step >= 3} />
                    ))}
                    {mode === "rag" && step >= 1 && (
                        <>
                            <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 mb-1">
                                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Query</span>
                                <p className="text-indigo-700 text-[12px] font-medium mt-0.5">Why does the API use MongoDB instead of PostgreSQL?</p>
                            </div>
                            {convo.map((_, i) => (
                                <Msg key={i} i={i}
                                    score={step >= 3 ? ragScores[i] : undefined}
                                    hl={step >= 4 && ragHits.has(i)}
                                    dim={step >= 4 && !ragHits.has(i)}
                                />
                            ))}
                        </>
                    )}
                </PanelShell>

                {/* RIGHT — what the LLM sees */}
                <PanelShell title={mode === "history" ? "sent_to_llm.txt" : mode === "summary" ? "compressed.md" : "retrieved_chunks.txt"}
                    badge={rightBadge()} innerRef={rightRef}>

                    {/* ── FULL HISTORY ── */}
                    {mode === "history" && step === 0 && <Empty>Waiting...</Empty>}
                    {mode === "history" && step > 0 && (
                        <div className="flex flex-col gap-1">
                            <Badge text={`Sending all ${step} messages every request`} warn={step > 6} />
                            {convo.slice(0, step).map((m, i) => (
                                <div key={i} className={`text-[11px] leading-snug py-0.5 pl-2 border-l-2 transition-all duration-300 ${step >= 5 && obsolete.has(i)
                                    ? "border-red-300 text-gray-300 line-through"
                                    : "border-indigo-200 text-gray-600"
                                    }`}
                                    style={{ animation: i === step - 1 ? "fadeSlideIn 0.3s ease-out" : undefined }}>
                                    <span className="font-mono text-gray-300 text-[9px] mr-1">{m.id}</span>
                                    {m.text}
                                    {step >= 5 && obsolete.has(i) && <span className="text-red-400 text-[9px] ml-1">OBSOLETE</span>}
                                </div>
                            ))}
                            {step >= 5 && (
                                <div className="mt-2 text-[10px] text-red-500 bg-red-50 border border-red-100 rounded px-2 py-1.5 font-medium"
                                    style={{ animation: step === 5 ? "fadeSlideIn 0.3s ease-out" : undefined }}>
                                    ⚠ PostgreSQL context is obsolete but still sent — wasting tokens and adding noise
                                </div>
                            )}
                            {/* Token bar */}
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(cumTokens[step - 1] / 400) * 100}%`,
                                            background: cumTokens[step - 1] > 280 ? "#ef4444" : cumTokens[step - 1] > 150 ? "#f59e0b" : "#22c55e",
                                        }} />
                                </div>
                                <span className={`text-[10px] font-mono font-bold tabular-nums ${cumTokens[step - 1] > 280 ? "text-red-500" : cumTokens[step - 1] > 150 ? "text-amber-600" : "text-emerald-500"}`}>
                                    {cumTokens[step - 1]} tok
                                </span>
                            </div>
                        </div>
                    )}

                    {/* ── SUMMARIZATION ── */}
                    {mode === "summary" && step === 0 && <Empty>Waiting...</Empty>}
                    {mode === "summary" && step >= 1 && step < 3 && (
                        <div className="flex flex-col items-center justify-center gap-3 min-h-[120px] text-gray-400">
                            <div className="text-2xl animate-bounce">📝</div>
                            <span className="text-[12px] font-medium">Processing {convo.length} messages...</span>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(d => (
                                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    )}
                    {mode === "summary" && step >= 3 && (
                        <div className="flex flex-col gap-3" style={{ animation: "fadeSlideIn 0.4s ease-out" }}>
                            <div>
                                <Badge text="Compressed summary" />
                                <p className="text-[12px] text-gray-700 leading-relaxed mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                    User is building a Node.js REST API. Using MongoDB with Mongoose for the database. Has products with full-text search. Orders endpoint is working.
                                </p>
                                <div className="text-[10px] text-emerald-500 font-mono mt-1">~40 tokens</div>
                            </div>
                            {step >= 4 && (
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
                            {step >= 5 && (
                                <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 font-medium"
                                    style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                                    ⚠ If the user asks &quot;why did we switch databases?&quot; — the LLM has no answer
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RAG ── */}
                    {mode === "rag" && step === 0 && <Empty>Waiting...</Empty>}
                    {mode === "rag" && step >= 1 && step < 3 && (
                        <div className="flex flex-col items-center justify-center gap-3 min-h-[120px] text-gray-400">
                            <div className="text-2xl animate-bounce">🔍</div>
                            <span className="text-[12px] font-medium">
                                {step === 1 ? "Embedding query..." : "Searching vector DB..."}
                            </span>
                            <div className="flex gap-1">
                                {[0, 1, 2].map(d => (
                                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    )}
                    {mode === "rag" && step >= 3 && (
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
                            {step >= 4 && (
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
                            {step >= 5 && (
                                <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 font-medium"
                                    style={{ animation: "fadeSlideIn 0.3s ease-out" }}>
                                    ⚠ Chunks are disconnected — the reasoning chain from PostgreSQL → MongoDB → Mongoose is broken
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
