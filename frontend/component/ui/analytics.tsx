"use client";

interface Props {
    open: boolean;
    onToggle: () => void;
}

export default function AnalyticsSection({ open, onToggle }: Props) {
    return (
        <div className="rounded-xl border border-border overflow-hidden flex-1 flex flex-col">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer border-none bg-page-bg font-primary text-[13px] font-semibold text-text-primary"
            >
                <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Analytics
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
            <div className={`transition-all duration-200 ease-in-out overflow-hidden ${open ? "max-h-100" : "max-h-0"}`}>
                <div className="flex items-center justify-center px-4 py-6 bg-surface-white border-t border-border-subtle">
                    <div className="w-full min-h-35 rounded-lg border border-dashed border-border flex items-center justify-center">
                        <span className="text-[12px] text-text-tertiary font-primary">Charts coming soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
