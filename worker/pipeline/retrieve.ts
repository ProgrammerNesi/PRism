import { prisma } from "../../lib/prisma";
import { ChangedFile } from "./diff";
import { getEmbedder } from "./embed";

export interface RelevantChunk {
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
}

export async function retrieveRelevantContext(
    changedFiles: ChangedFile[],
    repositoryId: string,
    baseCommitSha: string,
    topK: number = 5
): Promise<RelevantChunk[]> {
    const extractor = await getEmbedder();
    const seenIds = new Set<string>();
    const allChunks: RelevantChunk[] = [];

    for (const file of changedFiles) {
        if (!file.patch) continue;

        // Embed the diff as the query.
        // The diff represents what is changing.
        // The similarity search finds the most relevant existing code
        // from the base branch — revealing what patterns the PR should follow.
        const queryText = `File: ${file.filename}\n${file.patch}`;

        const output = await extractor([queryText], {
            pooling: "mean",
            normalize: true,
        });

        const queryVector = (output.tolist() as number[][])[0];
        const vectorString = `[${queryVector.join(",")}]`;

        const results = await prisma.$queryRaw<
            Array<{
                id: string;
                filePath: string;
                startLine: number;
                endLine: number;
                content: string;
            }>
        >`
  SELECT id, "filePath", "startLine", "endLine", content
  FROM "Embedding"
  WHERE "repositoryId" = ${repositoryId}
  AND "commitSha" = ${baseCommitSha}
  ORDER BY embedding <=> ${vectorString}::vector
  LIMIT ${topK}
`;

        for (const result of results) {
            if (!seenIds.has(result.id)) {
                seenIds.add(result.id);
                allChunks.push({
                    filePath: result.filePath,
                    startLine: result.startLine,
                    endLine: result.endLine,
                    content: result.content,
                });
            }
        }
    }

    console.log(`Retrieved ${allChunks.length} relevant context chunks`);
    return allChunks;
}