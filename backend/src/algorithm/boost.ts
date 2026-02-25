// Applies importance boost to turns near changelog events.
//
// Insight:
//   If turn 8 logged a DECISION ("use PostgreSQL"), that turn
//   is semantically important even if its embedding score
//   happens to be low for the current query.
//
//   Similarly, turns immediately adjacent to important events
//   usually contain the reasoning that led to the decision —
//   also valuable context.
//
// Boost structure:
//   - Turn at changelog event: +CHANGELOG_BOOST (default 1.0)
//   - Turn immediately before/after: +CHANGELOG_NEIGHBOR_BOOST (default 0.3)
//
//   Why neighbor boost?
//   Turn 7: "should we use postgres or mysql?"
//   Turn 8: "let's use postgres" ← DECISION logged here
//   Turn 9: "okay, now set up the connection string"
//
//   Turns 7 and 9 provide essential context for turn 8.
//   Without them, the decision exists but lacks meaning.

import type { StoredChangelogEntry } from "../types";
import { config } from "../config";

export interface BoostedScore {
  turnNumber: number;
  zScore: number;
  boost: number;
  boostedScore: number;
}

export function applyChangelogBoost(
  zScores: Array<{ turnNumber: number; zScore: number }>,
  activeChangelog: StoredChangelogEntry[],
): BoostedScore[] {
  // Build a set of turn numbers that have changelog events
  const changelogTurns = new Set(activeChangelog.map((e) => e.turnNumber));

  // Build a set of neighbor turn numbers
  const neighborTurns = new Set<number>();
  for (const turn of changelogTurns) {
    neighborTurns.add(turn - 1);
    neighborTurns.add(turn + 1);
  }

  return zScores.map(({ turnNumber, zScore }) => {
    let boost = 0;

    if (changelogTurns.has(turnNumber)) {
      boost += config.changelogBoost;
    } else if (neighborTurns.has(turnNumber)) {
      boost += config.changelogNeighborBoost;
    }

    return {
      turnNumber,
      zScore,
      boost,
      boostedScore: zScore + boost,
    };
  });
}
