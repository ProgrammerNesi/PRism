import { prisma } from "@/lib/prisma";

export async function resolveRepository(
  userId: string,
  fullName: string
) {
  return prisma.repository.findFirst({
    where: {
      fullName,
      isActive: true,
      installation: {
        userId,
      },
    },
  });
}