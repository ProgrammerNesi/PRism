import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { reviewQueue, ReviewJobData } from "@/lib/queue";

export const dynamic = "force-dynamic";

function validateSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// Minimal repo objects in installation events only have id, name, full_name —
// no owner sub-object like full repository payloads have elsewhere.
// Always derive owner from full_name to avoid undefined errors.
function parseOwner(fullName: string): string {
  return fullName.split("/")[0];
}

// ─────────────────────────────────────────────────────────
// "installation" event — fires when the GitHub App itself is
// installed, uninstalled, suspended, or unsuspended on an account
// ─────────────────────────────────────────────────────────

async function handleInstallationCreated(payload: any) {
  const installationId = String(payload.installation.id);
  const senderGithubId = String(payload.sender.id);
  const account = payload.installation.account;

  // The person who performed the install must already exist in our DB —
  // they had to log in via OAuth to reach the "Connect Repository" button
  // before being redirected to GitHub's install flow.
  const user = await prisma.user.findUnique({
    where: { githubId: senderGithubId },
  });

  if (!user) {
    console.log(
      `No matching user for GitHub ID ${senderGithubId} — they must sign in to the dashboard before installing the app. Skipping.`
    );
    return;
  }

  // Create or reactivate the installation record
  const installation = await prisma.installation.upsert({
    where: { githubInstallationId: installationId },
    update: {
      accountLogin: account.login,
      accountType: account.type,
      userId: user.id,
    },
    create: {
      githubInstallationId: installationId,
      accountLogin: account.login,
      accountType: account.type,
      userId: user.id,
    },
  });

  // For "all repositories" installs, payload.repositories contains every repo.
  // For "selected repositories" installs, same field, just a smaller list.
  const repositories = payload.repositories ?? [];

  for (const repo of repositories) {
    await prisma.repository.upsert({
      where: { fullName: repo.full_name },
      update: {
        installationId: installation.id,
        isActive: true,
      },
      create: {
        githubRepoId: String(repo.id),
        installationId: installation.id,
        owner: parseOwner(repo.full_name),
        name: repo.name,
        fullName: repo.full_name,
        isActive: true,
      },
    });
  }

  console.log(
    `Installation ${installationId} created for ${account.login} with ${repositories.length} repositories`
  );
}

async function handleInstallationDeleted(payload: any) {
  const installationId = String(payload.installation.id);

  const installation = await prisma.installation.findUnique({
    where: { githubInstallationId: installationId },
    include: { repositories: true },
  });

  if (!installation) {
    console.log(`Installation ${installationId} not found — nothing to deactivate`);
    return;
  }

  // Deactivate rather than delete — if the app is reinstalled later,
  // PR and review history for these repos is preserved
  await prisma.repository.updateMany({
    where: { installationId: installation.id },
    data: { isActive: false },
  });

  console.log(
    `Installation ${installationId} removed — deactivated ${installation.repositories.length} repositories`
  );
}

async function handleInstallationSuspend(payload: any, isActive: boolean) {
  const installationId = String(payload.installation.id);

  const installation = await prisma.installation.findUnique({
    where: { githubInstallationId: installationId },
  });

  if (!installation) {
    console.log(`Installation ${installationId} not found — skipping suspend/unsuspend`);
    return;
  }

  await prisma.repository.updateMany({
    where: { installationId: installation.id },
    data: { isActive },
  });

  console.log(
    `Installation ${installationId} ${isActive ? "unsuspended" : "suspended"} — repos set isActive=${isActive}`
  );
}

// ─────────────────────────────────────────────────────────
// "installation_repositories" event — fires when repos are added
// or removed from an EXISTING installation (app stays installed,
// just the repo selection changes)
// ─────────────────────────────────────────────────────────

