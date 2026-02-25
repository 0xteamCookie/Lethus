// wrapper around OpenAI's API
// 1. chat() general purpose chat completions (for changelog, state doc)
// 2. embed() text embedding 3 small embeddings
//
// both have retry logic. openai ocassionally ratelimits
//
// retrying 3 times with exponential backoff

import { config } from "../config";
import type { ChatMessage } from "../types";

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 500,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const message = (error as Error).message ?? "";
      const isRateLimit = message.includes("429");
      const isServerError = message.includes("5");

      if (!isRateLimit && !isServerError) {
        // beyond saving just throw error
        throw error;
      }

      if (attempt < maxAttempts - 1) {
        // exponential backoff: 500ms, 1000ms, 2000ms
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `LLM call failed (attempt ${attempt + 1}/${maxAttempts},` +
            `retrying in ${delay}ms... Error: ${message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// chat completion. used by: changelog, statedoc update and intent classification.
// NOT used for the actual user-facing LLM call (tat goes direct to upstream).

export async function chat(
  messages: ChatMessage[],
  {
    model = "gpt-4o-mini",
    maxTokens = 512,
    jsonMode = false,
  }: {
    model?: string;
    maxTokens?: number;
    jsonMode?: boolean;
  },
): Promise<string> {
  return withRetry(async () => {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: maxTokens,
    };

    // json_object mode forces the model to respond with valid JSON. useful for structured data

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI chat error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: { content: string | null };
        finish_reason: string;
      }>;
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error(
        `OpenAI returned empty content. ` +
          `finish_reason: ${data.choices[0]?.finish_reason}`,
      );
    }

    return content;
  });
}

// embeddings

export async function embed(text: string): Promise<number[]> {
  return withRetry(async () => {
    // truncate text to stay well within token limits. 8191 token model limit so if 1 token = 4 chars.
    // 8000 tokens * 4 chars = 32000 chars max
    const truncated = text.slice(0, 32000);

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiKey}`,
      },
      body: JSON.stringify({
        model: config.embeddingModel, // "text-embedding-3-small"
        input: truncated,
        encoding_format: "float", // Returns raw floats, not base64
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI embed error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    const embedding = data.data[0]?.embedding;
    if (!embedding || embedding.length !== config.embeddingDimension) {
      throw new Error(
        `Expected ${config.embeddingDimension}-dim embedding, ` +
          `got ${embedding?.length ?? 0}`,
      );
    }

    return embedding;
  });
}

// upstream proxy
// forwards the actual user request to the upstream llm
// this is not gpt-4o-mini it's whatever the user configured
//
// we stream the response back to the user.
export async function callUpstream(
  body: Record<string, unknown>,
): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const response = await fetch(config.upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.upstreamKey}`,
    },
    body: JSON.stringify({ ...body, stream: false }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Upstream LLM error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string | null } }>;
    usage?: { prompt_tokens: number; completion_tokens: number };
  };

  const content = data.choices[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  return { content, inputTokens, outputTokens };
}
