import simpleGit from "simple-git";
import { dir } from "tmp-promise";

export interface CloneResult {
  repoPath: string;
  cleanup: () => Promise<void>;
}

export async function cloneRepository(
  owner: string,
  repo: string,
  baseCommitSha: string,
  token: string
): Promise<CloneResult> {
  const { path: repoPath, cleanup } = await dir({
    unsafeCleanup: true,
    prefix: "reviewbot-",
  });

  const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

  console.log(`Cloning ${owner}/${repo}...`);
  const git = simpleGit();
  await git.clone(cloneUrl, repoPath);

  // Checkout the BASE commit — the existing state of the codebase
  // before the PR's changes are applied.
  // This is what we embed and use as context for the review.
  // The PR diff shows what is changing relative to this state.
  const repoGit = simpleGit(repoPath);
  await repoGit.checkout(baseCommitSha);

  console.log(`Checked out base at ${baseCommitSha.slice(0, 7)}`);
  return { repoPath, cleanup };
}