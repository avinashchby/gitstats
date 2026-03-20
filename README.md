# gitstats

Beautiful git repository analytics in the terminal — understand your codebase history at a glance.

## Quick Start

```bash
npx @avinashchby/gitstats
```

## What It Does

`gitstats` runs directly inside any git repository and produces a rich, color-coded report covering everything from who contributed what to which files churn the most. It parses `git log` to extract per-commit metadata, then runs eight independent analyzers across that data. Results are printed to the terminal using Unicode block characters and ANSI color; alternatively the full report can be emitted as structured JSON for downstream tooling.

## Features

- **Author statistics** — commits, lines added/removed, active days, and date range per contributor
- **Contribution heatmap** — GitHub-style calendar grid showing daily commit intensity over the past year
- **Code churn hotspots** — ranked table of the most-frequently changed files with bar charts and author counts
- **Bus factor analysis** — per-directory risk scoring with color-coded danger/caution/safe indicators
- **Commit patterns** — vertical hourly chart and horizontal day-of-week chart to reveal when work happens
- **Language breakdown** — file and line counts by extension across the working tree
- **Repository growth chart** — ASCII area chart of total lines over time with net-change summary
- **Merge statistics** — total merges, average days to merge, merge frequency, and fastest/longest cycles

## Usage

Run a full report across all sections:

```bash
gitstats
```

Show only author contributions and the activity heatmap:

```bash
gitstats --authors --heatmap
```

Limit analysis to the last six months and cap table rows to 10:

```bash
gitstats --since "6 months ago" --limit 10
```

Analyze a specific date range and output machine-readable JSON:

```bash
gitstats --since 2024-01-01 --until 2024-12-31 --json
```

Focus on risk: show bus factor and code churn hotspots only:

```bash
gitstats --bus-factor --hotspots
```

## Example Output

```
╔══════════════════════════════════════════════════════════════════════╗
║   gitstats  →  myproject                                             ║
║  Generated: 3/20/2026, 9:00:00 AM                                    ║
╚══════════════════════════════════════════════════════════════════════╝

Authors
────────────────────────────────────────────────────────────────────────

  Author Statistics
  Authors: 3  +42,310  -18,204  1,847 commits total

┌──────────────┬─────────┬─────────┬──────────┬─────────────┬──────────────┬─────────────┐
│ Author       │ Commits │  Added  │  Removed │ Active Days │ First Commit │ Last Commit │
├──────────────┼─────────┼─────────┼──────────┼─────────────┼──────────────┼─────────────┤
│ Alice        │   1,203 │ +28,100 │  -11,400 │         312 │ 2023-01-15   │ 2026-03-19  │
│ Bob          │     512 │ +10,800 │   -5,200 │         198 │ 2023-06-01   │ 2026-03-10  │
└──────────────┴─────────┴─────────┴──────────┴─────────────┴──────────────┴─────────────┘

Activity Heatmap
────────────────────────────────────────────────────────────────────────

  Contribution Heatmap

     Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
  Mon  · ░ ▒ █ ░ · ░ ▓ █ ░ · ▒ ...
  Wed  ░ ▒ ▒ ▓ ░ ░ ▓ █ ▒ · · ░ ...
  Fri  · · ░ ▒ ▒ ░ · ▒ ░ ▒ · · ...

  Total contributions: 1,847

Bus Factor
────────────────────────────────────────────────────────────────────────

  Bus Factor Analysis
  Bus factor = minimum contributors whose loss would halt progress.

┌──────────────────────────────────────┬────────────┬──────────────────────────────┐
│ Directory / File                     │ Bus Factor │ Top Contributors             │
├──────────────────────────────────────┼────────────┼──────────────────────────────┤
│ src/core                             │     1      │ Alice (87%) ██████████       │
│ src/api                              │     2      │ Bob (54%) █████░░░░░░        │
└──────────────────────────────────────┴────────────┴──────────────────────────────┘

  ■ Danger (1): 1  ■ Caution (2): 3  ■ Safe (3+): 8
```

## Installation

```bash
npm install -g @avinashchby/gitstats
# or
npx @avinashchby/gitstats
```

Requires Node.js >= 18 and `git` available in `PATH`. Run from inside any git repository.

## License

MIT
