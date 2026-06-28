import { prisma } from "../../lib/prisma";
import { CodeChunk } from "./chunk";
import crypto from "crypto";

let embedder: any = null;

export async function getEmbedder() {
  if (!embedder) {
    console.log("Loading sentence transformer model...");
    const { pipeline } = await import("@xenova/transformers");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { quantized: true }
    );
    console.log("Model loaded — 384-dimensional embeddings ready");
  }
  return embedder;
}

const BATCH_SIZE = 32;

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const extractor = await getEmbedder();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const output = await extractor(batch, {
      pooling: "mean",
      normalize: true,
    });

    allEmbeddings.push(...(output.tolist() as number[][]));

    console.log(
      `Embedded ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks`
    );
  }

  return allEmbeddings;
}

export async function embedAndStoreChunks(
  chunks: CodeChunk[],
  repositoryId: string,
  baseCommitSha: string
): Promise<void> {
  // Delete previous embeddings for this repository.
  // Each review indexes the current base branch state.
  await prisma.$executeRaw`
    DELETE FROM "Embedding" WHERE "repositoryId" = ${repositoryId}
  `;

  const texts = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(texts);

  console.log("Storing embeddings...");

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    const id = crypto.randomUUID();
    const vectorString = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "Embedding" (
        id, "repositoryId", "commitSha", "filePath",
        "startLine", "endLine", content, language, embedding
      )
      VALUES (
        ${id}, ${repositoryId}, ${baseCommitSha}, ${chunk.filePath},
        ${chunk.startLine}, ${chunk.endLine}, ${chunk.content},
        ${chunk.language}, ${vectorString}::vector
      )
    `;
  }

  console.log(`Stored ${chunks.length} embeddings for base ${baseCommitSha.slice(0, 7)}`);
}

// Cache key is repositoryId + baseCommitSha.
// Multiple PRs open against the same base commit reuse the same embeddings.
// After a merge, the next PR has a new baseCommitSha — cache miss → fresh index.
export async function isAlreadyIndexed(
  repositoryId: string,
  baseCommitSha: string
): Promise<boolean> {
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM "Embedding"
    WHERE "repositoryId" = ${repositoryId}
    AND "commitSha" = ${baseCommitSha}
  `;
  return Number(result[0].count) > 0;
}