import React from "react";
import Card from "./Card";
import FooterBanner from "./FooterBanner";

const MemorySlide = () => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-violet-500">
                <div className="text-3xl mb-3">🧠</div>
                <p className="text-gray-900 font-semibold text-lg mb-1">State Log</p>
                <p className="text-gray-400 text-sm mb-4">Current truth — small &amp; deterministic</p>
                <ul className="flex flex-col gap-2.5">
                    {["Stack: Node + MongoDB + Redis", "Current task", "Active decisions"].map((p, j) => (
                        <li key={j} className="flex items-center gap-3 text-gray-600 text-base">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{p}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card>
                <div className="text-3xl mb-3">📜</div>
                <p className="text-gray-900 font-semibold text-lg mb-1">Change Log</p>
                <p className="text-gray-400 text-sm mb-4">Structured timeline</p>
                <ul className="flex flex-col gap-2.5">
                    {["ISSUE", "DECISION", "UPDATE", "RESOLUTION"].map((p, j) => (
                        <li key={j} className="flex items-center gap-3 text-gray-600 text-base">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{p}
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
        <FooterBanner>We never resend stable context — only what changed.</FooterBanner>
    </div>
);

export default MemorySlide;
