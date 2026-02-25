"use client";

export default function AnalyticsSection() {
    return (
        <div className="flex-1 rounded-2xl border border-white/40 overflow-hidden flex flex-col min-h-[200px]"
            style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(238,240,255,0.4) 100%)",
                backdropFilter: "blur(12px)",
            }}
        >
            <div className="px-4 py-3 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span className="font-primary text-sm font-semibold text-text-primary">Analytics</span>
            </div>
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
                <div className="w-full h-full min-h-[140px] rounded-xl border border-dashed border-border/60 flex items-center justify-center">
                    <span className="text-[12px] text-text-secondary/50 font-primary">Graphs coming soon</span>
                </div>
            </div>
        </div>
    );
}