async function handleInstallationRepositories(payload: any) {
  const installationId = String(payload.installation.id);

  const installation = await prisma.installation.findUnique({
    where: { githubInstallationId: installationId },
  });

  if (!installation) {
    console.log(
      `Installation ${installationId} not found for installation_repositories event — skipping`
    );
    return;
  }

  const added = payload.repositories_added ?? [];
  const removed = payload.repositories_removed ?? [];

  for (const repo of added) {
    await prisma.repository.upsert({
      where: { fullName: repo.full_name },
      update: {
        installationId: installation.id,
        isActive: true,
      },
      create: {
        githubRepoId: String(repo.id),
        installationId: installation.id,
        owner: parseOwner(repo.full_name),
        name: repo.name,
        fullName: repo.full_name,
        isActive: true,
      },
    });
  }

  for (const repo of removed) {
    await prisma.repository.updateMany({
      where: { fullName: repo.full_name },
      data: { isActive: false },
    });
  }

  console.log(
    `Installation ${installationId}: added ${added.length}, removed ${removed.length} repositories`
  );
}

// ─────────────────────────────────────────────────────────
// "pull_request" event — unchanged from before
// ─────────────────────────────────────────────────────────

async function handlePullRequest(payload: any) {
  const { installation, repository, pull_request: pr } = payload;

  const headCommitSha = pr.head.sha;
  const baseCommitSha = pr.base.sha;

  console.log(`PR ${payload.action}: #${pr.number} in ${repository.full_name}`);
  console.log(`  head: ${headCommitSha.slice(0, 7)} (PR branch)`);
  console.log(`  base: ${baseCommitSha.slice(0, 7)} (existing codebase)`);

  const repo = await prisma.repository.findUnique({
    where: { fullName: repository.full_name },
  });

  if (!repo || !repo.isActive) {
    console.log(`${repository.full_name} not connected or inactive — skipping`);
    return;
  }

  const pullRequest = await prisma.pullRequest.upsert({
    where: {
      repositoryId_githubPrNumber: {
        repositoryId: repo.id,
        githubPrNumber: pr.number,
      },
    },
    update: {
      headCommitSha,
      baseCommitSha,
      status: "PENDING",
    },
    create: {
      repositoryId: repo.id,
      githubPrNumber: pr.number,
      title: pr.title,
      authorLogin: pr.user.login,
      headCommitSha,
      baseCommitSha,
      status: "PENDING",
    },
  });

  const job = await prisma.job.create({
    data: { pullRequestId: pullRequest.id, status: "QUEUED" },
  });

  const jobData: ReviewJobData = {
    pullRequestId: pullRequest.id,
    repositoryId: repo.id,
    owner: repository.owner.login, // full pull_request payload DOES have owner — fine here
    repoName: repository.name,
    prNumber: pr.number,
    headCommitSha,
    baseCommitSha,
    installationId: String(installation.id),
  };
  try {
    await fetch(process.env.WORKER_URL!);
  } catch (err) {
    console.warn("Failed to wake worker:", err);
  }

  await reviewQueue.add("review-pr", jobData, { jobId: job.id });

  console.log(`Job ${job.id} queued for PR #${pr.number}`);
}

// ─────────────────────────────────────────────────────────
// Main webhook entry point
// ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const eventName = request.headers.get("x-github-event") ?? "";

  const isValid = validateSignature(
    rawBody,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    switch (eventName) {
      case "pull_request":
        if (["opened", "synchronize"].includes(payload.action)) {
          await handlePullRequest(payload);
        }
        break;

      case "installation":
        if (payload.action === "created") {
          await handleInstallationCreated(payload);
        } else if (payload.action === "deleted") {
          await handleInstallationDeleted(payload);
        } else if (payload.action === "suspend") {
          await handleInstallationSuspend(payload, false);
        } else if (payload.action === "unsuspend") {
          await handleInstallationSuspend(payload, true);
        }
        break;

      case "installation_repositories":
        await handleInstallationRepositories(payload);
        break;

      default:
        return NextResponse.json({ ok: true, message: "Event ignored" });
    }
  } catch (err) {
    console.error(`Error handling ${eventName} webhook:`, err);
  }

  return NextResponse.json({ ok: true });
}