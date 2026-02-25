"use client";

import React, { useState } from "react";

interface Entry {
    id: string;
    text: string;
    rawScore: number;
    relevant: boolean;
    hint?: boolean;
    neighbour?: boolean;
}

const query = "What database are we using and why?";

const entries: Entry[] = [
    { id: "T1", text: "Build a REST API with Node.js", rawScore: 0.61, relevant: false },
    { id: "T2", text: "Setting up Express + TypeScript", rawScore: 0.58, relevant: false },
    { id: "T3", text: "Use PostgreSQL for the database", rawScore: 0.76, relevant: true, hint: true },
    { id: "T4", text: "Configured PostgreSQL with Prisma", rawScore: 0.72, relevant: true, neighbour: true },
    { id: "T5", text: "Switch to MongoDB, data too flexible", rawScore: 0.78, relevant: true, hint: true },
    { id: "T6", text: "Migrated to MongoDB with Mongoose", rawScore: 0.74, relevant: true, neighbour: true },
    { id: "T7", text: "Orders endpoint returns 500 error", rawScore: 0.55, relevant: false },
    { id: "T8", text: "Fixed missing await on DB query", rawScore: 0.62, relevant: false },
    { id: "T9", text: "Add full-text search for products", rawScore: 0.60, relevant: false },
    { id: "T10", text: "Added text index on name field", rawScore: 0.57, relevant: false },
];

const mean = entries.reduce((s, e) => s + e.rawScore, 0) / entries.length;
const stdDev = Math.sqrt(entries.reduce((s, e) => s + (e.rawScore - mean) ** 2, 0) / entries.length);
const zScores = entries.map((e) => (e.rawScore - mean) / stdDev);

const boosts = entries.map((e) => (e.hint ? 1.0 : e.neighbour ? 0.3 : 0));
const boostedScores = zScores.map((z, i) => z + boosts[i]);

const steps = [
    "Show raw cosine similarity scores",
    "Compute mean and standard deviation",
    "Apply Z-normalization",
    "Changelog hint boost (+1.0 direct, +0.3 neighbour)",
    "Filter: discard negative scores",
];

