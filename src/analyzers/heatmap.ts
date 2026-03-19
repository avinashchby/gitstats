import type { GitCommit, HeatmapCell } from "../types";

const WEEKS = 52;
const DAYS_PER_WEEK = 7;
const TOTAL_DAYS = WEEKS * DAYS_PER_WEEK;

/** Formats a Date as YYYY-MM-DD. */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes the start date for the calendar window.
 * Aligns to the most recent Sunday so the grid starts on a week boundary.
 */
function getWindowStart(today: Date): Date {
  const start = new Date(today);
  start.setDate(start.getDate() - TOTAL_DAYS + 1);
  // Align backward to Sunday
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** Assigns an intensity level 0-4 based on count relative to the max. */
function toLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Builds a GitHub-style contribution calendar for the last 52 weeks.
 * Each day gets a commit count and an intensity level from 0 (none) to 4 (high).
 */
export function analyzeHeatmap(commits: GitCommit[]): HeatmapCell[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = getWindowStart(today);

  // Count commits per day
  const countByDay = new Map<string, number>();
  for (const commit of commits) {
    const key = toDateKey(commit.date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  // Build ordered cells covering the full window
  const cells: HeatmapCell[] = [];
  const cursor = new Date(windowStart);

  while (cursor <= today) {
    const key = toDateKey(cursor);
    cells.push({ date: key, count: countByDay.get(key) ?? 0, level: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Assign levels relative to the busiest day
  const max = Math.max(...cells.map((c) => c.count), 0);
  for (const cell of cells) {
    cell.level = toLevel(cell.count, max);
  }

  return cells;
}
