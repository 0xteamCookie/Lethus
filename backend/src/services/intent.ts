// classifies the user's current message into four intents.
// Why classify intent?
//   Different intents need different retrieval strategies:
//
//   RECALL       → Full embedding search across all history
//                  "what database did we choose?" needs to find
//                  turn 3 even if we're at turn 40
//
//   CONTINUATION → Just the last N turns
//                  "okay now add error handling" — the user is
//                  continuing the current thread, distant history
//                  is irrelevant and will confuse the model
//
//   CLARIFICATION → Just the immediately preceding assistant turn
//                  "what do you mean by that?" — the referent is
//                  always the last response
//
//   NEW_TOPIC    → Minimal history + state doc only
//                  "let's talk about auth now" — wipe the slate,
//                  only carry forward the state doc summary
//
//// We use the LLM to classify because heuristics (keyword matching)
// are too brittle. Real messages like "and what about the db thing"
// need semantic understanding to classify correctly.
//
// We use gpt-4o-mini because:
//   - It's the fastest model
//   - Intent classification is simple (4 choices, no reasoning needed)
//   - We're in the hot path — latency matters

import { chat } from "./llm";
import type { Intent } from "../types";

// Cache to avoid re-classifying the same message twice.
// Simple Map with a max size to avoid memory leaks.
const intentCache = new Map<string, Intent>();
const CACHE_MAX_SIZE = 1000;

const INTENT_SYSTEM_PROMPT = `You classify user messages in a multi-turn conversation.

Classify into exactly one of these four categories:

RECALL — User is asking about something that was discussed earlier in the conversation.
Examples: "what DB did we decide on?", "remind me what we said about auth", "what was the issue with the endpoint?"

CONTINUATION — User is continuing work from the previous 1-3 messages. No need to look far back.
Examples: "now add error handling", "okay and make it async", "fix that bug", "looks good, continue"

CLARIFICATION — User is asking for explanation of something in the immediately prior assistant response.
Examples: "what do you mean?", "can you explain that", "why does that work?", "elaborate on that last point"

NEW_TOPIC — User is starting a clearly new subject unrelated to recent context.
Examples: "let's talk about auth", "now I want to work on the frontend", "forget all that, new question"

Respond with JSON only: {"intent": "RECALL" | "CONTINUATION" | "CLARIFICATION" | "NEW_TOPIC"}`;

export async function classifyIntent(
  currentMessage: string,
  recentContext: string, // Last 1-2 turns as context for classification
): Promise<Intent> {
  // Check cache first
  const cacheKey = `${currentMessage.slice(0, 100)}`;
  if (intentCache.has(cacheKey)) {
    return intentCache.get(cacheKey)!;
  }

  try {
    const response = await chat(
      [
        { role: "system", content: INTENT_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Recent context:\n${recentContext}\n\n` +
            `Current message: ${currentMessage}`,
        },
      ],
      {
        model: "gpt-4o-mini",
        maxTokens: 20, // {"intent":"RECALL"} is about 10 tokens
        jsonMode: true,
      },
    );

    const parsed = JSON.parse(response) as { intent: string };
    const intent = parsed.intent as Intent;

    // Validate that we got a known intent
    const validIntents: Intent[] = [
      "RECALL",
      "CONTINUATION",
      "CLARIFICATION",
      "NEW_TOPIC",
    ];

    if (!validIntents.includes(intent)) {
      console.warn(
        `Intent classifier returned unknown intent: ${intent}, ` +
          `defaulting to RECALL`,
      );
      return "RECALL";
    }

    // Cache the result
    if (intentCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry when cache is full
      const firstKey = intentCache.keys().next().value;
      if (firstKey) intentCache.delete(firstKey);
    }
    intentCache.set(cacheKey, intent);

    return intent;
  } catch (error) {
    // If classification fails, default to RECALL.
    // RECALL is the most thorough strategy — it won't miss context.
    // Better to over-retrieve than under-retrieve on failure.
    console.error("Intent classification failed, defaulting to RECALL:", error);
    return "RECALL";
  }
}
