import type { GitCommit, AuthorStats } from "../types";

/** Formats a date as YYYY-MM-DD for day-level deduplication. */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Aggregates per-author commit statistics from a list of commits.
 * Counts unique active days, total lines added/removed, and commit range.
 * Returns results sorted by commit count descending.
 */
export function analyzeAuthors(commits: GitCommit[]): AuthorStats[] {
  if (commits.length === 0) return [];

  const map = new Map<string, {
    name: string;
    email: string;
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    activeDays: Set<string>;
    firstCommit: Date;
    lastCommit: Date;
  }>();

  for (const commit of commits) {
    const key = commit.email.toLowerCase();
    const existing = map.get(key);
    const dayKey = toDateKey(commit.date);

    if (!existing) {
      map.set(key, {
        name: commit.author,
        email: commit.email,
        commits: 1,
        linesAdded: commit.insertions,
        linesRemoved: commit.deletions,
        activeDays: new Set([dayKey]),
        firstCommit: commit.date,
        lastCommit: commit.date,
      });
    } else {
      existing.commits += 1;
      existing.linesAdded += commit.insertions;
      existing.linesRemoved += commit.deletions;
      existing.activeDays.add(dayKey);
      if (commit.date < existing.firstCommit) existing.firstCommit = commit.date;
      if (commit.date > existing.lastCommit) existing.lastCommit = commit.date;
    }
  }

  return Array.from(map.values())
    .map((entry) => ({
      name: entry.name,
      email: entry.email,
      commits: entry.commits,
      linesAdded: entry.linesAdded,
      linesRemoved: entry.linesRemoved,
      activeDays: entry.activeDays.size,
      firstCommit: entry.firstCommit,
      lastCommit: entry.lastCommit,
    }))
    .sort((a, b) => b.commits - a.commits);
}
