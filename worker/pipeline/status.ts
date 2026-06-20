import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const publisher = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export type PipelineStatus =
  | "QUEUED" | "CLONING" | "INDEXING"
  | "RETRIEVING" | "REVIEWING" | "POSTING"
  | "COMPLETED" | "FAILED";

export interface StatusUpdate {
  pullRequestId: string;
  jobId: string;
  status: PipelineStatus;
  message: string;
}

export async function publishStatus(update: StatusUpdate): Promise<void> {
  try {
    await publisher.publish(
      `job:${update.pullRequestId}`,
      JSON.stringify(update)
    );
  } catch (err) {
    console.error("Failed to publish status:", err);
  }
}