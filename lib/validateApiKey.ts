import { prisma } from "@/lib/prisma";
import { hashApiKey } from "./hashApiKey";

export async function validateApiKey(rawKey: string) {
  if (!rawKey.startsWith("prism_sk_")) {
    return null;
  }

  const hashed = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: {
      hashedKey: hashed,
    },
    include: {
      user: true,
    },
  });

  if (!apiKey) return null;

  if (apiKey.revokedAt) return null;

  await prisma.apiKey.update({
    where: {
      id: apiKey.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });

  return apiKey.user;
}