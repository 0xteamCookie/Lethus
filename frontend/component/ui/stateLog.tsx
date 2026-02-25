"use client";

import { useState } from "react";

const stateLog = {
    Project: ["E-commerce backend"],
    Stack: [
        "Runtime: Node + Express",
        "DB: MongoDB",
        "Auth: JWT",
        "Payments: PayPal",
        "Cache: Redis (just added)",
    ],
    "Current Task": ["Adding Redis for search caching"],
    "Open Questions": ["Redis implementation details not decided yet"],
    Resolved: [
        "Switched PostgreSQL → MongoDB at T5 (flexible data)",
        "Switched Stripe → PayPal at T14 (too many fees)",
        "Fixed orders 500 error at T10 (missing await)",
        "Added product name index at T13 (search too slow)",
    ],
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

export default function StateLogSection() {
    const [open, setOpen] = useState(true);

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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    State Log
                </div>
                <ChevronIcon open={open} />
            </button>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="px-4 pb-4 flex flex-col gap-3">
                    {Object.entries(stateLog).map(([heading, items]) => (
                        <div key={heading}>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-brand-purple mb-1.5">
                                {heading}
                            </p>
                            <div className="flex flex-col gap-1">
                                {items.map((item, i) => (
                                    <p key={i} className="text-[12px] text-text-secondary leading-relaxed pl-2 border-l-2 border-brand-purple/15">
                                        {item}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
