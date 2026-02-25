"use client";

import { useState } from "react";

type ChangeLogTag = "CONTEXT" | "DECISION" | "UPDATE" | "ISSUE" | "RESOLUTION";

const changeLog: { id: string; tag: ChangeLogTag; text: string }[] = [
    { id: "T1", tag: "CONTEXT", text: "Building e-commerce backend" },
    { id: "T2", tag: "DECISION", text: "Node + Express as runtime" },
    { id: "T3", tag: "DECISION", text: "PostgreSQL as database" },
    { id: "T4", tag: "DECISION", text: "Stripe for payments" },
    { id: "T5", tag: "UPDATE", text: "Switched PostgreSQL → MongoDB (flexible data)" },
    { id: "T6", tag: "CONTEXT", text: "Setting up user authentication" },
    { id: "T7", tag: "DECISION", text: "JWT tokens for auth" },
    { id: "T8", tag: "CONTEXT", text: "Added orders collection to MongoDB" },
    { id: "T9", tag: "ISSUE", text: "Orders endpoint throwing 500 error" },
    { id: "T10", tag: "RESOLUTION", text: "Fixed 500 error, missing await" },
    { id: "T11", tag: "CONTEXT", text: "Adding product search" },
    { id: "T12", tag: "ISSUE", text: "Search too slow on large datasets" },
    { id: "T13", tag: "DECISION", text: "Added index on product name field" },
    { id: "T14", tag: "UPDATE", text: "Switched Stripe → PayPal (too many fees)" },
    { id: "T15", tag: "CONTEXT", text: "PayPal sandbox configured" },
    { id: "T16", tag: "CONTEXT", text: "Adding order status tracking" },
    { id: "T17", tag: "DECISION", text: "Order statuses: pending, processing, shipped, delivered" },
    { id: "T18", tag: "ISSUE", text: "Search still slow on 100k products despite index" },
    { id: "T19", tag: "CONTEXT", text: "Considering Redis for search caching" },
    { id: "T20", tag: "DECISION", text: "Adding Redis for caching" },
];

const tagColors: Record<ChangeLogTag, string> = {
    CONTEXT: "bg-blue-100 text-blue-700",
    DECISION: "bg-brand-purple-light text-brand-purple",
    UPDATE: "bg-green-100 text-green-700",
    ISSUE: "bg-red-100 text-red-600",
    RESOLUTION: "bg-emerald-100 text-emerald-700",
};

function ChevronIcon({ open }: { open: boolean }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export default function ChangeLogSection() {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-2xl border border-white/40 overflow-hidden transition-all duration-300"
            style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(238,240,255,0.4) 100%)",
                backdropFilter: "blur(12px)",
            }}
        >
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 cursor-pointer border-none bg-transparent font-primary text-sm font-semibold text-text-primary"
            >
                <div className="flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="12 8 12 12 14 14" />
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                    Change Log
                </div>
                <ChevronIcon open={open} />
            </button>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 pb-4 overflow-y-auto max-h-[440px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-col gap-1.5 relative">
                        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-brand-purple/10" />
                        {changeLog.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-start gap-2.5 pl-4 relative"
                            >
                                <div className="absolute left-[3px] top-[7px] w-[5px] h-[5px] rounded-full bg-brand-purple/30" />
                                <span className="text-[10px] font-bold text-text-secondary/60 shrink-0 w-7 pt-px">
                                    {entry.id}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${tagColors[entry.tag]}`}>
                                    {entry.tag}
                                </span>
                                <span className="text-[12px] text-text-secondary leading-snug">
                                    {entry.text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
