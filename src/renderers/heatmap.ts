import { HeatmapCell } from '../types';
import { bold, green, gray, cyan } from '../utils/colors';

/** Unicode block chars for intensity levels 0-4. */
const BLOCKS = ['·', '░', '▒', '▓', '█'];

/** ANSI green shades for each level. */
const LEVEL_COLORS = [
  (s: string) => gray(s),
  (s: string) => `\x1b[38;5;22m${s}\x1b[39m`,  // dark green
  (s: string) => `\x1b[38;5;28m${s}\x1b[39m`,  // medium green
  (s: string) => `\x1b[38;5;34m${s}\x1b[39m`,  // bright green
  (s: string) => green(s),
];

const DAY_LABELS = ['   ', 'Mon', '   ', 'Wed', '   ', 'Fri', '   '];

/** Build a map from date-string → HeatmapCell for O(1) lookup. */
function buildCellMap(cells: HeatmapCell[]): Map<string, HeatmapCell> {
  return new Map(cells.map(c => [c.date, c]));
}

/** Get the ISO week number and day-of-week for a date string. */
function parseDateStr(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00Z');
}

/** Collect all 52 weeks of Sunday-anchored columns from the cells. */
function buildWeekGrid(cells: HeatmapCell[]): string[][] {
  if (cells.length === 0) return [];

  const cellMap = buildCellMap(cells);
  const sorted  = [...cells].sort((a, b) => a.date.localeCompare(b.date));
  const first   = parseDateStr(sorted[0].date);
  const last    = parseDateStr(sorted[sorted.length - 1].date);

  // Rewind first to Sunday of its week.
  const startDay = new Date(first);
  startDay.setUTCDate(startDay.getUTCDate() - startDay.getUTCDay());

  const weeks: string[][] = [];
  const cursor = new Date(startDay);

  while (cursor <= last || weeks.length < 1) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = cursor.toISOString().slice(0, 10);
      const cell = cellMap.get(iso);
      const level = cell ? cell.level : 0;
      week.push(LEVEL_COLORS[Math.min(level, 4)](BLOCKS[Math.min(level, 4)]));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 53) break;
  }
  return weeks;
}

/** Build month label row aligned to week columns. */
function buildMonthRow(cells: HeatmapCell[], weekCount: number): string {
  const sorted = [...cells].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return ' '.repeat(weekCount * 2);

  const first = parseDateStr(sorted[0].date);
  const startDay = new Date(first);
  startDay.setUTCDate(startDay.getUTCDate() - startDay.getUTCDay());

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels: string[] = Array(weekCount).fill('  ');
  let lastMonth = -1;

  for (let w = 0; w < weekCount; w++) {
    const d = new Date(startDay);
    d.setUTCDate(d.getUTCDate() + w * 7 + 3); // midweek
    if (d.getUTCMonth() !== lastMonth) {
      labels[w] = MONTHS[d.getUTCMonth()];
      lastMonth = d.getUTCMonth();
    }
  }
  return '     ' + labels.map(l => l.padEnd(2)).join('');
}

/**
 * Render a GitHub-style contribution heatmap calendar.
 * @param cells - Heatmap cells for any date range.
 * @returns Formatted terminal string.
 */
export function renderHeatmap(cells: HeatmapCell[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(bold('  Contribution Heatmap'));
  lines.push('');

  if (cells.length === 0) {
    lines.push(gray('  No data available.'));
    lines.push('');
    return lines.join('\n');
  }

  const weeks = buildWeekGrid(cells);
  lines.push(cyan(buildMonthRow(cells, weeks.length)));

  for (let day = 0; day < 7; day++) {
    const label = DAY_LABELS[day];
    const row = weeks.map(w => (w[day] ?? gray(BLOCKS[0])) + ' ').join('');
    lines.push(`  ${gray(label)}  ${row}`);
  }

  const total = cells.reduce((s, c) => s + c.count, 0);
  lines.push('');
  lines.push(`  ${gray(`Total contributions: ${total.toLocaleString()}`)}`);
  lines.push('');
  return lines.join('\n');
}
