import React from "react";
import Card from "./Card";

const ComparisonSlide = ({ content }: any) => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.vs.map((v: any, i: number) => (
                <Card key={i} className={v.highlight ? "border-violet-300 bg-violet-50" : "bg-gray-50 border-gray-200"}>
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 font-medium">{v.label}</p>
                    <p className={`text-base font-semibold leading-snug ${v.highlight ? "text-violet-800" : "text-gray-500"}`}>{v.value}</p>
                </Card>
            ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
                <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">Key Advantages</p>
                <ul className="flex flex-col gap-2.5">
                    {content.advantages.map((a: string, i: number) => (
                        <li key={i} className="flex gap-3 text-gray-600 text-base">
                            <span className="text-violet-500 shrink-0 font-bold">✓</span>{a}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card className="bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500 text-base text-center italic leading-relaxed">{content.positioning}</p>
            </Card>
        </div>
    </div>
);

export default ComparisonSlide;
