"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import StateLogSection from "@/component/ui/stateLog";
import ChangeLogSection from "@/component/ui/changeLog";
import AnalyticsSection from "@/component/ui/analytics";

type Section = "state" | "changelog" | "analytics" | null;

export default function RightPanel() {
    const [collapsed, setCollapsed] = useState(false);
    const [activeSection, setActiveSection] = useState<Section>("state");
    const [width, setWidth] = useState(296);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const handleToggle = (section: Section) => {
        setActiveSection((prev) => (prev === section ? null : section));
    };

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startX.current = e.clientX;
        startWidth.current = width;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
    }, [width]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = startX.current - e.clientX;
            const newWidth = Math.min(Math.max(startWidth.current + delta, 260), 600);
            setWidth(newWidth);
        };

        const onMouseUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    return (
        <>
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={`fixed top-5 z-50 w-8 h-8 rounded-lg border border-border flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-surface-white ${collapsed
                        ? "right-5 bg-page-bg"
                        : "bg-surface-white"
                    }`}
                style={collapsed ? undefined : { right: `${width + 12}px` }}
                aria-label="Toggle Right Panel"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {collapsed ? (
                        <>
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="10" y1="12" x2="20" y2="12" />
                            <line x1="6" y1="18" x2="20" y2="18" />
                        </>
                    ) : (
                        <>
                            <polyline points="13 17 18 12 13 7" />
                            <line x1="6" y1="12" x2="18" y2="12" />
                        </>
                    )}
                </svg>
            </button>

            <aside
                className={`fixed top-0 right-0 h-screen z-40 bg-surface-white border-l border-border flex transition-all duration-300 ease-in-out ${collapsed ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
                    }`}
                style={{ width: collapsed ? 0 : `${width}px` }}
            >
                <div
                    onMouseDown={onMouseDown}
                    className="w-1 h-full cursor-col-resize shrink-0 hover:bg-brand-purple/10 active:bg-brand-purple/20 transition-colors duration-150"
                />
                <div className="flex-1 flex flex-col h-full gap-2.5 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <StateLogSection open={activeSection === "state"} onToggle={() => handleToggle("state")} />
                    <ChangeLogSection open={activeSection === "changelog"} onToggle={() => handleToggle("changelog")} />
                    <AnalyticsSection open={activeSection === "analytics"} onToggle={() => handleToggle("analytics")} />
                </div>
            </aside>
        </>
    );
}
