import { Octokit } from "@octokit/rest";

export interface ChangedFile {
  filename: string;
  patch?: string;
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

export async function getPRDiff(
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

  return files.filter((file) => {
    if (file.status === "removed") return false;
    const filename = file.filename.split("/").pop()!;
    if (IGNORE_FILES.has(filename)) return false;
    const ext = "." + filename.split(".").pop()!.toLowerCase();
    if (IGNORE_EXTENSIONS.has(ext)) return false;
    return true;
  });
}