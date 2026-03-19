import Table from 'cli-table3';
import { AuthorStats } from '../types';
import { bold, green, red, cyan, gray, yellow } from '../utils/colors';

/** Format a Date as YYYY-MM-DD. */
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Format large numbers with commas. */
function fmtNum(n: number): string {
  return n.toLocaleString();
}

/** Build the totals summary line above the table. */
function buildHeader(stats: AuthorStats[]): string {
  const totalCommits  = stats.reduce((s, a) => s + a.commits, 0);
  const totalAdded    = stats.reduce((s, a) => s + a.linesAdded, 0);
  const totalRemoved  = stats.reduce((s, a) => s + a.linesRemoved, 0);

  const parts = [
    bold(cyan(`Authors: ${stats.length}`)),
    bold(green(`+${fmtNum(totalAdded)}`)),
    bold(red(`-${fmtNum(totalRemoved)}`)),
    gray(`${fmtNum(totalCommits)} commits total`),
  ];
  return parts.join('  ');
}

/**
 * Render a table of author contribution statistics.
 * @param stats - Array of per-author stats, expected pre-sorted by commits desc.
 * @returns Formatted terminal string.
 */
export function renderAuthors(stats: AuthorStats[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('  Author Statistics'));
  lines.push(`  ${buildHeader(stats)}`);
  lines.push('');

  const table = new Table({
    head: [
      bold('Author'),
      bold('Commits'),
      bold(green('Added')),
      bold(red('Removed')),
      bold('Active Days'),
      bold('First Commit'),
      bold('Last Commit'),
    ],
    style: { head: [], border: [] },
    colAligns: ['left', 'right', 'right', 'right', 'right', 'left', 'left'],
  });

  for (const a of stats) {
    table.push([
      yellow(a.name),
      fmtNum(a.commits),
      green(`+${fmtNum(a.linesAdded)}`),
      red(`-${fmtNum(a.linesRemoved)}`),
      String(a.activeDays),
      gray(fmtDate(a.firstCommit)),
      gray(fmtDate(a.lastCommit)),
    ]);
  }

  lines.push(table.toString());
  lines.push('');
  return lines.join('\n');
}
