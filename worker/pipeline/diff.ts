import { Octokit } from "@octokit/rest";

export interface ChangedFile {
  filename: string;
  patch: string | undefined;
  status: string;
}

const IGNORE_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
  ".pdf", ".zip", ".woff", ".woff2", ".ttf", ".eot",
]);

const IGNORE_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "go.sum", "Cargo.lock",
]);

function filterFiles(files: any[]): ChangedFile[] {
  return files
    .filter((file) => {
      if (file.status === "removed") return false;
      const filename = file.filename.split("/").pop()!;
      if (IGNORE_FILES.has(filename)) return false;
      const ext = "." + filename.split(".").pop()!.toLowerCase();
      if (IGNORE_EXTENSIONS.has(ext)) return false;
      return true;
    })
    .map((f) => ({ filename: f.filename, patch: f.patch, status: f.status }));
}

// The full cumulative diff from the PR's base to its current head.
// GitHub validates inline comment line numbers against THIS diff,
// regardless of which commit introduced the change. Always needed
// when posting comments, even on follow-up reviews.
export async function getFullPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<ChangedFile[]> {
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  return filterFiles(files);
}

// The diff between the previously reviewed commit and the new head.
// This isolates ONLY what changed since the last review ran —
// this is what should actually be sent to the LLM, so commit 1's
// code doesn't get re-flagged every time commit 2 is pushed.
export async function getIncrementalDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  previousHeadSha: string,
  newHeadSha: string
): Promise<ChangedFile[]> {
  const { data } = await octokit.repos.compareCommits({
    owner,
    repo,
    base: previousHeadSha,
    head: newHeadSha,
  });

  return filterFiles(data.files ?? []);
}