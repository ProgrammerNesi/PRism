import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "../lib/prisma";
import { ReviewJobData } from "../lib/queue";
import { runReviewPipeline } from "./pipeline/index";
import { getEmbedder } from "./pipeline/embed";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

async function startWorker() {
  // Download and cache the sentence transformer model before
  // accepting any jobs — prevents first job from timing out during download
  console.log("Pre-loading sentence transformer model...");
  await getEmbedder();
  console.log("Model ready");

  const connection = new IORedis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<ReviewJobData>(
    "pr-review",
    async (job: Job<ReviewJobData>) => {
      console.log(`\nJob ${job.id} picked up`);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "ACTIVE",
          startedAt: new Date(),
          attempts: job.attemptsMade + 1,
        },
      });

      await prisma.pullRequest.update({
        where: { id: job.data.pullRequestId },
        data: { status: "PROCESSING" },
      });

      await runReviewPipeline(job.data, job.id!);

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      await prisma.pullRequest.update({
        where: { id: job.data.pullRequestId },
        data: { status: "COMPLETED" },
      });
    },
    { connection, concurrency: 2 }
  );

  worker.on("failed", async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);

    if (job) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });

      if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
        await prisma.pullRequest.update({
          where: { id: job.data.pullRequestId },
          data: { status: "FAILED" },
        });
      }
    }
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
  });

  console.log("Worker running — waiting for jobs");
}

startWorker().catch(console.error);