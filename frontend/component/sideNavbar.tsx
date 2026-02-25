"use client";

import { useState } from "react";
import Link from "next/link";

const chatHistory = [
    "What's something you've learned recently?",
    "If you could teleport anywhere...",
    "What's one goal you want to achieve?",
    "Ask me anything weird or random...",
    "How are you feeling today, really?",
    "What's one habit you wish you had?",
    "Help me brainstorm project ideas",
    "Explain quantum computing simply",
];

export default function SideNavbar() {
    const [collapsed, setCollapsed] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = chatHistory.filter((c) =>
        c.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/5 z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setCollapsed(true)}
                />
            )}

            <button
                onClick={() => setCollapsed(!collapsed)}
                className={`fixed top-5 z-50 w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-surface-white ${collapsed
                        ? "left-5 bg-page-bg"
                        : "left-[268px] bg-surface-white"
                    }`}
                aria-label="Toggle Sidebar"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {collapsed ? (
                        <>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="14" y2="12" />
                            <line x1="4" y1="18" x2="18" y2="18" />
                        </>
                    ) : (
                        <>
                            <polyline points="11 17 6 12 11 7" />
                            <line x1="18" y1="12" x2="6" y2="12" />
                        </>
                    )}
                </svg>
            </button>

            <aside
                className={`fixed top-0 left-0 h-screen z-40 bg-surface-white border-r border-border flex flex-col transition-all duration-300 ease-in-out ${collapsed ? "w-0 -translate-x-full opacity-0" : "w-[256px] translate-x-0 opacity-100"
                    }`}
            >
                <div className="overflow-hidden flex flex-col h-full">
                    <div className="px-4 pt-5 pb-3">
                        <div className="flex items-center gap-2.5 mb-5">
                            <img src="https://placehold.co/400" alt="Lethus Logo" className="w-7 h-7 rounded-lg object-cover" />
                            <span className="text-[15px] font-semibold text-text-primary font-primary tracking-[-0.01em]">
                                Lethus
                            </span>
                        </div>

                        <button className="group w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-page-bg text-text-primary font-primary text-[13px] font-medium border border-border cursor-pointer transition-all duration-200 hover:border-brand-purple/30 hover:text-brand-purple mb-4">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Chat
                        </button>

                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-page-bg border border-border-subtle transition-all duration-200 focus-within:border-border focus-within:bg-surface-white">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none font-primary text-[13px] text-text-primary placeholder:text-text-tertiary w-full"
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-border-subtle mx-0 my-1" />

                    <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <p className="px-3 text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-2">
                            Recent
                        </p>
                        <div className="flex flex-col gap-0.5">
                            {filtered.map((chat, i) => (
                                <Link
                                    key={i}
                                    href={`/chat/${i + 1}`}
                                    className="group flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-secondary font-primary text-[13px] no-underline transition-all duration-150 hover:bg-page-bg hover:text-text-primary"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                    <span className="truncate">{chat}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}