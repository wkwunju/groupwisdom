import { orchestrateDiscussion } from "@/lib/orchestrator";
import { ParticipantInfo } from "@/types";

export async function POST(req: Request) {
  try {
    const {
      conversationId,
      userMessage,
      mode,
      participants,
      maxRounds,
    }: {
      conversationId: string;
      userMessage: string;
      mode: "round_robin" | "moderated";
      participants: ParticipantInfo[];
      maxRounds: number;
    } = await req.json();

    const abortController = new AbortController();

    // Abort when client disconnects
    req.signal.addEventListener("abort", () => {
      abortController.abort();
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const events = orchestrateDiscussion({
            conversationId,
            userMessage,
            mode,
            participants,
            maxRounds,
            signal: abortController.signal,
          });

          for await (const event of events) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            const errorEvent = `data: ${JSON.stringify({
              type: "error",
              message:
                error instanceof Error ? error.message : "Discussion failed",
            })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
