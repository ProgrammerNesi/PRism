/*
  Warnings:

  - A unique constraint covering the columns `[repositoryId,githubPrNumber]` on the table `PullRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repositoryId_githubPrNumber_key" ON "PullRequest"("repositoryId", "githubPrNumber");
