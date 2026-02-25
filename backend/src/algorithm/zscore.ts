// Z-score normalization of similarity scores.
//
// Problem without normalization:
//   Raw cosine similarity scores range from -1 to 1.
//   For a given query, ALL scores might be between 0.82 and 0.89.
//   The difference between 0.82 and 0.89 looks small but represents
//   the ENTIRE range of relevance for this query.
//
// Z-score transformation:
//   new_score = (raw_score - mean) / std_deviation
//
//   This converts scores to "how many standard deviations above
//   or below average is this turn?"
//
//   A z-score of +1.5 means: 1.5 std devs above average = very relevant
//   A z-score of -0.5 means: 0.5 std devs below average = below average
//
// Result:
//   The distribution of scores is now meaningful regardless of the
//   absolute similarity values. This makes the gain threshold in
//   Kadane's algorithm work consistently across different queries.

export interface RawScore {
  turnNumber: number;
  score: number;
}

export interface NormalizedScore extends RawScore {
  zScore: number;
}

export function zScoreNormalize(scores: RawScore[]): NormalizedScore[] {
  if (scores.length === 0) return [];

  // Can't normalize a single score — return z=0 for all
  if (scores.length === 1) {
    return [{ ...scores[0], zScore: 0 }];
  }

  // Calculate mean
  const mean = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

  // Calculate standard deviation
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s.score - mean, 2), 0) /
    scores.length;

  const stdDev = Math.sqrt(variance);

  // Avoid division by zero when all scores are identical
  if (stdDev === 0) {
    return scores.map((s) => ({ ...s, zScore: 0 }));
  }

  return scores.map((s) => ({
    ...s,
    zScore: (s.score - mean) / stdDev,
  }));
}
