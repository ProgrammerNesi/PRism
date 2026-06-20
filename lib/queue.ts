import { Queue } from "bullmq";
import IORedis from "ioredis";

// Reuse the Redis connection across requests
// Same singleton pattern as the Prisma client
const globalForRedis = globalThis as unknown as {
  redisConnection: IORedis | undefined;
};

export const redisConnection =
  globalForRedis.redisConnection ??
  new IORedis(process.env.REDIS_URL!, {
    // Required for BullMQ — disables the retry limit on blocking commands
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisConnection = redisConnection;
}

// The queue that both the webhook handler (producer) and
// worker (consumer) communicate through
export const reviewQueue = new Queue("pr-review", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30000, // First retry after 30s, then 60s, then 120s
    },
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 500,
  },
});

// TypeScript type for the data passed with each job
// Every piece of info the worker needs to process a PR
export type ReviewJobData = {
  pullRequestId: string;
  repositoryId: string;
  owner: string;
  repoName: string;
  prNumber: number;
  headCommitSha: string;
  baseCommitSha: string;
  installationId: string;
};