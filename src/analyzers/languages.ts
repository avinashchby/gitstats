import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import type { LanguageEntry } from "../types";

const execFileAsync = promisify(execFile);

/** Maps file extensions to human-readable language names. */
const EXTENSION_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript (JSX)",
  js: "JavaScript",
  jsx: "JavaScript (JSX)",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  c: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  h: "C/C++ Header",
  hpp: "C++ Header",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  less: "Less",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  md: "Markdown",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  sql: "SQL",
  xml: "XML",
  vue: "Vue",
  svelte: "Svelte",
  dart: "Dart",
  r: "R",
  lua: "Lua",
  ex: "Elixir",
  exs: "Elixir",
  hs: "Haskell",
  clj: "Clojure",
  scala: "Scala",
  tf: "Terraform",
};

/** Resolves the extension from a file path, lowercased, without the dot. */
function extOf(filePath: string): string {
  return path.extname(filePath).replace(/^\./, "").toLowerCase();
}

/** Counts newlines in a file, returning 0 on any read error. */
async function countLines(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, "utf8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

/** Fetches all git-tracked file paths in the given working directory. */
async function getTrackedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files"], { cwd });
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/** Groups file paths by extension and resolves absolute paths. */
function groupByExtension(
  files: string[],
  cwd: string,
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const ext = extOf(file);
    if (!ext) continue;
    const abs = path.resolve(cwd, file);
    const bucket = groups.get(ext) ?? [];
    bucket.push(abs);
    groups.set(ext, bucket);
  }
  return groups;
}

/**
 * Analyses language composition of the repository by reading tracked files.
 * Uses `git ls-files` to enumerate files, counts lines per file,
 * and groups results by extension → language name.
 * Returns entries sorted by percentage descending.
 */
export async function analyzeLanguages(cwd = process.cwd()): Promise<LanguageEntry[]> {
  const files = await getTrackedFiles(cwd);
  if (files.length === 0) return [];

  const groups = groupByExtension(files, cwd);

  // Count files and lines per extension
  const entries: Array<Omit<LanguageEntry, "percentage">> = [];
  for (const [ext, absPaths] of groups.entries()) {
    const lineCounts = await Promise.all(absPaths.map(countLines));
    const lines = lineCounts.reduce((sum, n) => sum + n, 0);
    entries.push({
      extension: `.${ext}`,
      language: EXTENSION_MAP[ext] ?? ext.toUpperCase(),
      files: absPaths.length,
      lines,
    });
  }

  const totalLines = entries.reduce((sum, e) => sum + e.lines, 0);

  return entries
    .map((e) => ({
      ...e,
      percentage: totalLines === 0 ? 0 : Math.round((e.lines / totalLines) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}
