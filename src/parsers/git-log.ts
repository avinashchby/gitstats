import { execSync } from "child_process";
import type { GitCommit, FileChange } from "../types";

/** Options for filtering the git log range. */
export interface ParseGitLogOptions {
  since?: string;
  until?: string;
  /** Working directory for the git command. Defaults to process.cwd(). */
  cwd?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds the argument list for `git log`.
 * The format uses `\x1e` (ASCII record-separator) as a safe commit delimiter
 * so we can reliably split the raw output into per-commit blocks.
 */
function buildGitArgs(options: ParseGitLogOptions): string[] {
  const args = [
    "log",
    "--format=\x1e%H|%an|%ae|%aI|%s",
    "--numstat",
  ];

  if (options.since) args.push(`--since=${options.since}`);
  if (options.until) args.push(`--until=${options.until}`);

  return args;
}

/**
 * Runs `git log` and returns raw stdout.
 * Returns an empty string for empty repos (no commits yet).
 * Throws for any other git error.
 */
function runGitLog(args: string[], cwd: string): string {
  try {
    return execSync(`git ${args.join(" ")}`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 200 * 1024 * 1024, // 200 MB for large repos
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // An empty repo produces no output but exits with code 128.
    if (message.includes("does not have any commits")) return "";
    throw new Error(`git log failed: ${message}`);
  }
}

/**
 * Splits raw git log output into per-commit text blocks using the
 * ASCII record-separator sentinel we injected into the format string.
 */
function splitIntoBlocks(raw: string): string[] {
  return raw
    .split("\x1e")
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
}

/**
 * Parses a single numstat line into a `FileChange`.
 * Returns `null` for binary files (numstat reports `-` for their counts)
 * or for malformed lines.
 */
function parseFileChange(line: string): FileChange | null {
  const parts = line.split("\t");
  if (parts.length < 3) return null;

  const [addStr, delStr, path] = parts;

  // Binary files show `-` instead of a number — skip them.
  if (addStr === "-" || delStr === "-") return null;

  const additions = parseInt(addStr, 10);
  const deletions = parseInt(delStr, 10);

  if (isNaN(additions) || isNaN(deletions) || !path) return null;

  return { additions, deletions, path };
}

/**
 * Parses a single commit block (header line + numstat lines) into a
 * `GitCommit`. Returns `null` if the header cannot be parsed.
 */
function parseCommitBlock(block: string): GitCommit | null {
  const lines = block.split("\n");

  // First non-empty line is the header produced by --format.
  const headerLine = lines[0]?.trim();
  if (!headerLine) return null;

  const parts = headerLine.split("|");
  if (parts.length < 5) return null;

  // Rejoin from index 4 onward so subjects containing `|` are preserved.
  const [hash, author, email, isoDate, ...subjectParts] = parts;
  const message = subjectParts.join("|");

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;

  // Remaining lines (after the blank separator) are numstat entries.
  const fileLines = lines.slice(1).filter((l) => l.trim().length > 0);
  const files: FileChange[] = fileLines
    .map(parseFileChange)
    .filter((f): f is FileChange => f !== null);

  const insertions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return {
    hash,
    author,
    email,
    date,
    message,
    filesChanged: files.length,
    insertions,
    deletions,
    files,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses the git log of the repository at `options.cwd` (defaults to
 * `process.cwd()`) and returns structured commit data.
 *
 * Supports optional `--since` and `--until` date filters accepted by git
 * (e.g. `"2024-01-01"`, `"6 months ago"`).
 *
 * @throws if the target directory is not a git repository or git is not
 *         installed, unless the repo is simply empty (returns `[]`).
 */
export async function parseGitLog(
  options: ParseGitLogOptions = {}
): Promise<GitCommit[]> {
  const cwd = options.cwd ?? process.cwd();
  const args = buildGitArgs(options);

  let raw: string;
  try {
    raw = runGitLog(args, cwd);
  } catch (err) {
    throw err;
  }

  if (!raw.trim()) return [];

  const blocks = splitIntoBlocks(raw);
  const commits: GitCommit[] = [];

  for (const block of blocks) {
    const commit = parseCommitBlock(block);
    if (commit !== null) {
      commits.push(commit);
    }
  }

  return commits;
}
