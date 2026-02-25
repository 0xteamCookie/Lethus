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
                    className="fixed inset-0 bg-black/5 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setCollapsed(true)}
                />
            )}

            <button
                onClick={() => setCollapsed(!collapsed)}
                className={`fixed top-5 z-50 w-9 h-9 rounded-xl border border-white/40 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:bg-white/90 ${
                    collapsed 
                        ? "left-5 bg-white/70 backdrop-blur-md" 
                        : "left-[272px] bg-white/80 backdrop-blur-md"
                }`}
                aria-label="Toggle Sidebar"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
                    {collapsed ? (
                        <>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="4" y1="12" x2="14" y2="12" />
                            <line x1="4" y1="18" x2="18" y2="18" />
                        </>
                    ) : (
                        <>
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </>
                    )}
                </svg>
            </button>

            <aside
                className={`fixed top-0 left-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-white/30 ${
                    collapsed ? "w-0 -translate-x-full opacity-0" : "w-[260px] translate-x-0 opacity-100"
                }`}
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(238,240,255,0.75) 100%)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "4px 0 24px rgba(92,53,230,0.03)",
                }}
            >
                <div className="overflow-hidden flex flex-col h-full">
                    <div className="px-5 pt-6 pb-3">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-6">
                            <img src="https://placehold.co/400" alt="Lethus Logo" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                            <span className="text-lg font-bold text-text-primary font-primary tracking-tight">
                                Lethus
                            </span>
                        </div>

                        <button className="group w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/60 text-brand-purple font-primary text-sm font-semibold border border-brand-purple/20 cursor-pointer transition-all duration-300 hover:bg-white hover:border-brand-purple/40 hover:shadow-sm mb-5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:rotate-90">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Chat
                        </button>

                        {/* Search Input */}
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/40 border border-white/50 transition-all duration-300 focus-within:bg-white/70 focus-within:border-brand-purple/30 focus-within:shadow-sm">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-70">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search chats..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none font-primary text-sm text-text-primary placeholder:text-text-secondary/70 w-full"
                            />
                        </div>
                    </div>

                    <div className="w-[calc(100%-40px)] mx-auto h-[1px] bg-gradient-to-r from-transparent via-black/5 to-transparent my-1" />

                    <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <p className="px-3 text-[10px] font-bold text-text-secondary/70 uppercase tracking-widest mb-3">
                            Recent
                        </p>
                        <div className="flex flex-col gap-1">
                            {filtered.map((chat, i) => (
                                <Link
                                    key={i}
                                    href={`/chat/${i + 1}`}
                                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-text-secondary font-primary text-[13px] no-underline transition-all duration-200 hover:bg-white/60 hover:text-text-primary hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-40 group-hover:opacity-100 group-hover:text-brand-purple transition-all duration-200">
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