function Bar({ value, maxAbs, color }: { value: number; maxAbs: number; color: string }) {
    const pct = Math.abs(value) / maxAbs * 100;
    const isNeg = value < 0;

    return (
        <div className="flex items-center h-6 w-full relative">
            <div className="absolute left-1/2 w-px h-full bg-gray-200 z-0" />
            {isNeg ? (
                <div className="flex w-1/2 justify-end pr-px">
                    <div
                        className="h-5 rounded-l transition-all duration-700"
                        style={{
                            width: `${pct}%`,
                            background: color,
                            transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                    />
                </div>
            ) : (
                <>
                    <div className="w-1/2" />
                    <div className="flex w-1/2 pl-px">
                        <div
                            className="h-5 rounded-r transition-all duration-700"
                            style={{
                                width: `${pct}%`,
                                background: color,
                                transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

const ZNormSlide = () => {
    const [step, setStep] = useState(0);

    const next = () => setStep((s) => Math.min(s + 1, 5));
    const reset = () => setStep(0);

    const maxRaw = Math.max(...entries.map((e) => e.rawScore));
    const maxZ = Math.max(...zScores.map((z) => Math.abs(z)));
    const maxBoosted = Math.max(...boostedScores.map((b) => Math.abs(b)));

    const showRaw = step >= 1;
    const showCompute = step >= 2;
    const showNorm = step >= 3;
    const showBoost = step >= 4;
    const showFilter = step >= 5;

    const getDisplayValue = (i: number) => {
        if (showBoost) return boostedScores[i];
        if (showNorm) return zScores[i];
        return entries[i].rawScore;
    };

    const getMaxAbs = () => {
        if (showBoost) return maxBoosted;
        if (showNorm) return maxZ;
        return maxRaw;
    };

    const getBarColor = (i: number) => {
        if (showBoost || showNorm) {
            const val = showBoost ? boostedScores[i] : zScores[i];
            return val >= 0 ? "#10b981" : "#f87171";
        }
        return entries[i].rawScore >= 0.75 ? "#6366f1" : "#d1d5db";
    };

    const getScoreColor = (i: number) => {
        if (showBoost || showNorm) {
            const val = showBoost ? boostedScores[i] : zScores[i];
            return val >= 0 ? "text-emerald-600 font-bold" : "text-red-400";
        }
        return "text-gray-500";
    };

    const formatScore = (i: number) => {
        const val = getDisplayValue(i);
        if (showBoost || showNorm) return (val >= 0 ? "+" : "") + val.toFixed(2);
        return val.toFixed(2);
    };

    const isDiscarded = (i: number) => showFilter && boostedScores[i] < 0;

    return (
        <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
                <button
                    onClick={next}
                    disabled={step >= 5}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all duration-200 bg-gray-900 border-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {step === 0 ? "Start" : step >= 5 ? "Done" : "Next Step"}
                </button>
                <button
                    onClick={reset}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 cursor-pointer hover:bg-gray-50 transition-all duration-200"
                >
                    Reset
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                    {steps.map((label, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i < step ? "w-6 bg-gray-900" : i === step ? "w-6 bg-gray-300" : "w-3 bg-gray-200"
                                }`}
                            title={label}
                        />
                    ))}
                </div>
            </div>

            {step > 0 && (
                <div className="text-[11px] text-gray-400 font-medium px-1">
                    Step {step}: {steps[step - 1]}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
                <div className="lg:col-span-2 flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400 font-medium">Changelog Entries</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 max-h-[400px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-2 mb-1">
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Query</span>
                            <p className="text-indigo-700 text-[13px] font-medium mt-0.5">{query}</p>
                        </div>
                        {entries.map((entry, i) => (
                            <div
                                key={entry.id}
                                className={`flex items-start gap-2 px-2 py-1.5 rounded-lg transition-all duration-500 ${isDiscarded(i) ? "opacity-25 line-through" : ""
                                    } ${showBoost && entry.hint ? "bg-violet-50 border border-violet-200" : ""
                                    } ${showBoost && entry.neighbour ? "bg-violet-50/50 border border-violet-100" : ""
                                    } ${showFilter && !isDiscarded(i) ? "bg-emerald-50 border border-emerald-100" : ""}`}
                            >
                                <span className="text-[10px] font-mono font-bold text-gray-300 shrink-0 w-6 pt-0.5">
                                    {entry.id}
                                </span>
                                <span className={`text-[13px] leading-snug flex-1 ${showFilter && !isDiscarded(i) ? "text-gray-800 font-medium" : "text-gray-600"
                                    }`}>
                                    {entry.text}
                                </span>
                                {showBoost && (entry.hint || entry.neighbour) && !showFilter && (
                                    <span className="text-[9px] font-mono shrink-0 px-1 py-0.5 rounded bg-violet-100 text-violet-600 font-bold">
                                        {entry.hint ? "+1.0" : "+0.3"}
                                    </span>
                                )}
                                {showRaw && (
                                    <span className={`text-[10px] font-mono shrink-0 px-1.5 py-0.5 rounded transition-all duration-500 ${(showBoost || showNorm)
                                            ? getDisplayValue(i) >= 0
                                                ? "bg-emerald-100 text-emerald-700 font-bold"
                                                : "bg-red-50 text-red-400"
                                            : entry.rawScore >= 0.75
                                                ? "bg-indigo-100 text-indigo-700 font-bold"
                                                : "bg-gray-50 text-gray-400"
                                        }`}>
                                        {formatScore(i)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span className="text-[11px] text-gray-400 font-medium">
                            {showBoost ? "Boosted Scores" : showNorm ? "Z-Normalized Scores" : "Cosine Similarity Scores"}
                        </span>
                        {showBoost && !showFilter && (
                            <span className="ml-auto text-[9px] font-medium text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                                BOOSTED
                            </span>
                        )}
                        {showFilter && (
                            <span className="ml-auto text-[9px] font-medium text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                FILTERED
                            </span>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col px-4 py-3 gap-2 max-h-[400px]">
                        {step === 0 && (
                            <div className="flex-1 flex items-center justify-center text-gray-300 text-sm min-h-[200px]">
                                Press Start
                            </div>
                        )}

                        {showCompute && (
                            <div
                                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-4"
                                style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                            >
                                <div className="flex items-center gap-4 text-[12px] font-mono text-gray-500">
                                    <span>mean = <span className="text-indigo-600 font-bold">{mean.toFixed(3)}</span></span>
                                    <span>std = <span className="text-indigo-600 font-bold">{stdDev.toFixed(3)}</span></span>
                                    {showNorm && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span>z = (x - {mean.toFixed(2)}) / {stdDev.toFixed(2)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {showRaw && (
                            <div className="flex flex-col gap-0.5 flex-1">
                                {(showNorm || showBoost) && (
                                    <div className="flex items-center justify-between px-1 mb-1">
                                        <span className="text-[10px] text-red-400 font-semibold">Negative</span>
                                        <span className="text-[10px] text-gray-300">0</span>
                                        <span className="text-[10px] text-emerald-500 font-semibold">Positive</span>
                                    </div>
                                )}
                                {entries.map((entry, i) => (
                                    <div
                                        key={entry.id}
                                        className={`flex items-center gap-2 transition-opacity duration-500 ${isDiscarded(i) ? "opacity-20" : ""
                                            }`}
                                    >
                                        <span className="text-[10px] font-mono text-gray-400 w-7 shrink-0 text-right">
                                            {entry.id}
                                        </span>
                                        <div className="flex-1">
                                            <Bar
                                                value={getDisplayValue(i)}
                                                maxAbs={getMaxAbs()}
                                                color={getBarColor(i)}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-mono w-12 text-right shrink-0 transition-all duration-500 ${getScoreColor(i)}`}>
                                            {formatScore(i)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ZNormSlide;
