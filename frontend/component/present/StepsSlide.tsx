import React from "react";
import Card from "./Card";
import FooterBanner from "./FooterBanner";

const StepsSlide = ({ content }: any) => (
    <div className="flex flex-col gap-5 flex-1">
        <div className="flex flex-col gap-3">
            {content.steps.map((s: any, i: number) => (
                <Card key={i} className="flex items-center gap-6">
                    <div className="text-5xl font-black text-gray-100 font-mono min-w-[3.5rem] shrink-0 select-none leading-none tabular-nums">{s.num}</div>
                    <div className="border-l border-gray-200 pl-5">
                        <p className="text-gray-900 font-semibold text-lg mb-1">{s.title}</p>
                        <p className="text-gray-500 text-base">{s.desc}</p>
                    </div>
                </Card>
            ))}
        </div>
        <FooterBanner>💡 {content.footer}</FooterBanner>
    </div>
);

export default StepsSlide;
