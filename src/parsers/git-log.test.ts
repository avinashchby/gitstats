import { execSync } from "child_process";
import { parseGitLog } from "./git-log";

// ---------------------------------------------------------------------------
// Mock child_process so tests run without a real git repo.
// ---------------------------------------------------------------------------
jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a raw git log block the way our format string produces it. */
function makeRawLog(...blocks: string[]): string {
  // Each block is preceded by the \x1e record-separator.
  return blocks.map((b) => `\x1e${b}`).join("\n");
}

function singleCommitRaw({
  hash = "abc123",
  author = "Alice",
  email = "alice@example.com",
  date = "2024-06-15T10:30:00+05:30",
  subject = "feat: initial commit",
  numstat = "",
}: Partial<{
  hash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  numstat: string;
}> = {}): string {
  const header = `${hash}|${author}|${email}|${date}|${subject}`;
  return numstat ? `${header}\n\n${numstat}` : header;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseGitLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Empty / edge cases
  // -------------------------------------------------------------------------

  it("returns [] for an empty repo (no stdout)", async () => {
    mockExecSync.mockReturnValue("");
    const result = await parseGitLog();
    expect(result).toEqual([]);
  });

  it("returns [] when git log exits with 'does not have any commits'", async () => {
    mockExecSync.mockImplementation(() => {
      const err = new Error(
        "fatal: your current branch 'main' does not have any commits yet"
      );
      throw err;
    });
    const result = await parseGitLog();
    expect(result).toEqual([]);
  });

  it("propagates unexpected git errors", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("fatal: not a git repository");
    });
    await expect(parseGitLog()).rejects.toThrow("git log failed");
  });

  // -------------------------------------------------------------------------
  // Basic parsing
  // -------------------------------------------------------------------------

  it("parses a single commit with no file changes", async () => {
    mockExecSync.mockReturnValue(
      makeRawLog(singleCommitRaw())
    );

    const commits = await parseGitLog();
    expect(commits).toHaveLength(1);

    const c = commits[0];
    expect(c.hash).toBe("abc123");
    expect(c.author).toBe("Alice");
    expect(c.email).toBe("alice@example.com");
    expect(c.message).toBe("feat: initial commit");
    expect(c.date).toEqual(new Date("2024-06-15T10:30:00+05:30"));
    expect(c.filesChanged).toBe(0);
    expect(c.insertions).toBe(0);
    expect(c.deletions).toBe(0);
    expect(c.files).toEqual([]);
  });

  it("parses a commit with multiple file changes", async () => {
    const numstat = [
      "10\t2\tsrc/index.ts",
      "5\t0\tsrc/utils.ts",
      "0\t3\tsrc/old.ts",
    ].join("\n");

    mockExecSync.mockReturnValue(
      makeRawLog(singleCommitRaw({ numstat }))
    );

    const commits = await parseGitLog();
    const c = commits[0];

    expect(c.filesChanged).toBe(3);
    expect(c.insertions).toBe(15);
    expect(c.deletions).toBe(5);

    expect(c.files[0]).toEqual({ additions: 10, deletions: 2, path: "src/index.ts" });
    expect(c.files[1]).toEqual({ additions: 5, deletions: 0, path: "src/utils.ts" });
    expect(c.files[2]).toEqual({ additions: 0, deletions: 3, path: "src/old.ts" });
  });

  it("parses multiple commits", async () => {
    const raw = makeRawLog(
      singleCommitRaw({ hash: "aaa111", subject: "feat: first" }),
      singleCommitRaw({ hash: "bbb222", subject: "fix: second" })
    );
    mockExecSync.mockReturnValue(raw);

    const commits = await parseGitLog();
    expect(commits).toHaveLength(2);
    expect(commits[0].hash).toBe("aaa111");
    expect(commits[1].hash).toBe("bbb222");
  });

  // -------------------------------------------------------------------------
  // Binary files
  // -------------------------------------------------------------------------

  it("skips binary files (numstat shows `-` for add/del)", async () => {
    const numstat = [
      "5\t1\tsrc/main.ts",
      "-\t-\tassets/logo.png",
    ].join("\n");

    mockExecSync.mockReturnValue(
      makeRawLog(singleCommitRaw({ numstat }))
    );

    const commits = await parseGitLog();
    const c = commits[0];

    expect(c.filesChanged).toBe(1); // binary file excluded
    expect(c.files).toHaveLength(1);
    expect(c.files[0].path).toBe("src/main.ts");
  });

  it("handles a commit that is ALL binary files gracefully", async () => {
    const numstat = "-\t-\tassets/icon.png";
    mockExecSync.mockReturnValue(
      makeRawLog(singleCommitRaw({ numstat }))
    );

    const commits = await parseGitLog();
    expect(commits[0].filesChanged).toBe(0);
    expect(commits[0].insertions).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Merge commits
  // -------------------------------------------------------------------------

  it("parses merge commits (no numstat is normal)", async () => {
    const raw = makeRawLog(
      singleCommitRaw({
        hash: "merge01",
        subject: "Merge pull request #42 from feature/branch",
      })
    );
    mockExecSync.mockReturnValue(raw);

    const commits = await parseGitLog();
    expect(commits[0].filesChanged).toBe(0);
    expect(commits[0].message).toBe(
      "Merge pull request #42 from feature/branch"
    );
  });

  // -------------------------------------------------------------------------
  // Commit subjects containing the `|` delimiter
  // -------------------------------------------------------------------------

  it("preserves subjects that contain pipe characters", async () => {
    const raw = makeRawLog(
      singleCommitRaw({ subject: "chore: update deps | bump lodash to 4.x" })
    );
    mockExecSync.mockReturnValue(raw);

    const commits = await parseGitLog();
    expect(commits[0].message).toBe("chore: update deps | bump lodash to 4.x");
  });

  // -------------------------------------------------------------------------
  // --since / --until forwarding
  // -------------------------------------------------------------------------

  it("passes --since and --until to git", async () => {
    mockExecSync.mockReturnValue("");

    await parseGitLog({ since: "2024-01-01", until: "2024-12-31" });

    expect(mockExecSync).toHaveBeenCalledTimes(1);
    const call = (mockExecSync as jest.Mock).mock.calls[0][0] as string;
    expect(call).toContain("--since=2024-01-01");
    expect(call).toContain("--until=2024-12-31");
  });

  it("does not include --since/--until when not provided", async () => {
    mockExecSync.mockReturnValue("");

    await parseGitLog();

    const call = (mockExecSync as jest.Mock).mock.calls[0][0] as string;
    expect(call).not.toContain("--since");
    expect(call).not.toContain("--until");
  });

  // -------------------------------------------------------------------------
  // cwd option
  // -------------------------------------------------------------------------

  it("passes cwd option to execSync", async () => {
    mockExecSync.mockReturnValue("");

    await parseGitLog({ cwd: "/some/repo" });

    const opts = (mockExecSync as jest.Mock).mock.calls[0][1] as { cwd: string };
    expect(opts.cwd).toBe("/some/repo");
  });

  it("defaults cwd to process.cwd() when not specified", async () => {
    mockExecSync.mockReturnValue("");

    await parseGitLog();

    const opts = (mockExecSync as jest.Mock).mock.calls[0][1] as { cwd: string };
    expect(opts.cwd).toBe(process.cwd());
  });

  // -------------------------------------------------------------------------
  // Date parsing
  // -------------------------------------------------------------------------

  it("produces a valid Date object from ISO 8601 with timezone offset", async () => {
    const raw = makeRawLog(
      singleCommitRaw({ date: "2023-12-31T23:59:59+00:00" })
    );
    mockExecSync.mockReturnValue(raw);

    const commits = await parseGitLog();
    expect(commits[0].date).toBeInstanceOf(Date);
    expect(commits[0].date.getUTCFullYear()).toBe(2023);
    expect(commits[0].date.getUTCMonth()).toBe(11); // December = 11
    expect(commits[0].date.getUTCDate()).toBe(31);
  });
});
