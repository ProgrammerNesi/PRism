import {prisma} from "../../lib/prisma";

export interface ReviewCommentDTO {
  filePath: string;
  line: number;
  body: string;
  severity: string;
}

export interface ReviewCommentsResult {
  reviewId: string;
  summary: string;
  comments: ReviewCommentDTO[];
}

export async function getReviewComments(
  repositoryId: string,
  headCommitSha: string
): Promise<ReviewCommentsResult> {
  const pullRequest = await prisma.pullRequest.findFirst({
    where: {
      repositoryId,
      headCommitSha,
    },
    include: {
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          comments: {
            orderBy: [
              {
                filePath: "asc",
              },
              {
                line: "asc",
              },
            ],
          },
        },
      },
    },
  });

  if (!pullRequest) {
    throw new Error("Pull request not found.");
  }

  if (pullRequest.reviews.length === 0) {
    throw new Error("No reviews found.");
  }

  const latestReview = pullRequest.reviews[0];

  return {
    reviewId: latestReview.id,
    summary: latestReview.summary,
    comments: latestReview.comments.map((comment) => ({
      filePath: comment.filePath,
      line: comment.line,
      body: comment.body,
      severity: comment.severity,
    })),
  };
}