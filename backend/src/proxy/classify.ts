// Message-level utilities for the unified proxy handler.
//
// Three responsibilities:
//   1. extractTextContent() — get text from any OpenAI message format
//   2. countOpenAIMessagesTokens() — accurate token counting
//   3. reduceMessages() — smart reduction with Kadane scoring

import type { OpenAIMessage } from "../types";
import { countTokens } from "../services/tokenizer";

// Extract text content from an OpenAI message.
// Handles string content, content part arrays, and null.
export function extractTextContent(msg: OpenAIMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text!)
      .join("\n");
  }
  return "";
}

// Count tokens across a set of OpenAI messages including
// tool call argument overhead.
export function countOpenAIMessagesTokens(
  messages: OpenAIMessage[],
): number {
  let total = 3; // base overhead for the messages array
  for (const msg of messages) {
    total += countTokens(extractTextContent(msg));
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        total += countTokens(tc.function.name + " " + tc.function.arguments);
      }
    }
    total += 4; // per-message envelope overhead
  }
  return total;
}

// ── Message Reduction ─────────────────────────────────────────
// Reduces a message array to fit within a token budget.
//
// Strategy:
//   1. Preserve head (system/developer messages) — always kept
//   2. Preserve tail (recent N messages) — current tool rounds
//   3. Group tool call rounds as atomic units (never split them)
//   4. Score middle groups by BM25 relevance to current query
//   5. Z-score normalize + Kadane for best contiguous spans
//   6. Fill remaining budget by recency

interface MessageUnit {
  messages: OpenAIMessage[];
  tokens: number;
  score: number;
}

// Group messages into atomic units. Tool call rounds
// (assistant w/ tool_calls + following tool results) are
// grouped so they're never split.
function buildMessageUnits(messages: OpenAIMessage[]): MessageUnit[] {
  const units: MessageUnit[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.tool_calls?.length) {
      const group: OpenAIMessage[] = [msg];
      const ids = new Set(msg.tool_calls.map(tc => tc.id));
      let j = i + 1;
      while (
        j < messages.length &&
        messages[j].role === "tool" &&
        messages[j].tool_call_id &&
        ids.has(messages[j].tool_call_id!)
      ) {
        group.push(messages[j]);
        j++;
      }
      units.push({
        messages: group,
        tokens: countOpenAIMessagesTokens(group),
        score: 0,
      });
      i = j;
    } else {
      units.push({
        messages: [msg],
        tokens: countOpenAIMessagesTokens([msg]),
        score: 0,
      });
      i++;
    }
  }
  return units;
}

// ── BM25 Scoring ──────────────────────────────────────────────
// Scores each unit by BM25 relevance to the query.
// BM25 improves on raw keyword matching by accounting for:
//   - Term frequency saturation (diminishing returns for repeated words)
//   - Document length normalization (long messages don't dominate)
//   - Inverse document frequency (rare words across units matter more)
// Zero API calls, <1ms for typical message arrays.

const BM25_K1 = 1.2; // term frequency saturation parameter
const BM25_B = 0.75; // document length normalization (0=no, 1=full)

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
}

function scoreUnits(units: MessageUnit[], queryText: string): void {
  if (!queryText) return;
  const queryTerms = tokenize(queryText);
  if (queryTerms.length === 0) return;

  // Build per-unit term frequency maps and word counts
  const unitDocs: Array<{ tf: Map<string, number>; len: number }> = [];
  for (const unit of units) {
    const text = unit.messages.map(m => extractTextContent(m)).join(" ");
    const words = tokenize(text);
    const tf = new Map<string, number>();
    for (const w of words) {
      tf.set(w, (tf.get(w) ?? 0) + 1);
    }
    unitDocs.push({ tf, len: words.length });
  }

  // Average document length
  const avgDl =
    unitDocs.reduce((sum, d) => sum + d.len, 0) / unitDocs.length || 1;

  // IDF: how many units contain each query term
  const df = new Map<string, number>();
  for (const term of new Set(queryTerms)) {
    let count = 0;
    for (const doc of unitDocs) {
      if (doc.tf.has(term)) count++;
    }
    df.set(term, count);
  }

  const N = units.length;

  // Score each unit
  for (let i = 0; i < units.length; i++) {
    const { tf, len } = unitDocs[i];
    let score = 0;

    for (const term of queryTerms) {
      const termFreq = tf.get(term) ?? 0;
      if (termFreq === 0) continue;

      const docFreq = df.get(term) ?? 0;
      // IDF with smoothing to avoid negative values
      const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
      // BM25 term score
      const tfNorm =
        (termFreq * (BM25_K1 + 1)) /
        (termFreq + BM25_K1 * (1 - BM25_B + BM25_B * (len / avgDl)));

      score += idf * tfNorm;
    }

    units[i].score = score;
  }
}

