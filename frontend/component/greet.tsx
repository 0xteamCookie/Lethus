"use client";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
}

export default function Greet() {
    return (
        <div className="flex flex-col items-center gap-5">
            <div className="relative w-[88px] h-[88px] mb-2">
                <div
                    className="sphere-float w-[88px] h-[88px] rounded-full"
                    style={{
                        background:
                            "radial-gradient(circle at 30% 30%, #e0e7ff 0%, #a5b4fc 20%, #818cf8 40%, #4338CA 65%, #3730A3 100%)",
                        boxShadow:
                            "0 12px 48px rgba(67,56,202,0.2), inset 0 -6px 16px rgba(55,48,163,0.2), inset 0 3px 10px rgba(255,255,255,0.2)",
                    }}
                />
                <div
                    className="absolute top-[10px] left-[18px] w-[28px] h-[16px] rounded-full blur-[3px]"
                    style={{
                        background:
                            "radial-gradient(ellipse, rgba(255,255,255,0.45), transparent)",
                    }}
                />
            </div>
            <div className="flex flex-col items-center gap-2">
                <h1 className="font-primary text-[32px] font-bold text-text-primary text-center leading-tight tracking-[-0.02em]">
                    {getGreeting()}
                </h1>
                <p className="font-primary text-[18px] font-normal text-text-secondary text-center leading-relaxed">
                    How can I{" "}
                    <span className="text-brand-purple font-medium">
                        assist you today?
                    </span>
                </p>
            </div>
        </div>
    );
}
