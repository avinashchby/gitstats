import { CommitPattern } from '../types';
import { bold, cyan, yellow, gray, green } from '../utils/colors';

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BAR_HEIGHT  = 8;   // rows in the vertical chart
const H_BAR_WIDTH = 20;  // max width for horizontal bars

/** Scale an array to 0-BAR_HEIGHT integer values. */
function scaleToHeight(values: number[], height: number): number[] {
  const max = Math.max(...values, 1);
  return values.map(v => Math.round((v / max) * height));
}

/** Scale an array to 0-H_BAR_WIDTH for horizontal bars. */
function scaleToWidth(values: number[], width: number): number[] {
  const max = Math.max(...values, 1);
  return values.map(v => Math.round((v / max) * width));
}

/** Render a vertical bar chart (columns = time slots, rows = height). */
function verticalBarChart(values: number[], labels: string[], title: string): string {
  const scaled = scaleToHeight(values, BAR_HEIGHT);
  const lines:  string[] = [];

  lines.push(`  ${bold(title)}`);
  lines.push('');

  for (let row = BAR_HEIGHT; row >= 1; row--) {
    const prefix = row === BAR_HEIGHT ? gray(' ▲') : '  ';
    const cells = scaled.map(h => (h >= row ? cyan('█') : ' '));
    lines.push(prefix + ' ' + cells.join(' '));
  }

  // X-axis line
  lines.push('  ' + '─'.repeat(values.length * 2 + 1));

  // Labels (grouped for hours: every 3rd)
  const step = labels.length > 12 ? 3 : 1;
  const labelRow = labels
    .map((l, i) => (i % step === 0 ? l.padEnd(step * 2 - 1) : ''))
    .join('');
  lines.push('  ' + gray(labelRow));
  lines.push('');
  return lines.join('\n');
}

/** Render a horizontal bar chart for daily counts. */
function horizontalBarChart(values: number[], labels: string[], title: string): string {
  const scaled = scaleToWidth(values, H_BAR_WIDTH);
  const max = Math.max(...values, 1);
  const lines: string[] = [];

  lines.push(`  ${bold(title)}`);
  lines.push('');

  for (let i = 0; i < labels.length; i++) {
    const bar   = yellow('█').repeat(scaled[i]) + gray('░').repeat(H_BAR_WIDTH - scaled[i]);
    const count = gray(String(values[i]).padStart(5));
    lines.push(`  ${labels[i]}  ${bar} ${count}`);
  }

  lines.push('');
  lines.push(gray(`  Peak: ${max} commits`));
  lines.push('');
  return lines.join('\n');
}

/** Build hour labels "0" .. "23". */
function hourLabels(): string[] {
  return Array.from({ length: 24 }, (_, i) => String(i));
}

/**
 * Render hourly and daily commit pattern charts.
 * @param patterns - Hourly (24) and daily (7) commit counts.
 * @returns Formatted terminal string.
 */
export function renderPatterns(patterns: CommitPattern): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('  Commit Patterns'));
  lines.push('');

  lines.push(verticalBarChart(patterns.hourly, hourLabels(), 'Commits by Hour of Day'));
  lines.push(horizontalBarChart(patterns.daily, DAY_NAMES, 'Commits by Day of Week'));

  return lines.join('\n');
}