export function reduceMessages(
  messages: OpenAIMessage[],
  targetTokens: number,
  tailPreserve: number,
  queryText: string,
): OpenAIMessage[] {
  // Split: head (leading system/developer) + body (rest)
  let headEnd = 0;
  while (
    headEnd < messages.length &&
    (messages[headEnd].role === "system" ||
      messages[headEnd].role === "developer")
  ) {
    headEnd++;
  }
  const head = messages.slice(0, headEnd);
  const body = messages.slice(headEnd);

  if (body.length === 0) return messages;

  // Tail: most recent messages (current tool rounds + context)
  const tailSize = Math.min(tailPreserve, body.length);
  const tail = body.slice(-tailSize);
  const middle = body.slice(0, body.length - tailSize);

  // Fixed token costs
  const headTokens = countOpenAIMessagesTokens(head);
  const tailTokens = countOpenAIMessagesTokens(tail);
  const fixedTokens = headTokens + tailTokens;
  const middleBudget = Math.max(targetTokens - fixedTokens, 0);

  if (middle.length === 0) {
    return assembleResult(head, [], tail, 0);
  }

  // Group middle messages into atomic units
  const units = buildMessageUnits(middle);

  // Score units by BM25 relevance
  scoreUnits(units, queryText);

  // Z-score normalize
  const rawScores = units.map(u => u.score);
  const mean =
    rawScores.reduce((s, v) => s + v, 0) / rawScores.length;
  const variance =
    rawScores.reduce((s, v) => s + (v - mean) ** 2, 0) / rawScores.length;
  const std = Math.sqrt(variance) || 1;
  const zScores = rawScores.map(s => (s - mean) / std);

  // Kadane: find best contiguous span in the middle
  const theta = 0.5;
  let bestStart = 0;
  let bestEnd = -1;
  let bestGain = 0;
  let curStart = 0;
  let curGain = 0;
  for (let i = 0; i < units.length; i++) {
    const gain = zScores[i] - theta;
    if (curGain + gain < 0) {
      curStart = i + 1;
      curGain = 0;
    } else {
      curGain += gain;
    }
    if (curGain > bestGain) {
      bestGain = curGain;
      bestStart = curStart;
      bestEnd = i;
    }
  }

  // Select: Kadane span first, then fill by recency
  const selected = new Set<number>();
  let usedTokens = 0;
  if (bestGain > 0) {
    for (let i = bestStart; i <= bestEnd; i++) {
      if (usedTokens + units[i].tokens <= middleBudget) {
        selected.add(i);
        usedTokens += units[i].tokens;
      }
    }
  }

  // Fill remaining budget with most recent unselected units
  for (let i = units.length - 1; i >= 0; i--) {
    if (selected.has(i)) continue;
    if (usedTokens + units[i].tokens <= middleBudget) {
      selected.add(i);
      usedTokens += units[i].tokens;
    }
  }

  // Collect kept middle messages in original order
  const keptMiddle: OpenAIMessage[] = [];
  for (let i = 0; i < units.length; i++) {
    if (selected.has(i)) {
      keptMiddle.push(...units[i].messages);
    }
  }

  const droppedCount = units.length - selected.size;
  return assembleResult(head, keptMiddle, tail, droppedCount);
}

function assembleResult(
  head: OpenAIMessage[],
  middle: OpenAIMessage[],
  tail: OpenAIMessage[],
  droppedCount: number,
): OpenAIMessage[] {
  const result: OpenAIMessage[] = [...head];

  if (droppedCount > 0) {
    result.push({
      role: "system",
      content: `[${droppedCount} earlier messages condensed to fit context window.]`,
    });
  }

  result.push(...middle, ...tail);
  return result;
}
