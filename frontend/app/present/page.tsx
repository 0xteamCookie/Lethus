"use client";
import React, { useState, useEffect } from "react";
import {
  ProblemSlide,
  MemorySlide,
  StepsSlide,
  ComparisonSlide,
  ImpactSlide,
  OurSolutionSlide,
  IntentSlide,
  ZNormSlide,
} from "@/component/present";

const slides = [
  { tag: "THE PROBLEM", title: "Stop Paying LLMs to Remember the Same Thing", hook: "Have you ever watched your OpenAI bill go up just because your LLM keeps sending the context again and again?" },
  { tag: "CORE IDEA", title: "Lethus Memory Layer", hook: "Send the Present + the Most Meaningful Story" },
  { tag: "ALGORITHM", title: "The Algorithmic Engine", hook: "Turning Context into an Optimization Problem" },
  { tag: "DIFFERENTIATION", title: "Why This Is Different", hook: "Not RAG. Not Summarization. Not Prompt Compression." },
  { tag: "IMPACT & VISION", title: "Pay for Signal, Not Tokens", hook: "" },
  { tag: "OUR SOLUTION", title: "Live State Tracking in Action", hook: "Watch how Lethus builds a structured state document from a 20-turn conversation, in real time." },
  { tag: "INTENT", title: "Smart Intent Classification", hook: "Different messages need different retrieval strategies. Lethus classifies intent first, then fetches only what is needed." },
  { tag: "Z-NORMALIZATION", title: "Scoring and Filtering with Z-Normalization", hook: "Cosine similarity scores are Z-normalized so irrelevant chunks drop below zero and get discarded automatically." },
];

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

            {current === 0 && <ProblemSlide />}
            {current === 1 && <MemorySlide />}
            {current === 2 && <StepsSlide />}
            {current === 3 && <ComparisonSlide />}
            {current === 4 && <ImpactSlide />}
            {current === 5 && <OurSolutionSlide />}
            {current === 6 && <IntentSlide />}
            {current === 7 && <ZNormSlide />}
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


    </div>
  );
}