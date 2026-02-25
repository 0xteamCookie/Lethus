import React from "react";
import Card from "./Card";
import FooterBanner from "./FooterBanner";

const ProblemSlide = () => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
                <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">LLMs are stateless</p>
                <ul className="flex flex-col gap-3">
                    {["Every request replays the past", "Tokens scale with conversation length", "Cost ↑ latency ↑ noise ↑"].map((point, j) => (
                        <li key={j} className="flex items-start gap-3 text-gray-600 text-base leading-snug">
                            <span className="text-violet-400 mt-1.5 text-xs shrink-0">▪</span>
                            {point}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card>
                <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">Current solutions are lossy or inefficient</p>
                <ul className="flex flex-col gap-3">
                    {[
                        { label: "Full history", note: "— expensive" },
                        { label: "Summaries", note: "— lose detail" },
                        { label: "RAG", note: "— retrieves chunks, not reasoning flow" },
                    ].map((p, j) => (
                        <li key={j} className="flex items-start gap-3 text-gray-600 text-base leading-snug">
                            <span className="text-violet-400 mt-1.5 text-xs shrink-0">▪</span>
                            <span>
                                <span className="font-medium text-gray-800">{p.label}</span>
                                <span className="text-gray-400"> {p.note}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
        <FooterBanner>→ We pay for tokens, not intelligence.</FooterBanner>
    </div>
);

export default ProblemSlide;
