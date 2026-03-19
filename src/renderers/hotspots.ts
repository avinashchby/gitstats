import Table from 'cli-table3';
import { FileHotspot } from '../types';
import { bold, red, yellow, cyan, gray, green } from '../utils/colors';

const DEFAULT_LIMIT = 20;
const BAR_MAX_WIDTH = 12;

/** Format a Date as YYYY-MM-DD. */
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build a bar of █ blocks scaled to the max value. */
function buildBar(value: number, max: number): string {
  const filled = max > 0 ? Math.round((value / max) * BAR_MAX_WIDTH) : 0;
  const bar = '█'.repeat(filled) + '░'.repeat(BAR_MAX_WIDTH - filled);
  if (filled >= BAR_MAX_WIDTH * 0.75) return red(bar);
  if (filled >= BAR_MAX_WIDTH * 0.4)  return yellow(bar);
  return green(bar);
}

/** Shorten long paths by keeping the last N segments. */
function shortenPath(p: string, maxLen = 45): string {
  if (p.length <= maxLen) return p;
  const parts = p.split('/');
  let result = p;
  while (result.length > maxLen && parts.length > 2) {
    parts.splice(0, 1);
    result = '…/' + parts.join('/');
  }
  return result.slice(0, maxLen);
}

/**
 * Render a hotspot table showing the most-changed files.
 * @param hotspots - File hotspot array, expected pre-sorted by changeCount desc.
 * @param limit    - Max rows to display (default 20).
 * @returns Formatted terminal string.
 */
export function renderHotspots(hotspots: FileHotspot[], limit = DEFAULT_LIMIT): string {
  const lines: string[] = [];
  const data = hotspots.slice(0, limit);

  lines.push('');
  lines.push(bold(`  Code Hotspots  ${gray(`(top ${data.length} files)`)}`));
  lines.push('');

  if (data.length === 0) {
    lines.push(gray('  No hotspot data available.'));
    lines.push('');
    return lines.join('\n');
  }

  const maxChanges = data[0]?.changeCount ?? 1;

  const table = new Table({
    head: [
      bold('File'),
      bold('Changes'),
      bold('Bar'),
      bold('Authors'),
      bold('Churn'),
      bold('Last Changed'),
    ],
    style: { head: [], border: [] },
    colAligns: ['left', 'right', 'left', 'right', 'right', 'left'],
  });

  for (const h of data) {
    table.push([
      cyan(shortenPath(h.path)),
      yellow(String(h.changeCount)),
      buildBar(h.changeCount, maxChanges),
      String(h.authors),
      gray(h.totalChurn.toLocaleString()),
      gray(fmtDate(h.lastChanged)),
    ]);
  }

  lines.push(table.toString());
  lines.push('');
  return lines.join('\n');
}
