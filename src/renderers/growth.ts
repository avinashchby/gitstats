import { GrowthPoint } from '../types';
import { bold, green, red, gray, cyan, yellow } from '../utils/colors';

const CHART_WIDTH  = 60;
const CHART_HEIGHT = 12;

/** Format a large number compactly: 1200 → "1.2k". */
function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Sample the growth points down to at most `maxPoints` evenly. */
function samplePoints(points: GrowthPoint[], maxPoints: number): GrowthPoint[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => points[Math.round(i * step)]);
}

/** Build the Y-axis labels and scale. */
function buildYAxis(min: number, max: number): { labels: string[]; scale: (v: number) => number } {
  const labels = Array.from({ length: CHART_HEIGHT + 1 }, (_, i) => {
    const v = max - (i / CHART_HEIGHT) * (max - min);
    return fmtCompact(Math.round(v)).padStart(6);
  });
  const scale = (v: number) => {
    if (max === min) return 0;
    return Math.round(((v - min) / (max - min)) * CHART_HEIGHT);
  };
  return { labels, scale };
}

/** Build the pixel grid (row 0 = top). */
function buildGrid(scaledValues: number[]): boolean[][] {
  const grid: boolean[][] = Array.from(
    { length: CHART_HEIGHT + 1 },
    () => Array(scaledValues.length).fill(false),
  );
  for (let col = 0; col < scaledValues.length; col++) {
    const row = CHART_HEIGHT - scaledValues[col];
    // Fill from row downward so bars connect to x-axis
    for (let r = row; r <= CHART_HEIGHT; r++) {
      grid[r][col] = true;
    }
  }
  return grid;
}

/** Build X-axis date labels (show every Nth). */
function buildXLabels(points: GrowthPoint[], count: number): string {
  const step  = Math.max(1, Math.floor(count / 6));
  const parts = Array.from({ length: count }, (_, i) => {
    if (i % step === 0 && points[i]) return points[i].date.slice(0, 7).padEnd(step);
    return ' '.repeat(step > 1 && i % step === 0 ? 7 : 1);
  });
  return '       ' + parts.join('');
}

/**
 * Render an ASCII area chart of repository line growth over time.
 * @param points - Growth data points, expected sorted by date asc.
 * @returns Formatted terminal string.
 */
export function renderGrowth(points: GrowthPoint[]): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(bold('  Repository Growth'));
  lines.push('');

  if (points.length < 2) {
    lines.push(gray('  Not enough data to render growth chart.'));
    lines.push('');
    return lines.join('\n');
  }

  const sampled = samplePoints(points, CHART_WIDTH);
  const values  = sampled.map(p => p.totalLines);
  const min     = Math.min(...values);
  const max     = Math.max(...values);

  const { labels, scale } = buildYAxis(min, max);
  const scaledValues = values.map(scale);
  const grid = buildGrid(scaledValues);

  for (let row = 0; row <= CHART_HEIGHT; row++) {
    const yLabel = labels[row];
    const rowCells = grid[row].map(filled => (filled ? cyan('█') : ' ')).join('');
    const axis = row === CHART_HEIGHT ? '└' : '│';
    lines.push(`${gray(yLabel)} ${gray(axis)} ${rowCells}`);
  }

  // X axis line
  lines.push(`       ${gray('└' + '─'.repeat(sampled.length + 1))}`);
  lines.push(gray(buildXLabels(sampled, sampled.length)));
  lines.push('');

  // Net change summary
  const first = points[0];
  const last  = points[points.length - 1];
  const delta = last.totalLines - first.totalLines;
  const deltaStr = delta >= 0
    ? green(`+${fmtCompact(delta)} lines`)
    : red(`${fmtCompact(delta)} lines`);

  lines.push(
    `  ${gray(`From ${first.date} to ${last.date}:`)} ${deltaStr}  ` +
    `${yellow(`Peak: ${fmtCompact(max)} lines`)}`
  );
  lines.push('');
  return lines.join('\n');
}
