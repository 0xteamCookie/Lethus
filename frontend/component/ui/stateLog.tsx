"use client";

const stateLog: { heading: string; icon: string; items: string[] }[] = [
    {
        heading: "Project",
        icon: "folder",
        items: ["E-commerce backend"],
    },
    {
        heading: "Stack",
        icon: "layers",
        items: [
            "Runtime: Node + Express",
            "DB: MongoDB",
            "Auth: JWT",
            "Payments: PayPal",
            "Cache: Redis (just added)",
        ],
    },
    {
        heading: "Current Task",
        icon: "target",
        items: ["Adding Redis for search caching"],
    },
    {
        heading: "Open Questions",
        icon: "help",
        items: ["Redis implementation details not decided yet"],
    },
    {
        heading: "Resolved",
        icon: "check",
        items: [
            "Switched PostgreSQL → MongoDB at T5 (flexible data)",
            "Switched Stripe → PayPal at T14 (too many fees)",
            "Fixed orders 500 error at T10 (missing await)",
            "Added product name index at T13 (search too slow)",
        ],
    },
];

const sectionIcons: Record<string, React.ReactNode> = {
    folder: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
    ),
    layers: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    ),
    target: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    ),
    help: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    check: (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
};

const headingStyles: Record<string, string> = {
    "Project": "text-text-secondary bg-page-bg border-border",
    "Stack": "text-text-secondary bg-page-bg border-border",
    "Current Task": "text-brand-purple bg-brand-purple-light border-brand-purple/15",
    "Open Questions": "text-text-secondary bg-page-bg border-border",
    "Resolved": "text-text-secondary bg-page-bg border-border",
};

interface Props {
    open: boolean;
    onToggle: () => void;
}

export default function StateLogSection({ open, onToggle }: Props) {
    return (
        <div className="rounded-xl border border-border overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-none bg-page-bg font-primary text-[13px] font-semibold text-text-primary"
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    State Log
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

            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-[800px]" : "max-h-0"}`}>
                <div className="px-3 pb-3 flex flex-col gap-2.5 bg-surface-white border-t border-border-subtle">
                    {stateLog.map((section) => (
                        <div key={section.heading} className="flex flex-col gap-1 pt-2 first:pt-1.5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border w-fit ${headingStyles[section.heading]}`}>
                                {sectionIcons[section.icon]}
                                {section.heading}
                            </div>
                            <div className="flex flex-col gap-px ml-0.5">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 py-0.5 px-2">
                                        <span className="w-1 h-1 rounded-full bg-text-tertiary shrink-0 mt-[6px]" />
                                        <span className="text-[12px] text-text-secondary leading-relaxed">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
