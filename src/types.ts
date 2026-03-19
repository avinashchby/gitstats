/** Raw commit data parsed from git log */
export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: FileChange[];
}

/** Single file change within a commit */
export interface FileChange {
  additions: number;
  deletions: number;
  path: string;
}

/** Author contribution summary */
export interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  activeDays: number;
  firstCommit: Date;
  lastCommit: Date;
}

/** Heatmap cell for contribution calendar */
export interface HeatmapCell {
  date: string;
  count: number;
  level: number; // 0-4 intensity
}

/** File hotspot for code churn analysis */
export interface FileHotspot {
  path: string;
  changeCount: number;
  authors: number;
  totalChurn: number; // additions + deletions
  lastChanged: Date;
}

/** Bus factor entry per directory/file */
export interface BusFactorEntry {
  path: string;
  busFactor: number;
  topContributors: { name: string; percentage: number }[];
}

/** Commit pattern data */
export interface CommitPattern {
  hourly: number[]; // 24 entries (0-23)
  daily: number[];  // 7 entries (Sun-Sat)
}

/** Language breakdown entry */
export interface LanguageEntry {
  extension: string;
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

/** Growth data point */
export interface GrowthPoint {
  date: string;
  totalLines: number;
  added: number;
  removed: number;
}

/** Merge/PR statistics */
export interface MergeStats {
  totalMerges: number;
  averageDaysToMerge: number;
  mergeFrequencyPerWeek: number;
  longestOpenDays: number;
  shortestOpenDays: number;
}

/** CLI options from commander */
export interface CliOptions {
  authors?: boolean;
  heatmap?: boolean;
  hotspots?: boolean;
  busFactor?: boolean;
  patterns?: boolean;
  languages?: boolean;
  growth?: boolean;
  merges?: boolean;
  since?: string;
  until?: string;
  json?: boolean;
  html?: string;
  limit?: number;
}

/** Full report combining all analytics */
export interface FullReport {
  repoName: string;
  generatedAt: Date;
  dateRange: { since?: string; until?: string };
  authors: AuthorStats[];
  heatmap: HeatmapCell[];
  hotspots: FileHotspot[];
  busFactor: BusFactorEntry[];
  commitPatterns: CommitPattern;
  languages: LanguageEntry[];
  growth: GrowthPoint[];
  mergeStats: MergeStats;
}
