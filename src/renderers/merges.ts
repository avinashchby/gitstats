import { MergeStats } from '../types';
import { bold, cyan, yellow, green, gray, red } from '../utils/colors';

/** Format a decimal number to one decimal place. */
function fmt1(n: number): string {
  return n.toFixed(1);
}

/** Draw a simple labeled key-value row. */
function row(label: string, value: string, note = ''): string {
  const noteStr = note ? `  ${gray(note)}` : '';
  return `  ${gray(label.padEnd(28))}${value}${noteStr}`;
}

/** Color-code the average days to merge. */
function colorDays(days: number): string {
  if (days <= 1)  return green(fmt1(days) + ' days');
  if (days <= 7)  return yellow(fmt1(days) + ' days');
  return red(fmt1(days) + ' days');
}

/** Render a horizontal divider. */
function divider(width = 50): string {
  return `  ${gray('─'.repeat(width))}`;
}

/**
 * Render a summary box of merge/PR statistics.
 * @param stats - Aggregate merge statistics.
 * @returns Formatted terminal string.
 */
export function renderMerges(stats: MergeStats): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('  Merge Statistics'));
  lines.push(divider());
  lines.push('');

  lines.push(row('Total merges:', cyan(String(stats.totalMerges))));
  lines.push(row(
    'Merge frequency:',
    yellow(`${fmt1(stats.mergeFrequencyPerWeek)} / week`),
    stats.mergeFrequencyPerWeek >= 1 ? 'healthy cadence' : 'low activity',
  ));
  lines.push('');

  lines.push(row('Avg. time to merge:', colorDays(stats.averageDaysToMerge)));
  lines.push(row(
    'Fastest merge:',
    green(`${fmt1(stats.shortestOpenDays)} day${stats.shortestOpenDays === 1 ? '' : 's'}`),
  ));
  lines.push(row(
    'Longest open:',
    red(`${fmt1(stats.longestOpenDays)} day${stats.longestOpenDays === 1 ? '' : 's'}`),
  ));
  lines.push('');

  lines.push(divider());

  // Quick health badge
  let health: string;
  if (stats.averageDaysToMerge <= 2 && stats.mergeFrequencyPerWeek >= 2) {
    health = green('● Excellent merge health');
  } else if (stats.averageDaysToMerge <= 7) {
    health = yellow('● Moderate merge health');
  } else {
    health = red('● Slow merge cadence — consider reviewing review process');
  }
  lines.push(`  ${health}`);
  lines.push('');

  return lines.join('\n');
}
