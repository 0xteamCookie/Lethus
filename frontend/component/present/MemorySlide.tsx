import React from "react";
import Card from "./Card";
import FooterBanner from "./FooterBanner";

const MemorySlide = ({ content }: any) => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[content.left, content.right].map((col: any, i: number) => (
                <Card key={i} className={i === 0 ? "border-l-4 border-l-violet-500" : ""}>
                    <div className="text-3xl mb-3">{col.icon}</div>
                    <p className="text-gray-900 font-semibold text-lg mb-1">{col.heading}</p>
                    <p className="text-gray-400 text-sm mb-4">{col.sub}</p>
                    <ul className="flex flex-col gap-2.5">
                        {col.points.map((p: string, j: number) => (
                            <li key={j} className="flex items-center gap-3 text-gray-600 text-base">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />{p}
                            </li>
                        ))}
                    </ul>
                </Card>
            ))}
        </div>
        <FooterBanner>{content.footer}</FooterBanner>
    </div>
);

export default MemorySlide;
