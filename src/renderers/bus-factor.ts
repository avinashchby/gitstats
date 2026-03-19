import Table from 'cli-table3';
import { BusFactorEntry } from '../types';
import { bold, red, yellow, green, cyan, gray } from '../utils/colors';

const MINI_BAR_WIDTH = 10;

/** Color the bus-factor number: 1=red (danger), 2=yellow (caution), 3+=green. */
function colorBusFactor(n: number): string {
  if (n <= 1) return red(bold(String(n)));
  if (n === 2) return yellow(bold(String(n)));
  return green(bold(String(n)));
}

/** Render a small inline bar for a contributor percentage. */
function miniBar(pct: number): string {
  const filled = Math.round((pct / 100) * MINI_BAR_WIDTH);
  const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, MINI_BAR_WIDTH - filled));
  if (pct >= 80) return red(bar);
  if (pct >= 50) return yellow(bar);
  return green(bar);
}

/** Format contributors as "Name (pct%) ████░░" lines. */
function formatContributors(contributors: { name: string; percentage: number }[]): string {
  return contributors
    .slice(0, 3)
    .map(c => `${c.name} ${gray(`(${c.percentage.toFixed(0)}%)`)} ${miniBar(c.percentage)}`)
    .join('\n');
}

/** Shorten long directory paths. */
function shortenPath(p: string, maxLen = 40): string {
  if (p.length <= maxLen) return p;
  return '…' + p.slice(p.length - maxLen + 1);
}

/**
 * Render the bus-factor table per directory/file.
 * @param entries - Bus factor entries, expected pre-sorted by busFactor asc (riskiest first).
 * @returns Formatted terminal string.
 */
export function renderBusFactor(entries: BusFactorEntry[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('  Bus Factor Analysis'));
  lines.push(`  ${gray('Bus factor = minimum contributors whose loss would halt progress.')}`);
  lines.push('');

  if (entries.length === 0) {
    lines.push(gray('  No bus factor data available.'));
    lines.push('');
    return lines.join('\n');
  }

  const table = new Table({
    head: [bold('Directory / File'), bold('Bus Factor'), bold('Top Contributors')],
    style: { head: [], border: [] },
    colAligns: ['left', 'center', 'left'],
    colWidths: [42, 14, 50],
    wordWrap: true,
  });

  for (const e of entries) {
    table.push([
      cyan(shortenPath(e.path)),
      colorBusFactor(e.busFactor),
      formatContributors(e.topContributors),
    ]);
  }

  lines.push(table.toString());

  // Summary counts
  const danger  = entries.filter(e => e.busFactor <= 1).length;
  const caution = entries.filter(e => e.busFactor === 2).length;
  const safe    = entries.filter(e => e.busFactor >= 3).length;
  lines.push('');
  lines.push(
    `  ${red(`■ Danger (1): ${danger}`)}  ` +
    `${yellow(`■ Caution (2): ${caution}`)}  ` +
    `${green(`■ Safe (3+): ${safe}`)}`
  );
  lines.push('');
  return lines.join('\n');
}
