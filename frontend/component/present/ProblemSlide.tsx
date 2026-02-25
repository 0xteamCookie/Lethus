import React from "react";
import Card from "./Card";
import FooterBanner from "./FooterBanner";

const ProblemSlide = ({ content }: any) => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[content.left, content.right].map((col: any, i: number) => (
                <Card key={i}>
                    <p className="text-gray-900 font-semibold text-lg mb-4 pb-3 border-b border-gray-100">{col.heading}</p>
                    <ul className="flex flex-col gap-3">
                        {col.points.map((p: any, j: number) => (
                            <li key={j} className="flex items-start gap-3 text-gray-600 text-base leading-snug">
                                <span className="text-violet-400 mt-1.5 text-xs shrink-0">▪</span>
                                {typeof p === "string" ? p : (
                                    <span>
                                        <span className="font-medium text-gray-800">{p.label}</span>
                                        <span className="text-gray-400"> {p.note}</span>
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
        <FooterBanner>→ {content.footer}</FooterBanner>
    </div>
);

export default ProblemSlide;
