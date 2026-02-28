"use client";

import { useState, useEffect } from "react";
import { getStateDoc } from "@/lib/api";

interface StateSection {
    heading: string;
    icon: string;
    items: string[];
}

function parseStateDoc(content: string): StateSection[] {
    // State doc from the backend is structured text.
    // Parse lines grouped by headings (markdown ## or colon format)
    const sections: StateSection[] = [];
    const lines = content.split("\n").filter((l) => l.trim());

    const iconMap: Record<string, string> = {
        project: "folder",
        stack: "layers",
        "current task": "target",
        "current state": "target",
        "open questions": "help",
        "open issues": "help",
        resolved: "check",
        "active decisions": "check",
        "technical context": "layers",
        "recent focus": "target",
    };

    let current: StateSection | null = null;
    for (const line of lines) {
        const trimmed = line.trim();
        // Detect markdown headings (## Heading) or colon headings (Heading:)
        const isMarkdownHeading = trimmed.startsWith("##");
        const isColonHeading = trimmed.endsWith(":") && !trimmed.startsWith("-") && !trimmed.startsWith("*");
        
        if (isMarkdownHeading || isColonHeading) {
            let heading: string;
            if (isMarkdownHeading) {
                // Remove ## and trim
                heading = trimmed.replace(/^##+\s*/, "").trim();
            } else {
                // Remove colon
                heading = trimmed.slice(0, -1).trim();
            }
            
            current = {
                heading,
                icon: iconMap[heading.toLowerCase()] ?? "folder",
                items: [],
            };
            sections.push(current);
        } else if (current) {
            // Handle both bullet points and plain text
            if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
                // Bullet point
                const item = trimmed.replace(/^[-*]\s*/, "");
                // Filter out "None" entries
                if (item && item.toLowerCase() !== "none") {
                    current.items.push(item);
                }
            } else if (trimmed) {
                // Plain text (like "We are building..." or "None")
                // Only add if it's not just "None" or empty
                if (trimmed.toLowerCase() !== "none") {
                    current.items.push(trimmed);
                }
            }
        }
    }
    return sections;
}

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
    "Current State": "text-brand-purple bg-brand-purple-light border-brand-purple/15",
    "Open Questions": "text-text-secondary bg-page-bg border-border",
    "Open Issues": "text-text-secondary bg-page-bg border-border",
    "Resolved": "text-text-secondary bg-page-bg border-border",
    "Active Decisions": "text-text-secondary bg-page-bg border-border",
    "Technical Context": "text-text-secondary bg-page-bg border-border",
    "Recent Focus": "text-text-secondary bg-page-bg border-border",
};

interface Props {
    open: boolean;
    onToggle: () => void;
    conversationId: string | null;
    version?: number;
}

export default function StateLogSection({ open, onToggle, conversationId, version }: Props) {
    const [stateLog, setStateLog] = useState<StateSection[]>([]);

    useEffect(() => {
        if (!conversationId) {
            setStateLog([]);
            return;
        }
        getStateDoc(conversationId).then((doc) => {
            if (doc.content) setStateLog(parseStateDoc(doc.content));
            else setStateLog([]);
        }).catch(() => setStateLog([]));
    }, [conversationId, version]);

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

            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-200" : "max-h-0"}`}>
                <div className="px-3 pb-3 flex flex-col gap-2.5 bg-surface-white border-t border-border-subtle">
                    {stateLog.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary italic py-3 text-center">
                            {conversationId ? "No state doc yet" : "Select a conversation"}
                        </p>
                    ) : stateLog.map((section) => (
                        <div key={section.heading} className="flex flex-col gap-1 pt-2 first:pt-1.5">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border w-fit ${headingStyles[section.heading] ?? "text-text-secondary bg-page-bg border-border"}`}>
                                {sectionIcons[section.icon]}
                                {section.heading}
                            </div>
                            <div className="flex flex-col gap-px ml-0.5">
                                {section.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 py-0.5 px-2">
                                        <span className="w-1 h-1 rounded-full bg-text-tertiary shrink-0 mt-1.5" />
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
