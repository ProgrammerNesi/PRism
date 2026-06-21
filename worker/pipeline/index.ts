import { ReviewJobData } from "../../lib/queue";
import { prisma } from "../../lib/prisma";
import { getInstallationOctokit, getInstallationToken } from "./auth";
import { getFullPRDiff, getIncrementalDiff, ChangedFile } from "./diff"; 
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
    pullRequestId, repositoryId, owner, repoName,
    prNumber, headCommitSha, baseCommitSha, installationId,
  } = data;

  const publish = (status: any, message: string) =>
    publishStatus({ pullRequestId, jobId, status, message });

  // Find the last review run on this PR, if any
  const previousReview = await prisma.review.findFirst({
    where: { pullRequestId },
    orderBy: { createdAt: "desc" },
  });

  console.log(
    `Pipeline starting for PR #${prNumber}`
  );

  await publish(
    "CLONING",
    "Cloning repository..."
  );

  const octokit = await getInstallationOctokit(installationId);
  const token = await getInstallationToken(installationId);

  // Full diff — always fetched, needed to validate comment line numbers
  const fullDiff = await getFullPRDiff(octokit, owner, repoName, prNumber);

  if (fullDiff.length === 0) {
    await publish("COMPLETED", "No reviewable files in this PR");
    return;
  }

  // Determine what diff actually drives the review content
  let reviewDiff: ChangedFile[];

  if (previousReview && previousReview.headCommitSha !== headCommitSha) {
    console.log(
      `Incremental diff: ${previousReview.headCommitSha.slice(0, 7)} → ${headCommitSha.slice(0, 7)}`
    );

    try {
      reviewDiff = await getIncrementalDiff(
        octokit,
        owner,
        repoName,
        previousReview.headCommitSha,
        headCommitSha
      );
    } catch (err) {
      // Force-pushes or rewritten history can break compareCommits —
      // fall back to reviewing the full diff rather than failing the job
      console.log("compareCommits failed, falling back to full diff:", err);
      reviewDiff = fullDiff;
    }

    if (reviewDiff.length === 0) {
      console.log("No new file changes since last review — skipping");
      await publish("COMPLETED", "No new changes since the last review");
      return;
    }
  } else {
    console.log("First review run — using full PR diff");
    reviewDiff = fullDiff;
  }

  console.log(`Reviewing ${reviewDiff.length} files (${previousReview ? "incremental" : "full"} diff)`);

  const { repoPath, cleanup } = await cloneRepository(owner, repoName, baseCommitSha, token);

  try {
    const alreadyIndexed = await isAlreadyIndexed(repositoryId, baseCommitSha);

    if (!alreadyIndexed) {
      await publish("INDEXING", "Chunking and embedding base codebase...");
      const chunks = chunkRepository(repoPath);
      if (chunks.length > 0) {
        await embedAndStoreChunks(chunks, repositoryId, baseCommitSha);
      }
    } else {
      await publish("INDEXING", `Cache hit for base ${baseCommitSha.slice(0, 7)}`);
    }

    // Retrieval and review both use reviewDiff — only the new changes
    await publish("RETRIEVING", "Finding relevant existing code patterns...");
    const contextChunks = await retrieveRelevantContext(reviewDiff, repositoryId, baseCommitSha);

    await publish("REVIEWING", "Generating review with Gemini...");
    const reviewResult = await generateReview(reviewDiff, contextChunks);

    // Posting validates line numbers against fullDiff, not reviewDiff —
    // GitHub needs the line position relative to the whole PR
    await publish("POSTING", `Posting ${reviewResult.comments.length} comments to GitHub...`);
    const githubReviewId = await postReviewToGitHub(
      octokit, owner, repoName, prNumber, headCommitSha, reviewResult, fullDiff
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
            filePath: c.filePath, line: c.line, body: c.body, severity: c.severity,
          })),
        },
      },
    });
    await publish(
      "COMPLETED",
      `Review complete — ${reviewResult.comments.length} comments posted`
    );

    console.log(`Pipeline complete for PR #${prNumber}`);
  } finally {
    await cleanup();
  }
}