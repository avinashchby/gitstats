import type { GitCommit, MergeStats } from "../types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Returns true when the commit message indicates a merge commit. */
function isMerge(commit: GitCommit): boolean {
  return commit.message.trimStart().toLowerCase().startsWith("merge");
}

/** Computes days between two dates, floored to a non-negative integer. */
function daysBetween(earlier: Date, later: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY));
}

/**
 * Estimates the days a branch was open before each merge commit.
 * Strategy: find the nearest preceding non-merge commit and use the gap.
 * Falls back to 0 when no preceding commit exists.
 */
function estimateOpenDays(mergeCommit: GitCommit, allCommits: GitCommit[]): number {
  const mergeTime = mergeCommit.date.getTime();

  // Find the most-recent non-merge commit that predates this merge
  let best: GitCommit | undefined;
  for (const c of allCommits) {
    if (isMerge(c)) continue;
    if (c.date.getTime() >= mergeTime) continue;
    if (!best || c.date.getTime() > best.date.getTime()) best = c;
  }

  return best ? daysBetween(best.date, mergeCommit.date) : 0;
}

/** Derives merge frequency from total merges and the overall commit date span. */
function mergeFrequency(mergeCount: number, commits: GitCommit[]): number {
  if (mergeCount === 0 || commits.length < 2) return 0;

  const times = commits.map((c) => c.date.getTime());
  const spanMs = Math.max(...times) - Math.min(...times);
  const spanWeeks = spanMs / (MS_PER_DAY * 7);

  return spanWeeks > 0 ? Math.round((mergeCount / spanWeeks) * 10) / 10 : 0;
}

/**
 * Analyses merge commit statistics including frequency and estimated branch lifetime.
 * Merge commits are identified by messages that start with "Merge".
 * Branch lifetime is approximated as the gap to the nearest preceding non-merge commit.
 */
export function analyzeMerges(commits: GitCommit[]): MergeStats {
  const empty: MergeStats = {
    totalMerges: 0,
    averageDaysToMerge: 0,
    mergeFrequencyPerWeek: 0,
    longestOpenDays: 0,
    shortestOpenDays: 0,
  };

  if (commits.length === 0) return empty;

  const mergeCommits = commits.filter(isMerge);
  if (mergeCommits.length === 0) return empty;

  const openDays = mergeCommits.map((m) => estimateOpenDays(m, commits));
  const total = openDays.reduce((sum, d) => sum + d, 0);

  return {
    totalMerges: mergeCommits.length,
    averageDaysToMerge: Math.round(total / openDays.length),
    mergeFrequencyPerWeek: mergeFrequency(mergeCommits.length, commits),
    longestOpenDays: Math.max(...openDays),
    shortestOpenDays: Math.min(...openDays),
  };
}
