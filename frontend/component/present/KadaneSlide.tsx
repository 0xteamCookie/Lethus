"use client";

import React, { useState } from "react";

const entries = [
    { id: "T1", text: "Build a REST API with Node.js" },
    { id: "T2", text: "Setting up Express + TypeScript" },
    { id: "T3", text: "Use PostgreSQL for the database" },
    { id: "T4", text: "Configured PostgreSQL with Prisma" },
    { id: "T5", text: "Switch to MongoDB, data too flexible" },
    { id: "T6", text: "Migrated to MongoDB with Mongoose" },
    { id: "T7", text: "Orders endpoint returns 500 error" },
    { id: "T8", text: "Fixed missing await on DB query" },
    { id: "T9", text: "Add full-text search for products" },
    { id: "T10", text: "Added text index on name field" },
];

const scores = [-0.52, -0.88, 2.30, -1.11, 2.54, 1.35, -1.25, -0.40, -0.64, -1.00];

function runKadane(step: number) {
    let maxSum = -Infinity;
    let maxStart = 0;
    let maxEnd = 0;
    let curSum = 0;
    let curStart = 0;

    for (let i = 0; i < step; i++) {
        curSum += scores[i];
        if (curSum > maxSum) {
            maxSum = curSum;
            maxStart = curStart;
            maxEnd = i;
        }
        if (curSum < 0) {
            curSum = 0;
            curStart = i + 1;
        }
    }

    return {
        curSum: step > 0 ? Math.max(curSum, 0) : 0,
        curStart: step > 0 ? curStart : 0,
        maxSum: step > 0 ? maxSum : 0,
        maxStart,
        maxEnd,
        scanIndex: step - 1,
    };
}

const final = runKadane(10);

const KadaneSlide = () => {
    const [step, setStep] = useState(0);
    const next = () => setStep((s) => Math.min(s + 1, 11));
    const reset = () => setStep(0);

    const scanning = step >= 1 && step <= 10;
    const done = step === 11;

    const k = runKadane(scanning ? step : 10);

    const inBestSpan = (i: number) => i >= final.maxStart && i <= final.maxEnd;

    return (
        <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center gap-2">
                <button
                    onClick={next}
                    disabled={step >= 11}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 bg-gray-900 border-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {step === 0 ? "Start" : step >= 11 ? "Done" : "Next"}
                </button>
                <button
                    onClick={reset}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200"
                >
                    Reset
                </button>
            </div>

            {/* Score blocks row */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-[11px] text-gray-400 font-medium">Boosted Scores</span>
                    {scanning && (
                        <span className="ml-auto text-[9px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 animate-pulse">
                            SCANNING
                        </span>
                    )}
                    {done && (
                        <span className="ml-auto text-[9px] font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                            SPAN FOUND
                        </span>
                    )}
                </div>
                <div className="px-4 py-3">
                    <div className="flex gap-1">
                        {entries.map((entry, i) => {
                            const active = scanning && i <= k.scanIndex;
                            const inCurrent = scanning && i >= k.curStart && i <= k.scanIndex && k.curSum > 0;
                            const isWinner = done && inBestSpan(i);
                            const scanned = scanning && i === k.scanIndex;

                            return (
                                <div
                                    key={entry.id}
                                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-all duration-500 ${isWinner
                                        ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                                        : inCurrent
                                            ? "bg-indigo-50 border-indigo-200"
                                            : scanned
                                                ? "bg-gray-100 border-gray-300"
                                                : active
                                                    ? "bg-gray-50 border-gray-200"
                                                    : step === 0
                                                        ? "bg-white border-gray-100"
                                                        : done && !isWinner
                                                            ? "bg-white border-gray-100 opacity-30"
                                                            : "bg-white border-gray-100"
                                        }`}
                                >
                                    <span className="text-[9px] font-mono text-gray-400">{entry.id}</span>
                                    {/* Score bar — split at center: up = positive, down = negative */}
                                    <div className="w-full h-24 flex flex-col relative">
                                        {/* Top half: positive bars grow upward from center */}
                                        <div className="flex-1 flex items-end justify-center">
                                            {scores[i] >= 0 && (
                                                <div
                                                    className="w-full rounded-t transition-all duration-500"
                                                    style={{
                                                        height: `${(scores[i] / 3) * 100}%`,
                                                        background: isWinner ? "#10b981" : inCurrent ? "#6366f1" : "#d1d5db",
                                                    }}
                                                />
                                            )}
                                        </div>
                                        {/* Center line */}
                                        <div className="w-full h-px bg-gray-300 shrink-0" />
                                        {/* Bottom half: negative bars grow downward from center */}
                                        <div className="flex-1 flex items-start justify-center">
                                            {scores[i] < 0 && (
                                                <div
                                                    className="w-full rounded-b transition-all duration-500"
                                                    style={{
                                                        height: `${(Math.abs(scores[i]) / 3) * 100}%`,
                                                        background: isWinner ? "#10b981" : active ? "#f87171" : "#fca5a5",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold transition-all duration-300 ${scores[i] >= 0 ? "text-emerald-600" : "text-red-400"
                                        }`}>
                                        {scores[i] >= 0 ? "+" : ""}{scores[i].toFixed(1)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Kadane state */}
                    {scanning && (
                        <div
                            className="flex items-center gap-6 mt-3 px-2 py-2 rounded-lg bg-gray-50 border border-gray-200"
                            style={{ animation: "fadeSlideIn 0.2s ease-out" }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-medium">current_sum</span>
                                <span className={`text-[13px] font-mono font-bold ${k.curSum > 0 ? "text-indigo-600" : "text-gray-300"
                                    }`}>
                                    {k.curSum.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-medium">max_sum</span>
                                <span className="text-[13px] font-mono font-bold text-emerald-600">
                                    {k.maxSum.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 font-medium">best span</span>
                                <span className="text-[12px] font-mono font-bold text-emerald-600">
                                    {entries[k.maxStart].id}–{entries[k.maxEnd].id}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Result: selected span */}
            <div className={`rounded-xl border overflow-hidden bg-white transition-all duration-500 flex-1 ${done ? "border-emerald-200" : "border-gray-200"
                }`}>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${done ? "bg-emerald-400" : "bg-gray-300"}`} />
                    <span className="text-[11px] text-gray-400 font-medium">Context sent to LLM</span>
                </div>
                <div className="px-4 py-3 flex flex-col gap-1.5">
                    {step === 0 && (
                        <div className="flex items-center justify-center text-gray-300 text-sm py-8">
                            Press Start
                        </div>
                    )}
                    {scanning && (
                        <div className="flex items-center justify-center text-gray-300 text-sm py-8">
                            Scanning...
                        </div>
                    )}
                    {done && entries.filter((_, i) => inBestSpan(i)).map((entry, idx) => (
                        <div
                            key={entry.id}
                            className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100"
                            style={{ animation: `fadeSlideIn ${0.2 + idx * 0.1}s ease-out` }}
                        >
                            <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0 w-6 pt-0.5">
                                {entry.id}
                            </span>
                            <span className="text-[14px] text-gray-700 leading-snug font-medium">
                                {entry.text}
                            </span>
                        </div>
                    ))}
                    {done && (
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-gray-400">
                            <span>span: {entries[final.maxStart].id}–{entries[final.maxEnd].id}</span>
                            <span>sum: <span className="text-emerald-600 font-bold">{final.maxSum.toFixed(2)}</span></span>
                            <span>{final.maxEnd - final.maxStart + 1} of {entries.length} turns</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KadaneSlide;
