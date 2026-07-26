import { prisma } from "@/lib/prisma";
import { hashApiKey } from "./hashApiKey";

export async function validateApiKey(rawKey: string) {
  console.log("Raw key:", rawKey);

  if (!rawKey.startsWith("prism_sk_")) {
    console.log("Invalid prefix");
    return null;
  }

  const hashed = hashApiKey(rawKey);
  console.log("Computed hash:", hashed);

  const apiKey = await prisma.apiKey.findUnique({
    where: {
      hashedKey: hashed,
    },
    include: {
      user: true,
    },
  });

  console.log("DB Result:", apiKey);

  if (!apiKey) return null;

  if (apiKey.revokedAt) {
    console.log("Key revoked");
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey.user;
}