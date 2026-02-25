import React from "react";
import Card from "./Card";

const ComparisonSlide = () => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gray-50 border-gray-200">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-medium">Current systems decide</p>
                <p className="text-base font-semibold leading-snug text-gray-500">Which chunks to retrieve</p>
            </Card>
            <Card className="border-violet-300 bg-violet-50">
                <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-medium">Lethus decides</p>
                <p className="text-base font-semibold leading-snug text-violet-800">Which exact span deserves to exist in the prompt</p>
            </Card>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
                <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">Key Advantages</p>
                <ul className="flex flex-col gap-2.5">
                    {[
                        "Lossless — no summarization",
                        "Causality preserved — reasoning chain intact",
                        "Token reduction without accuracy drop",
                        "Linear-time span extraction",
                    ].map((a, i) => (
                        <li key={i} className="flex gap-3 text-gray-600 text-base">
                            <span className="text-violet-500 shrink-0 font-bold">✓</span>{a}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card className="bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500 text-base text-center italic leading-relaxed">A context optimization layer between retrieval and generation</p>
            </Card>
        </div>
    </div>
);

export default ComparisonSlide;
