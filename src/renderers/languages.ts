import Table from 'cli-table3';
import { LanguageEntry } from '../types';
import { bold, cyan, gray, green, yellow, magenta, red, blue, white } from '../utils/colors';

const BAR_WIDTH = 20;

/** Cycle of color functions for different languages. */
const LANG_COLORS = [cyan, green, yellow, magenta, red, blue, white];

/** Render a percentage bar using filled and empty blocks. */
function pctBar(pct: number, colorFn: (s: string) => string): string {
  const filled = Math.max(0, Math.round((pct / 100) * BAR_WIDTH));
  const empty  = Math.max(0, BAR_WIDTH - filled);
  return colorFn('█'.repeat(filled)) + gray('░'.repeat(empty));
}

/**
 * Render a language breakdown table.
 * @param entries - Language entries, expected sorted by lines desc.
 * @returns Formatted terminal string.
 */
export function renderLanguages(entries: LanguageEntry[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('  Language Breakdown'));
  lines.push('');

  if (entries.length === 0) {
    lines.push(gray('  No language data available.'));
    lines.push('');
    return lines.join('\n');
  }

  const totalFiles = entries.reduce((s, e) => s + e.files, 0);
  const totalLines = entries.reduce((s, e) => s + e.lines, 0);
  lines.push(
    `  ${gray(`${entries.length} languages  ·  ` +
    `${totalFiles.toLocaleString()} files  ·  ` +
    `${totalLines.toLocaleString()} lines`)}`
  );
  lines.push('');

  const table = new Table({
    head: [
      bold('Language'),
      bold('Ext'),
      bold('Files'),
      bold('Lines'),
      bold('Share'),
      bold('Bar'),
    ],
    style: { head: [], border: [] },
    colAligns: ['left', 'left', 'right', 'right', 'right', 'left'],
  });

  for (let i = 0; i < entries.length; i++) {
    const e       = entries[i];
    const colorFn = LANG_COLORS[i % LANG_COLORS.length];
    table.push([
      colorFn(e.language),
      gray(e.extension),
      e.files.toLocaleString(),
      e.lines.toLocaleString(),
      `${e.percentage.toFixed(1)}%`,
      pctBar(e.percentage, colorFn),
    ]);
  }

  lines.push(table.toString());
  lines.push('');
  return lines.join('\n');
}
