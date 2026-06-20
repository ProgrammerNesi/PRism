import { ReviewJobData } from "../../lib/queue";
import { prisma } from "../../lib/prisma";
import { getInstallationOctokit, getInstallationToken } from "./auth";
import { getPRDiff } from "./diff";
import { cloneRepository } from "./clone";
import { chunkRepository } from "./chunk";
import { embedAndStoreChunks, isAlreadyIndexed } from "./embed";
import { retrieveRelevantContext } from "./retrieve";
import { generateReview } from "./review";
import { postReviewToGitHub } from "./post";
import { publishStatus } from "./status";

export async function runReviewPipeline(
  data: ReviewJobData,
  jobId: string
): Promise<void> {
  const {
    pullRequestId,
    repositoryId,
    owner,
    repoName,
    prNumber,
    headCommitSha,
    baseCommitSha,
    installationId,
  } = data;

  const publish = (status: any, message: string) =>
    publishStatus({ pullRequestId, jobId, status, message });

  console.log(`\nPipeline starting for PR #${prNumber}`);
  console.log(`  Base (existing codebase): ${baseCommitSha.slice(0, 7)}`);
  console.log(`  Head (PR changes):        ${headCommitSha.slice(0, 7)}`);

  await publish("CLONING", "Generating access token and cloning repository...");

  const octokit = await getInstallationOctokit(installationId);
  const token = await getInstallationToken(installationId);

  // Fetch the diff — what the PR changes
  const changedFiles = await getPRDiff(octokit, owner, repoName, prNumber);

  if (changedFiles.length === 0) {
    await publish("COMPLETED", "No reviewable files in this PR");
    return;
  }

  console.log(`Found ${changedFiles.length} changed files`);

  // Clone and checkout the BASE commit —
  // the current state of main before the PR's changes
  const { repoPath, cleanup } = await cloneRepository(
    owner,
    repoName,
    baseCommitSha,
    token
  );

  try {
    // Check if we have already indexed this base commit.
    // Multiple PRs opened against the same base reuse the same embeddings.
    // After a merge advances the base branch, the next PR will have a new
    // baseCommitSha and trigger a fresh index automatically.
    const alreadyIndexed = await isAlreadyIndexed(repositoryId, baseCommitSha);

    if (!alreadyIndexed) {
      await publish("INDEXING", "Chunking and embedding the base codebase...");

      const chunks = chunkRepository(repoPath);

      if (chunks.length > 0) {
        await embedAndStoreChunks(chunks, repositoryId, baseCommitSha);
      }
    } else {
      await publish("INDEXING", `Using cached embeddings for base ${baseCommitSha.slice(0, 7)}`);
      console.log("Cache hit — skipping re-index");
    }

    // Query the base embeddings using the PR diff.
    // Finds existing code that is most semantically related to what changed.
    await publish("RETRIEVING", "Finding relevant existing code patterns...");
    const contextChunks = await retrieveRelevantContext(
      changedFiles,
      repositoryId,
      baseCommitSha
    );

    // Send existing patterns + proposed changes to Gemini
    await publish("REVIEWING", "Generating review with Gemini...");
    const reviewResult = await generateReview(changedFiles, contextChunks);

    // Post against the HEAD commit — GitHub requires this to anchor
    // inline comments to the correct lines in the diff view
    await publish("POSTING", `Posting ${reviewResult.comments.length} comments to GitHub...`);
    const githubReviewId = await postReviewToGitHub(
      octokit,
      owner,
      repoName,
      prNumber,
      headCommitSha,
      reviewResult,
      changedFiles
    );

    await prisma.review.create({
      data: {
        pullRequestId,
        headCommitSha,
        baseCommitSha,

        summary: reviewResult.summary,
        githubReviewId,

        comments: {
          create: reviewResult.comments.map((c) => ({
            filePath: c.filePath,
            line: c.line,
            body: c.body,
            severity: c.severity,
          })),
        },
      },
    });

    await publish("COMPLETED", `Review complete — ${reviewResult.comments.length} comments posted`);
    console.log(`Pipeline complete for PR #${prNumber}`);
  } finally {
    await cleanup();
  }
}