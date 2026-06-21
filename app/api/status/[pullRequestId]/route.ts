import { NextRequest } from "next/server";
import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pullRequestId: string }> }
){
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { pullRequestId } = await params;
  const encoder = new TextEncoder();

  let closed = false;
  let subscriber: IORedis | null = null;
  let keepAlive: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // All three of these guard against acting twice — whether
      // close is triggered by client abort, a COMPLETED message,
      // or a stray late message after teardown has already started.
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const safeClose = async () => {
        if (closed) return;
        closed = true;

        if (keepAlive) clearInterval(keepAlive);

        if (subscriber) {
          subscriber.removeAllListeners();
          try {
            await subscriber.quit();
          } catch {
            // Already closed — ignore
          }
        }

        try {
          controller.close();
        } catch {
          // Already closed — ignore
        }
      };

      const pr = await prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        select: { status: true },
      });

      if (pr) {
        safeEnqueue(
          encoder.encode(
            `data: ${JSON.stringify({ pullRequestId, status: pr.status, message: "" })}\n\n`
          )
        );

        if (pr.status === "COMPLETED" || pr.status === "FAILED") {
          await safeClose();
          return;
        }
      }

      subscriber = new IORedis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
      });

      subscriber.on("error", (err) => {
        console.error("SSE Redis subscriber error:", err.message);
      });

      await subscriber.subscribe(`job:${pullRequestId}`);

      subscriber.on("message", (_ch, message) => {
        if (closed) return;

        safeEnqueue(encoder.encode(`data: ${message}\n\n`));

        try {
          const data = JSON.parse(message);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            safeClose();
          }
        } catch {
          // ignore parse errors on individual messages
        }
      });

      keepAlive = setInterval(() => {
        if (closed) {
          if (keepAlive) clearInterval(keepAlive);
          return;
        }
        safeEnqueue(encoder.encode(`: ping\n\n`));
      }, 25000);

      request.signal.addEventListener("abort", () => {
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}