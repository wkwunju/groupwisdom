import { streamOpenRouterResponse } from "@/lib/openrouter";
import { buildIndependentPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  try {
    const { model, messages } = await req.json();

    const stream = await streamOpenRouterResponse({
      model,
      messages: [
        { role: "system", content: buildIndependentPrompt() },
        ...messages,
      ],
    });

    return new Response(stream, {
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
