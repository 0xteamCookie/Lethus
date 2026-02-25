"use client";

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

const tagConfig: Record<ChangeLogTag, { bg: string; text: string; dot: string; label: string }> = {
    CONTEXT: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", label: "CTX" },
    DECISION: { bg: "bg-brand-purple-light", text: "text-brand-purple", dot: "bg-brand-purple/40", label: "DEC" },
    UPDATE: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "UPD" },
    ISSUE: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400", label: "ISS" },
    RESOLUTION: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-300", label: "RES" },
};

interface Props {
    open: boolean;
    onToggle: () => void;
}

export default function ChangeLogSection({ open, onToggle }: Props) {
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
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-surface-white border border-border text-[10px] font-medium text-text-tertiary">
                        {changeLog.length}
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

            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-[500px]" : "max-h-0"}`}>
                <div className="overflow-y-auto max-h-[440px] bg-surface-white border-t border-border-subtle [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-col">
                        {changeLog.map((entry, i) => {
                            const config = tagConfig[entry.tag];
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-start gap-2.5 px-3.5 py-2 transition-colors duration-100 hover:bg-page-bg ${i !== changeLog.length - 1 ? "border-b border-border-subtle" : ""}`}
                                >
                                    <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                        {i !== changeLog.length - 1 && (
                                            <div className="w-px flex-1 min-h-[12px] bg-border-subtle" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-semibold text-text-tertiary">
                                                {entry.id}
                                            </span>
                                            <span className={`text-[9px] font-semibold px-1.5 py-px rounded ${config.bg} ${config.text}`}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <span className="text-[12px] text-text-secondary leading-snug">
                                            {entry.text}
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
