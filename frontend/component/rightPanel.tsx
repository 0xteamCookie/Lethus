"use client";

import { useState } from "react";
import StateLogSection from "@/component/ui/stateLog";
import ChangeLogSection from "@/component/ui/changeLog";
import AnalyticsSection from "@/component/ui/analytics";

export default function RightPanel() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={`fixed top-5 z-50 w-9 h-9 rounded-xl border border-white/40 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:bg-white/90 ${collapsed
                    ? "right-5 bg-white/70 backdrop-blur-md"
                    : "right-[312px] bg-white/80 backdrop-blur-md"
                    }`}
                aria-label="Toggle Right Panel"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
                    {collapsed ? (
                        <>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="10" y1="12" x2="20" y2="12" />
                            <line x1="6" y1="18" x2="20" y2="18" />
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
                className={`fixed top-0 right-0 h-screen z-40 flex flex-col transition-all duration-300 ease-in-out border-l border-white/30 ${collapsed ? "w-0 translate-x-full opacity-0" : "w-[300px] translate-x-0 opacity-100"
                    }`}
                style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(238,240,255,0.75) 100%)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    boxShadow: "-4px 0 24px rgba(92,53,230,0.03)",
                }}
            >
                <div className="overflow-hidden flex flex-col h-full gap-3 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <StateLogSection />
                    <ChangeLogSection />
                    <AnalyticsSection />
                </div>
            </aside>
        </>
    );
}
