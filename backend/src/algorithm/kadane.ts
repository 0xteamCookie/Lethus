// Selects the best contiguous span(s) of turns to include.
//
// Why Kadane's algorithm?
//   Standard RAG picks the top-K individual chunks.
//   This breaks reasoning continuity.
//
//   Example: if turns 8, 10, 12 score highly, picking them
//   individually gives you three isolated snippets.
//   But turn 9 might be the crucial "therefore" that connects
//   8 and 10 into a coherent argument.
//
//   Kadane's maximum subarray algorithm finds the contiguous
//   span with the highest total "gain." Including turn 9 (with
//   a low but positive gain) is worth it if it connects 8 and 10.
//
// How Kadane's works:
//   Input: array of "gain" values (one per turn)
//   Output: the subarray with maximum total gain
//
//   gain = boostedScore - theta
//   theta (default 1.0) is the "cost" of including a turn.
//   A turn is worth including if its boostedScore > theta.
//
//   This creates a natural inclusion criterion:
//   - High relevance turns: boostedScore >> theta → always include
//   - Low relevance turns: boostedScore << theta → skip unless
//     they bridge two high-relevance spans
//
// Multi-span variant:
//   Standard Kadane's finds one subarray.
//   We extend it to find multiple non-overlapping spans
//   by running it repeatedly, zeroing out found spans.
//   Max 3 spans (more fragments than 3 becomes incoherent).

import { config } from "../config";

export interface KadaneSpan {
  startTurn: number;
  endTurn: number;
  totalGain: number;
  turnNumbers: number[];
}

// ── Single-span Kadane's ──────────────────────────────────────
function findBestSpan(
  gainByTurnNumber: Map<number, number>,
  allTurnNumbers: number[],
): KadaneSpan | null {
  if (allTurnNumbers.length === 0) return null;

  let bestStart = 0;
  let bestEnd = 0;
  let bestGain = -Infinity;

  let currentStart = 0;
  let currentGain = 0;

  for (let i = 0; i < allTurnNumbers.length; i++) {
    const turnNumber = allTurnNumbers[i];
    const gain = gainByTurnNumber.get(turnNumber) ?? -config.kadaneTheta;

    if (currentGain + gain < 0) {
      // Starting fresh is better than extending
      currentStart = i + 1;
      currentGain = 0;
    } else {
      currentGain += gain;
    }

    if (currentGain > bestGain) {
      bestGain = currentGain;
      bestStart = currentStart;
      bestEnd = i;
    }
  }

  if (bestGain <= 0) return null; // No positive span found

  const selectedTurns = allTurnNumbers.slice(bestStart, bestEnd + 1);

  return {
    startTurn: allTurnNumbers[bestStart],
    endTurn: allTurnNumbers[bestEnd],
    totalGain: bestGain,
    turnNumbers: selectedTurns,
  };
}

// ── Multi-span Kadane's ───────────────────────────────────────
export function findBestSpans(
  boostedScores: Array<{ turnNumber: number; boostedScore: number }>,
  maxSpans: number = 3,
): KadaneSpan[] {
  if (boostedScores.length === 0) return [];

  // Convert boostedScore to gain by subtracting theta
  // gain > 0: worth including; gain < 0: not worth including
  const gainByTurnNumber = new Map<number, number>(
    boostedScores.map(({ turnNumber, boostedScore }) => [
      turnNumber,
      boostedScore - config.kadaneTheta,
    ]),
  );

  // Sort turn numbers for contiguous span detection
  const sortedTurnNumbers = boostedScores
    .map((s) => s.turnNumber)
    .sort((a, b) => a - b);

  const spans: KadaneSpan[] = [];

  // Working copy of gains — we zero out found spans
  const workingGains = new Map(gainByTurnNumber);

  for (let spanIndex = 0; spanIndex < maxSpans; spanIndex++) {
    const span = findBestSpan(workingGains, sortedTurnNumbers);

    if (!span) break; // No more positive spans

    spans.push(span);

    // Zero out this span so next iteration finds a different one
    for (const turnNumber of span.turnNumbers) {
      workingGains.set(turnNumber, -Infinity);
    }
  }

  // Sort spans chronologically for readability
  return spans.sort((a, b) => a.startTurn - b.startTurn);
}
