#!/usr/bin/env node

import { Command } from 'commander';
import type { CliOptions } from './types.js';
import { generateReport, renderReport } from './index.js';

const program = new Command();

program
  .name('gitstats')
  .description('Beautiful git repository analytics in the terminal')
  .option('--authors',        'Show author contribution summary')
  .option('--heatmap',        'Show activity heatmap')
  .option('--hotspots',       'Show code churn hotspots')
  .option('--bus-factor',     'Show bus factor analysis')
  .option('--patterns',       'Show commit patterns')
  .option('--languages',      'Show language breakdown')
  .option('--growth',         'Show growth chart')
  .option('--merges',         'Show merge statistics')
  .option('--since <date>',   'Filter commits since date (e.g. "2024-01-01", "6 months ago")')
  .option('--until <date>',   'Filter commits until date')
  .option('--json',           'Output as JSON')
  .option('--html <file>',    'Generate HTML report to file')
  .option('--limit <n>',      'Limit results per section', '20')
  .action(async (rawOpts: Record<string, unknown>) => {
    const opts = normalizeOptions(rawOpts);
    await run(opts);
  });

/** Coerces raw commander option values into a typed `CliOptions` object. */
function normalizeOptions(raw: Record<string, unknown>): CliOptions {
  return {
    authors:   raw['authors']   as boolean | undefined,
    heatmap:   raw['heatmap']   as boolean | undefined,
    hotspots:  raw['hotspots']  as boolean | undefined,
    busFactor: raw['busFactor'] as boolean | undefined,
    patterns:  raw['patterns']  as boolean | undefined,
    languages: raw['languages'] as boolean | undefined,
    growth:    raw['growth']    as boolean | undefined,
    merges:    raw['merges']    as boolean | undefined,
    since:     raw['since']     as string | undefined,
    until:     raw['until']     as string | undefined,
    json:      raw['json']      as boolean | undefined,
    html:      raw['html']      as string | undefined,
    limit:     raw['limit'] !== undefined ? parseInt(raw['limit'] as string, 10) : 20,
  };
}

/** Top-level runner: generates and renders the report, then writes output. */
async function run(options: CliOptions): Promise<void> {
  try {
    const report = await generateReport(options);

    if (options.json) {
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      return;
    }

    if (options.html) {
      await writeHtmlReport(report, options);
      return;
    }

    const output = renderReport(report, options);
    process.stdout.write(output + '\n');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\nError: ${message}\n`);
    process.exit(1);
  }
}

/** Writes an HTML report to a file (stubbed — renderer not yet implemented). */
async function writeHtmlReport(
  report: import('./types.js').FullReport,
  options: CliOptions,
): Promise<void> {
  const { writeFileSync } = await import('fs');
  const path = options.html as string;
  // HTML renderer will be wired up once implemented; placeholder for now.
  writeFileSync(path, `<!-- gitstats HTML report for ${report.repoName} -->\n`);
  process.stdout.write(`HTML report written to ${path}\n`);
}

program.parse();
