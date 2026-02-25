"use client";

export default function Greet() {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-[100px] h-[100px] mb-4">
                <div
                    className="sphere-float w-[100px] h-[100px] rounded-full"
                    style={{
                        background:
                            "radial-gradient(circle at 30% 30%, #e0d4ff 0%, #a78bfa 25%, #7c3aed 50%, #5C35E6 70%, #4722c5 100%)",
                        boxShadow:
                            "0 8px 40px rgba(92,53,230,0.3), inset 0 -8px 20px rgba(59,31,153,0.25), inset 0 4px 12px rgba(255,255,255,0.15)",
                    }}
                />
                <div
                    className="absolute top-[12px] left-[22px] w-[32px] h-[20px] rounded-full blur-[3px]"
                    style={{
                        background:
                            "radial-gradient(ellipse, rgba(255,255,255,0.5), transparent)",
                    }}
                />
                <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[60px] h-[12px] rounded-full blur-[6px]"
                    style={{
                        background:
                            "radial-gradient(ellipse, rgba(92,53,230,0.2), transparent)",
                    }}
                />
            </div>
            <h1 className="font-primary text-[clamp(28px,4vw,42px)] font-extrabold text-text-primary text-center leading-tight">
                Good Morning, Judha
            </h1>
            <p className="font-primary text-[clamp(18px,2.5vw,24px)] font-normal text-text-primary text-center leading-relaxed">
                How Can I{" "}
                <span className="text-brand-purple font-semibold">
                    Assist You Today?
                </span>
            </p>
        </div>
    );
}
