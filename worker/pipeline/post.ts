import { Octokit } from "@octokit/rest";
import { ReviewResult } from "./review";
import { ChangedFile } from "./diff";

// Parses a diff patch and returns the set of line numbers
// that GitHub will accept for inline comments.
// Only lines starting with + (added) or space (context) are valid —
// they exist in the new version of the file.
// Lines starting with - are removed and have no line number in the new file.
function extractValidLines(patch: string): Set<number> {
  const validLines = new Set<number>();
  let newLineNum = 0;

  for (const line of patch.split("\n")) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      newLineNum = parseInt(hunkMatch[1]) - 1;
      continue;
    }

    if (line.startsWith("+") || line.startsWith(" ")) {
      newLineNum++;
      validLines.add(newLineNum);
    }
    // Lines starting with - are deleted — do not increment newLineNum
  }

  return validLines;
}

export async function postReviewToGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  headCommitSha: string,
  review: ReviewResult,
  changedFiles: ChangedFile[]
): Promise<string> {
  // Build a map of filename → valid line numbers extracted from the diff
  const validLineMap = new Map<string, Set<number>>();
  for (const file of changedFiles) {
    if (file.patch) {
      validLineMap.set(file.filename, extractValidLines(file.patch));
    }
  }

  // Filter comments to only those with line numbers that exist in the diff.
  // Comments the LLM generated for lines outside the diff become part of the summary.
  const validComments = review.comments.filter((c) => {
    const validLines = validLineMap.get(c.filePath);
    return validLines && validLines.has(c.line);
  });

  const skippedComments = review.comments.filter((c) => {
    const validLines = validLineMap.get(c.filePath);
    return !validLines || !validLines.has(c.line);
  });

  // Append skipped comments to the summary so no feedback is lost
  let summary = review.summary;
  if (skippedComments.length > 0) {
    const skippedText = skippedComments
      .map((c) => `- **${c.filePath}**: ${c.body}`)
      .join("\n");
    summary += `\n\n**Additional notes:**\n${skippedText}`;
  }

  if (skippedComments.length > 0) {
    console.log(
      `Filtered ${skippedComments.length} comments with unresolvable line numbers`
    );
  }

  const response = await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    commit_id: headCommitSha,
    body: summary,
    event: "COMMENT",
    comments: validComments.map((c) => ({
      path: c.filePath,
      line: c.line,
      body: `**${c.severity}**: ${c.body}`,
    })),
  });

  console.log(
    `Posted review — ${validComments.length} inline comments, ${skippedComments.length} moved to summary`
  );

  return String(response.data.id);
}