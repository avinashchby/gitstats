import { execSync } from 'child_process';
import type { CliOptions, FullReport } from './types.js';
import { parseGitLog } from './parsers/git-log.js';
import { analyzeAuthors } from './analyzers/authors.js';
import { analyzeHeatmap } from './analyzers/heatmap.js';
import { analyzeHotspots } from './analyzers/hotspots.js';
import { analyzeBusFactor } from './analyzers/bus-factor.js';
import { analyzePatterns } from './analyzers/patterns.js';
import { analyzeLanguages } from './analyzers/languages.js';
import { analyzeGrowth } from './analyzers/growth.js';
import { analyzeMerges } from './analyzers/merges.js';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import nodePath from 'path';
import { renderAuthors } from './renderers/authors.js';
import { renderHeatmap } from './renderers/heatmap.js';
import { renderHotspots } from './renderers/hotspots.js';
import { renderBusFactor } from './renderers/bus-factor.js';
import { renderPatterns } from './renderers/patterns.js';
import { renderLanguages } from './renderers/languages.js';
import { renderGrowth } from './renderers/growth.js';
import { renderMerges } from './renderers/merges.js';
import { bold, cyan, gray, yellow, RESET } from './utils/colors.js';

// ---------------------------------------------------------------------------
// Repo name detection
// ---------------------------------------------------------------------------

/**
 * Attempts to derive the repository name from the git remote origin URL.
 * Falls back to the current directory's basename.
 */
function detectRepoName(cwd: string): string {
  try {
    const remote = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    // Handles both SSH (git@github.com:org/repo.git) and HTTPS URLs.
    const match = remote.match(/[/:]([^/:]+?)(?:\.git)?$/);
    if (match?.[1]) return match[1];
  } catch {
    // No remote — fall through to folder name.
  }

  return nodePath.basename(cwd);
}

// ---------------------------------------------------------------------------
// Section selector
// ---------------------------------------------------------------------------

/**
 * Returns true when no specific section flag was passed, meaning the caller
 * wants a full report across all sections.
 */
function isFullReport(options: CliOptions): boolean {
  return !(
    options.authors ||
    options.heatmap ||
    options.hotspots ||
    options.busFactor ||
    options.patterns ||
    options.languages ||
    options.growth ||
    options.merges
  );
}

// ---------------------------------------------------------------------------
// Header / dividers
// ---------------------------------------------------------------------------

/** Returns a padded horizontal divider line for separating report sections. */
function divider(): string {
  return gray('─'.repeat(72));
}

/** Renders the top banner with repo name and generation timestamp. */
function renderBanner(repoName: string, generatedAt: Date): string {
  const ts = generatedAt.toLocaleString();
  const title = bold(cyan(` gitstats `));
  const repo  = bold(yellow(repoName));
  return [
    '',
    cyan('╔' + '═'.repeat(70) + '╗'),
    cyan('║') + `  ${title}  →  ${repo}`.padEnd(69) + cyan('║'),
    cyan('║') + gray(`  Generated: ${ts}`).padEnd(78) + cyan('║'),
    cyan('╚' + '═'.repeat(70) + '╝'),
    '',
  ].join('\n');
}

/** Renders a labelled section header. */
function sectionHeader(label: string): string {
  return `\n${bold(cyan(label))}\n${divider()}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs all analyzers against the current git repository and returns a
 * `FullReport`. Pass `since`/`until` via `options` to restrict the commit
 * range. Throws if the directory is not a git repo or git is not installed.
 */
export async function generateReport(options: CliOptions): Promise<FullReport> {
  const cwd = process.cwd();
  const repoName = detectRepoName(cwd);

  const commits = await parseGitLog({
    since: options.since,
    until: options.until,
    cwd,
  });

  // analyzeLanguages scans the working tree directly, not commit history.
  const [languages, mergeStats] = await Promise.all([
    analyzeLanguages(cwd),
    Promise.resolve(analyzeMerges(commits)),
  ]);

  return {
    repoName,
    generatedAt: new Date(),
    dateRange: { since: options.since, until: options.until },
    authors:        analyzeAuthors(commits),
    heatmap:        analyzeHeatmap(commits),
    hotspots:       analyzeHotspots(commits),
    busFactor:      analyzeBusFactor(commits),
    commitPatterns: analyzePatterns(commits),
    languages,
    growth:         analyzeGrowth(commits),
    mergeStats,
  };
}

/**
 * Renders a `FullReport` into a terminal string.
 * When no specific section flag is set all sections are included.
 * Respects `options.limit` to cap rows per section.
 */
export function renderReport(report: FullReport, options: CliOptions): string {
  const all = isFullReport(options);
  const limit = options.limit ?? 20;
  const parts: string[] = [renderBanner(report.repoName, report.generatedAt)];

  if (all || options.authors) {
    parts.push(sectionHeader('Authors'));
    parts.push(renderAuthors(report.authors));
  }

  if (all || options.heatmap) {
    parts.push(sectionHeader('Activity Heatmap'));
    parts.push(renderHeatmap(report.heatmap));
  }

  if (all || options.hotspots) {
    parts.push(sectionHeader('Code Churn Hotspots'));
    parts.push(renderHotspots(report.hotspots, limit));
  }

  if (all || options.busFactor) {
    parts.push(sectionHeader('Bus Factor'));
    parts.push(renderBusFactor(report.busFactor));
  }

  if (all || options.patterns) {
    parts.push(sectionHeader('Commit Patterns'));
    parts.push(renderPatterns(report.commitPatterns));
  }

  if (all || options.languages) {
    parts.push(sectionHeader('Language Breakdown'));
    parts.push(renderLanguages(report.languages));
  }

  if (all || options.growth) {
    parts.push(sectionHeader('Repository Growth'));
    parts.push(renderGrowth(report.growth));
  }

  if (all || options.merges) {
    parts.push(sectionHeader('Merge Statistics'));
    parts.push(renderMerges(report.mergeStats));
  }

  parts.push('\n' + divider() + RESET + '\n');
  return parts.join('\n');
}
