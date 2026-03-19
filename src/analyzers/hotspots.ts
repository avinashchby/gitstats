import type { GitCommit, FileHotspot } from "../types";

interface FileAccumulator {
  changeCount: number;
  authors: Set<string>;
  totalChurn: number;
  lastChanged: Date;
}

/** Merges a single commit's file changes into the accumulator map. */
function accumulateFile(
  map: Map<string, FileAccumulator>,
  path: string,
  additions: number,
  deletions: number,
  author: string,
  date: Date,
): void {
  const existing = map.get(path);
  if (!existing) {
    map.set(path, {
      changeCount: 1,
      authors: new Set([author]),
      totalChurn: additions + deletions,
      lastChanged: date,
    });
  } else {
    existing.changeCount += 1;
    existing.authors.add(author);
    existing.totalChurn += additions + deletions;
    if (date > existing.lastChanged) existing.lastChanged = date;
  }
}

/**
 * Identifies the most frequently changed files (code churn analysis).
 * Counts unique authors per file, total churn (additions + deletions),
 * and the date of the most recent change.
 * Results are sorted by changeCount descending.
 */
export function analyzeHotspots(commits: GitCommit[]): FileHotspot[] {
  if (commits.length === 0) return [];

  const map = new Map<string, FileAccumulator>();

  for (const commit of commits) {
    for (const file of commit.files) {
      accumulateFile(
        map,
        file.path,
        file.additions,
        file.deletions,
        commit.email.toLowerCase(),
        commit.date,
      );
    }
  }

  return Array.from(map.entries())
    .map(([path, acc]) => ({
      path,
      changeCount: acc.changeCount,
      authors: acc.authors.size,
      totalChurn: acc.totalChurn,
      lastChanged: acc.lastChanged,
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}
