// Trims selected turns to fit within the token budget.
//
// The retrieval budget is separate from the full context window.
// We budget only the retrieved history portion, leaving room for:
//   - The system prompt
//   - State document (~350 tokens)
//   - Current user message
//   - Recent turns (always included)
//   - Model's response tokens
//
// Approach:
//   1. Always include recent N turns (they're always relevant)
//   2. Fill remaining budget with Kadane-selected turns
//      in order of priority (gain score)
//   3. Stop when budget would be exceeded

import { config } from "../config";
import type { StoredTurn } from "../types";

export interface BudgetResult {
  includedTurns: StoredTurn[];
  totalTokens: number;
  excludedTurnsCount: number;
}

export function applyTokenBudget(
  candidateTurns: StoredTurn[],
  recentTurns: StoredTurn[],
  prioritizedTurnNumbers: number[], // In priority order from Kadane
  budget: number = config.retrievalTokenBudget,
): BudgetResult {
  // Start with recent turns — always included
  const included = new Map<number, StoredTurn>();
  let usedTokens = 0;

  // Add recent turns first
  for (const turn of recentTurns) {
    if (!included.has(turn.turnNumber)) {
      included.set(turn.turnNumber, turn);
      usedTokens += turn.tokenCount;
    }
  }

  // Build a map of all candidate turns by turn number for fast lookup
  const candidateMap = new Map<number, StoredTurn[]>();
  for (const turn of candidateTurns) {
    const existing = candidateMap.get(turn.turnNumber) ?? [];
    existing.push(turn);
    candidateMap.set(turn.turnNumber, existing);
  }

  // Add Kadane-selected turns within budget
  for (const turnNumber of prioritizedTurnNumbers) {
    if (included.has(turnNumber)) continue; // Already included as recent

    const turns = candidateMap.get(turnNumber);
    if (!turns) continue;

    // Calculate tokens for both user and assistant sides of this turn
    const turnsTokens = turns.reduce((sum, t) => sum + t.tokenCount, 0);

    if (usedTokens + turnsTokens > budget) {
      // Skip this turn — would exceed budget
      // Don't break: there might be a smaller turn that fits
      continue;
    }

    for (const turn of turns) {
      included.set(
        `${turn.turnNumber}_${turn.role}` as unknown as number,
        turn,
      );
    }
    usedTokens += turnsTokens;
  }

  // Convert to sorted array
  const includedArray = Array.from(new Set([...included.values()])).sort(
    (a, b) =>
      a.turnNumber !== b.turnNumber
        ? a.turnNumber - b.turnNumber
        : a.role.localeCompare(b.role),
  );

  const allCandidateTurnNumbers = new Set(
    candidateTurns.map((t) => t.turnNumber),
  );
  const includedTurnNumbers = new Set(includedArray.map((t) => t.turnNumber));

  return {
    includedTurns: includedArray,
    totalTokens: usedTokens,
    excludedTurnsCount: allCandidateTurnNumbers.size - includedTurnNumbers.size,
  };
}
