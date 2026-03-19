import type { GitCommit, GrowthPoint } from "../types";

/** Formats a Date as YYYY-MM for month-level bucketing. */
function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Sorts month key strings chronologically. */
function compareMonthKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

interface MonthBucket {
  added: number;
  removed: number;
}

/** Aggregates insertions and deletions into monthly buckets. */
function bucketByMonth(commits: GitCommit[]): Map<string, MonthBucket> {
  const buckets = new Map<string, MonthBucket>();

  for (const commit of commits) {
    const key = toMonthKey(commit.date);
    const bucket = buckets.get(key) ?? { added: 0, removed: 0 };
    bucket.added += commit.insertions;
    bucket.removed += commit.deletions;
    buckets.set(key, bucket);
  }

  return buckets;
}

/**
 * Groups commits by calendar month and calculates cumulative net lines over time.
 * Each GrowthPoint represents one month with its delta and running total.
 * Useful for rendering an ASCII growth chart.
 */
export function analyzeGrowth(commits: GitCommit[]): GrowthPoint[] {
  if (commits.length === 0) return [];

  const buckets = bucketByMonth(commits);
  const sortedKeys = Array.from(buckets.keys()).sort(compareMonthKeys);

  let cumulativeLines = 0;
  return sortedKeys.map((key) => {
    const { added, removed } = buckets.get(key)!;
    cumulativeLines += added - removed;
    return {
      date: key,
      totalLines: Math.max(cumulativeLines, 0),
      added,
      removed,
    };
  });
}
