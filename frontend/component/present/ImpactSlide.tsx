import React from "react";
import Card from "./Card";

const ImpactSlide = () => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="flex flex-col items-center justify-center text-center py-6">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-3 font-medium">Measurable Impact</p>
                <div className="flex items-center gap-4 mb-3">
                    <span className="text-red-400 text-2xl font-bold font-mono">4,800</span>
                    <span className="text-gray-300 text-xl">→</span>
                    <span className="text-green-600 text-2xl font-bold font-mono">1,240</span>
                </div>
                <div className="text-6xl font-black text-violet-600 leading-none">↓74%</div>
                <p className="text-gray-400 text-sm mt-2">token reduction</p>
            </Card>
            <div className="flex flex-col gap-3">
                {["↓ 74% cost", "Faster responses", "Same answer quality"].map((b, i) => (
                    <Card key={i} className="py-3.5">
                        <span className="text-gray-700 text-base font-medium">{b}</span>
                    </Card>
                ))}
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
                <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">Use Cases</p>
                <ul className="flex flex-col gap-2.5">
                    {["Long-running AI agents", "Coding copilots", "RAG at scale", "Enterprise LLM infra"].map((u, i) => (
                        <li key={i} className="flex gap-3 text-gray-600 text-base">
                            <span className="text-violet-500 shrink-0">→</span>{u}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card className="bg-violet-600 border-violet-600 flex items-center justify-center">
                <p className="text-white text-base text-center font-medium leading-relaxed">Lethus is the memory protocol for LLMs. Stop resending the past. Send only what matters.</p>
            </Card>
        </div>
    </div>
);

export default ImpactSlide;
