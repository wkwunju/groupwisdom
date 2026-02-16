const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export async function streamOpenRouterResponse(options: {
  model: string;
  messages: { role: string; content: string }[];
  signal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "GroupWisdom",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
  }

  return response.body!;
}

// Parse SSE stream from OpenRouter and yield content tokens
export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Collect full response from a streaming call
export async function getFullResponse(options: {
  model: string;
  messages: { role: string; content: string }[];
  signal?: AbortSignal;
}): Promise<string> {
  const stream = await streamOpenRouterResponse(options);
  let fullText = "";
  for await (const token of parseSSEStream(stream)) {
    fullText += token;
  }
  return fullText;
}
