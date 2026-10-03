import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events stream for the live match centre.
 * Clients receive a payload whenever the match revision changes (score,
 * minute, status, events) — no polling loop in the UI, no page refresh.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastRevision = -1;
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      const tick = async () => {
        if (closed) return;
        try {
          const [row] = await db
            .select()
            .from(matches)
            .where(eq(matches.id, id))
            .limit(1);
          if (!row) {
            send("error", { message: "match_not_found" });
            closed = true;
            controller.close();
            return;
          }
          const serverNow = Date.now();
          const elapsed =
            row.timerElapsedMs +
            (row.timerRunning && row.timerStartedAt
              ? serverNow - row.timerStartedAt.getTime()
              : 0);
          if (row.revision !== lastRevision) {
            lastRevision = row.revision;
            send("update", {
              match: row,
              elapsedMs: elapsed,
              serverTime: new Date(serverNow).toISOString(),
            });
          } else {
            send("tick", {
              elapsedMs: elapsed,
              serverTime: new Date(serverNow).toISOString(),
            });
          }
        } catch (error) {
          send("error", { message: "stream_error", detail: String(error) });
        }
      };

      send("hello", { serverTime: new Date().toISOString() });
      await tick();
      const interval = setInterval(tick, 3000);

      _request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

