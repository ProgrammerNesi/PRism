import { NextRequest } from "next/server";
import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pullRequestId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { pullRequestId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = new IORedis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: null,
      });

      // Send current status immediately so the client
      // doesn't show stale data while waiting for the first event
      const pr = await prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        select: { status: true },
      });

      if (pr) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              pullRequestId,
              status: pr.status,
              message: "",
            })}\n\n`
          )
        );

        if (pr.status === "COMPLETED" || pr.status === "FAILED") {
          await subscriber.quit();
          controller.close();
          return;
        }
      }

      await subscriber.subscribe(`job:${pullRequestId}`);

      subscriber.on("message", (_ch, message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          const data = JSON.parse(message);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            subscriber.quit().then(() => {
              try { controller.close(); } catch {}
            });
          }
        } catch (err) {
          console.error("SSE message error:", err);
        }
      });

      // Keep-alive ping every 25s — browsers drop SSE after ~30s of silence
      const keepAlive = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); }
        catch { clearInterval(keepAlive); }
      }, 25000);

      request.signal.addEventListener("abort", async () => {
        clearInterval(keepAlive);
        await subscriber.quit();
        try { controller.close(); } catch {}
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