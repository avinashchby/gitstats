import type { GitCommit, BusFactorEntry } from "../types";

/** Extracts the top-level directory from a file path, or "." for root files. */
function dirOf(filePath: string): string {
  const slash = filePath.indexOf("/");
  return slash === -1 ? "." : filePath.slice(0, slash);
}

interface AuthorChurn {
  name: string;
  churn: number;
}

/** Accumulates per-directory, per-author churn totals. */
function buildDirAuthorMap(
  commits: GitCommit[],
): Map<string, Map<string, AuthorChurn>> {
  const dirMap = new Map<string, Map<string, AuthorChurn>>();

  for (const commit of commits) {
    for (const file of commit.files) {
      const dir = dirOf(file.path);
      const churn = file.additions + file.deletions;
      const authorKey = commit.email.toLowerCase();

      if (!dirMap.has(dir)) dirMap.set(dir, new Map());
      const authorMap = dirMap.get(dir)!;

      const existing = authorMap.get(authorKey);
      if (!existing) {
        authorMap.set(authorKey, { name: commit.author, churn });
      } else {
        existing.churn += churn;
      }
    }
  }

  return dirMap;
}

/** Computes BusFactorEntry for one directory from its author-churn map. */
function computeEntry(
  dir: string,
  authorMap: Map<string, AuthorChurn>,
): BusFactorEntry {
  const authors = Array.from(authorMap.values());
  const total = authors.reduce((sum, a) => sum + a.churn, 0);

  const withPercent = authors
    .map((a) => ({
      name: a.name,
      percentage: total === 0 ? 0 : Math.round((a.churn / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const busFactor = withPercent.filter((a) => a.percentage > 10).length;

  return {
    path: dir,
    busFactor: Math.max(busFactor, 1),
    topContributors: withPercent.slice(0, 5),
  };
}

/**
 * Calculates the bus factor per top-level directory.
 * Bus factor = number of authors who contributed >10% of changes in that area.
 * Returns entries sorted by busFactor ascending (most at-risk first).
 */
export function analyzeBusFactor(commits: GitCommit[]): BusFactorEntry[] {
  if (commits.length === 0) return [];

  const dirMap = buildDirAuthorMap(commits);

  return Array.from(dirMap.entries())
    .map(([dir, authorMap]) => computeEntry(dir, authorMap))
    .sort((a, b) => a.busFactor - b.busFactor);
}
