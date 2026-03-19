import type { GitCommit, CommitPattern } from "../types";

/** Creates a zeroed array of the given length. */
function zeros(length: number): number[] {
  return Array.from({ length }, () => 0);
}

/**
 * Counts commits by hour of day (0–23) and day of week (0=Sunday, 6=Saturday).
 * Useful for visualising when contributors are most active.
 */
export function analyzePatterns(commits: GitCommit[]): CommitPattern {
  const hourly = zeros(24);
  const daily = zeros(7);

  for (const commit of commits) {
    const hour = commit.date.getHours();
    const day = commit.date.getDay();
    hourly[hour] += 1;
    daily[day] += 1;
  }

  return { hourly, daily };
}
