"use client";
import React, { useState, useEffect } from "react";

const slides = [
  {
    id: 1,
    tag: "THE PROBLEM",
    title: "Stop Paying LLMs to Remember the Same Thing",
    hook: "Have you ever watched your OpenAI bill grow because your app keeps resending the same context?",
    content: {
      type: "problem",
      left: {
        heading: "LLMs are stateless",
        points: [
          "Every request replays the past",
          "Tokens scale with conversation length",
          "Cost ↑ latency ↑ noise ↑",
        ],
      },
      right: {
        heading: "Current solutions are lossy or inefficient",
        points: [
          { label: "Full history", note: "— expensive" },
          { label: "Summaries", note: "— lose detail" },
          { label: "RAG", note: "— retrieves chunks, not reasoning flow" },
        ],
      },
      footer: "We pay for tokens, not intelligence.",
    },
  },
  {
    id: 2,
    tag: "CORE IDEA",
    title: "Lethus Memory Layer",
    hook: "Send the Present + the Most Meaningful Story",
    content: {
      type: "memory",
      left: {
        icon: "🧠",
        heading: "State Log",
        sub: "Current truth — small & deterministic",
        points: ["Stack: Node + MongoDB + Redis", "Current task", "Active decisions"],
      },
      right: {
        icon: "📜",
        heading: "Change Log",
        sub: "Structured timeline",
        points: ["ISSUE", "DECISION", "UPDATE", "RESOLUTION"],
      },
      footer: "We never resend stable context — only what changed.",
    },
  },
  {
    id: 3,
    tag: "ALGORITHM",
    title: "The Algorithmic Engine",
    hook: "Turning Context into an Optimization Problem",
    content: {
      type: "steps",
      steps: [
        { num: "01", title: "Semantic Relevance", desc: "Embed each turn → similarity scores" },
        { num: "02", title: "Z-Normalization", desc: "Remove baseline noise → keep only statistically significant turns" },
        { num: "03", title: "Kadane's Algorithm", desc: "Find the highest-information continuous span" },
      ],
      footer:
        "Instead of top-k fragments we send one coherent reasoning chain. We treat context like a signal — not text.",
    },
  },
  {
    id: 4,
    tag: "DIFFERENTIATION",
    title: "Why This Is Different",
    hook: "Not RAG. Not Summarization. Not Prompt Compression.",
    content: {
      type: "comparison",
      vs: [
        { label: "Current systems decide", value: "Which chunks to retrieve", highlight: false },
        { label: "Lethus decides", value: "Which exact span deserves to exist in the prompt", highlight: true },
      ],
      advantages: [
        "Lossless — no summarization",
        "Causality preserved — reasoning chain intact",
        "Token reduction without accuracy drop",
        "Linear-time span extraction",
      ],
      positioning: "A context optimization layer between retrieval and generation",
    },
  },
  {
    id: 5,
    tag: "IMPACT & VISION",
    title: "Pay for Signal, Not Tokens",
    hook: "",
    content: {
      type: "impact",
      metric: { before: "4,800", after: "1,240", reduction: "74%", label: "token reduction" },
      benefits: ["↓ 74% cost", "Faster responses", "Same answer quality"],
      useCases: ["Long-running AI agents", "Coding copilots", "RAG at scale", "Enterprise LLM infra"],
      vision: "Lethus is the memory protocol for LLMs. Stop resending the past. Send only what matters.",
    },
  },
];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-5 ${className}`}>
    {children}
  </div>
);

const FooterBanner = ({ children }: { children: React.ReactNode }) => (
  <div className="border border-violet-200 bg-violet-50 rounded-lg px-5 py-4 text-violet-800 text-base font-medium leading-relaxed">
    {children}
  </div>
);

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

const ImpactSlide = ({ content }: any) => (
  <div className="flex flex-col gap-5 flex-1">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="flex flex-col items-center justify-center text-center py-6">
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-3 font-medium">Measurable Impact</p>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-red-400 text-2xl font-bold font-mono">{content.metric.before}</span>
          <span className="text-gray-300 text-xl">→</span>
          <span className="text-green-600 text-2xl font-bold font-mono">{content.metric.after}</span>
        </div>
        <div className="text-6xl font-black text-violet-600 leading-none">↓{content.metric.reduction}</div>
        <p className="text-gray-400 text-sm mt-2">{content.metric.label}</p>
      </Card>
      <div className="flex flex-col gap-3">
        {content.benefits.map((b: string, i: number) => (
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
          {content.useCases.map((u: string, i: number) => (
            <li key={i} className="flex gap-3 text-gray-600 text-base">
              <span className="text-violet-500 shrink-0">→</span>{u}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="bg-violet-600 border-violet-600 flex items-center justify-center">
        <p className="text-white text-base text-center font-medium leading-relaxed">{content.vision}</p>
      </Card>
    </div>
  </div>
);

export default function Present() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"up" | "down">("up");

  const goTo = (idx: number) => {
    if (idx === current || animating) return;
    setDirection(idx > current ? "up" : "down");
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 300);
  };

  const next = () => goTo(Math.min(current + 1, slides.length - 1));
  const prev = () => goTo(Math.max(current - 1, 0));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, animating]);

  const slide = slides[current];

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-gray-200 bg-white z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full shrink-0"
            style={{
              background: "radial-gradient(circle at 35% 35%, #a78bfa, #5b21b6)",
              boxShadow: "0 0 10px rgba(124,106,245,0.3)",
            }}
          />
          <span className="text-gray-900 font-bold text-lg tracking-tight">Lethus</span>
        </div>
        <span className="text-gray-400 text-sm tabular-nums hidden sm:block font-medium">
          {String(current + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main slide */}
        <main className="flex-1 overflow-hidden">
          <div
            className="flex flex-col w-full max-w-4xl mx-auto px-6 sm:px-10 pt-8 pb-6 h-full"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? `translateY(${direction === "up" ? "32px" : "-32px"})`
                : "translateY(0px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
          >
            {/* Tag */}
            <div className="inline-flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1 w-fit mb-4 bg-gray-50">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
              <span className="text-gray-500 text-xs font-semibold tracking-widest uppercase">{slide.tag}</span>
            </div>

            {/* Title */}
            <h1 className="text-gray-900 font-extrabold leading-tight mb-3 tracking-tight text-3xl sm:text-4xl lg:text-5xl">
              {slide.title}
            </h1>

            {/* Hook */}
            {slide.hook && (
              <p className="text-gray-500 text-lg sm:text-xl mb-7 max-w-2xl leading-relaxed">
                {slide.hook}
              </p>
            )}

            {slide.content.type === "problem" && <ProblemSlide content={slide.content} />}
            {slide.content.type === "memory" && <MemorySlide content={slide.content} />}
            {slide.content.type === "steps" && <StepsSlide content={slide.content} />}
            {slide.content.type === "comparison" && <ComparisonSlide content={slide.content} />}
            {slide.content.type === "impact" && <ImpactSlide content={slide.content} />}
          </div>
        </main>

        {/* Vertical progress rail — right side */}
        <aside className="hidden md:flex flex-col items-center justify-center gap-4 w-16 border-l border-gray-100 shrink-0">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              title={s.tag}
              className="group flex flex-col items-center gap-2 cursor-pointer p-0 m-0 border-0 bg-transparent"
            >
              <div
                className="rounded-full transition-all duration-300 "
                style={{
                  width: i === current ? "6px" : "6px",
                  height: i === current ? "36px" : "8px",
                  background: i === current ? "#7c3aed" : "#6a7282",
                  transition: "height 0.3s ease, background 0.3s ease",
                }}
              />
              {i < slides.length - 1 && (
                <div className="w-px h-3" />
              )}
            </button>
          ))}
        </aside>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 sm:px-10 py-4 border-t border-gray-200 bg-white shrink-0">
        <button
          onClick={prev}
          disabled={current === 0}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
            current === 0
              ? "border-gray-100 text-gray-300 cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
          }`}
        >
          ← Previous
        </button>

        {/* Mobile dots */}
        <div className="flex md:hidden items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="border-0 p-0 cursor-pointer rounded-full transition-all duration-300"
              style={{
                width: i === current ? "20px" : "8px",
                height: "8px",
                background: i === current ? "#7c3aed" : "#e5e7eb",
              }}
            />
          ))}
        </div>

        <span className="hidden sm:block text-gray-300 text-xs select-none">use arrow keys to navigate</span>

        <button
          onClick={next}
          disabled={current === slides.length - 1}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
            current === slides.length - 1
              ? "border-gray-100 text-gray-300 cursor-not-allowed"
              : "bg-violet-600 border-violet-600 text-white hover:bg-violet-700 cursor-pointer shadow-sm"
          }`}
        >
          Next →
        </button>
      </footer>
    </div>
  );
}