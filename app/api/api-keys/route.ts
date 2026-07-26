import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/hashApiKey";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const rawKey = `prism_sk_${crypto.randomBytes(32).toString("hex")}`;
  const hashed = hashApiKey(rawKey);

  await prisma.apiKey.create({
    data: {
      name: name.trim(),
      hashedKey: hashed,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ key: rawKey }, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: {
      userId: session.user.id,
      revokedAt: null,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(keys);
}
