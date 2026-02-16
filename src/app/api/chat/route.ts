import { streamOpenRouterResponse } from "@/lib/openrouter";
import { buildIndependentPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { model, messages, conversationId, participantId } = await req.json();

    // Stream response from OpenRouter
    const stream = await streamOpenRouterResponse({
      model,
      messages: [
        { role: "system", content: buildIndependentPrompt() },
        ...messages,
      ],
    });

    // Create a transform stream to capture full response for DB persistence
    let fullContent = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        // Pass through the raw SSE data
        controller.enqueue(chunk);

        // Extract content for DB save
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullContent += content;
            } catch {
              // Skip malformed
            }
          }
        }
      },
      async flush() {
        // Save complete message to DB
        if (fullContent && conversationId) {
          try {
            await prisma.message.create({
              data: {
                conversationId,
                participantId: participantId || null,
                role: "assistant",
                content: fullContent,
                modelId: model,
              },
            });
          } catch {
            // Don't fail the stream if DB save fails
          }
        }
      },
    });

    const responseStream = stream.pipeThrough(transformStream);

    return new Response(responseStream, {
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
