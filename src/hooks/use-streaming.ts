"use client";

import { useState, useRef, useCallback } from "react";

export function useStreaming() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      model: string,
      messages: { role: string; content: string }[],
      conversationId?: string,
      participantId?: string
    ) => {
      abortRef.current = new AbortController();
      setIsStreaming(true);
      setText("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            conversationId,
            participantId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Stream failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  accumulated += content;
                  setText(accumulated);
                }
              } catch {
                // Skip malformed
              }
            }
          }
        }

        return accumulated;
      } catch (error) {
        if (abortRef.current?.signal.aborted) return "";
        throw error;
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { text, isStreaming, startStream, stopStream };
}
