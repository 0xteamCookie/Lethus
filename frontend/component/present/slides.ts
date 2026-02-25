export const slides = [
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
