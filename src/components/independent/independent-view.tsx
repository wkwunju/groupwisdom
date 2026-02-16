"use client";

import { useState, useCallback, useRef } from "react";
import { ParticipantInfo } from "@/types";
import { ModelPanel } from "./model-panel";
import { MessageInput } from "@/components/chat/message-input";
import { addMessage, updateConversationTitle } from "@/lib/storage";

interface ModelState {
  messages: { role: "user" | "assistant"; content: string }[];
  streamingText: string;
  isStreaming: boolean;
  error?: string;
}

interface IndependentViewProps {
  conversationId: string;
  participants: ParticipantInfo[];
  initialMessages: {
    participantId: string | null;
    role: string;
    content: string;
  }[];
}

export function IndependentView({
  conversationId,
  participants,
  initialMessages,
}: IndependentViewProps) {
  // Initialize model states from existing messages
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>(
    () => {
      const states: Record<string, ModelState> = {};
      const userMessages = initialMessages.filter((m) => m.role === "user");

      for (const p of participants) {
        const assistantMsgs = initialMessages.filter(
          (m) => m.participantId === p.id && m.role === "assistant"
        );
        const messages: { role: "user" | "assistant"; content: string }[] = [];

        // Interleave user and assistant messages
        for (let i = 0; i < userMessages.length; i++) {
          messages.push({
            role: "user",
            content: userMessages[i].content,
          });
          if (assistantMsgs[i]) {
            messages.push({
              role: "assistant",
              content: assistantMsgs[i].content,
            });
          }
        }

        states[p.id] = {
          messages,
          streamingText: "",
          isStreaming: false,
        };
      }
      return states;
    }
  );

  const abortRefs = useRef<Record<string, AbortController>>({});

  const handleSend = useCallback(
    async (message: string) => {
      // Save user message to localStorage
      addMessage(conversationId, {
        conversationId,
        participantId: null,
        role: "user",
        content: message,
        modelId: null,
        roundNumber: null,
      });

      // Auto-generate title from first message
      if (!modelStates[participants[0]?.id]?.messages.length) {
        updateConversationTitle(conversationId, message.slice(0, 50) + (message.length > 50 ? "..." : ""));
      }

      // Add user message to all model states
      setModelStates((prev) => {
        const next = { ...prev };
        for (const p of participants) {
          next[p.id] = {
            ...next[p.id],
            messages: [
              ...next[p.id].messages,
              { role: "user" as const, content: message },
            ],
            isStreaming: true,
            streamingText: "",
          };
        }
        return next;
      });

      // Fire parallel requests for each model
      for (const participant of participants) {
        const abort = new AbortController();
        abortRefs.current[participant.id] = abort;

        const currentMessages = [
          ...(modelStates[participant.id]?.messages || []),
          { role: "user" as const, content: message },
        ];

        streamForModel(
          participant,
          currentMessages,
          conversationId,
          abort.signal
        );
      }
    },
    [conversationId, participants, modelStates]
  );

  const streamForModel = async (
    participant: ParticipantInfo,
    messages: { role: string; content: string }[],
    convId: string,
    signal: AbortSignal
  ) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: participant.modelId,
          messages,
          conversationId: convId,
          participantId: participant.id,
        }),
        signal,
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorBody.error || `HTTP ${res.status}`);
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
                const text = accumulated;
                setModelStates((prev) => ({
                  ...prev,
                  [participant.id]: {
                    ...prev[participant.id],
                    streamingText: text,
                  },
                }));
              }
            } catch {
              // Skip
            }
          }
        }
      }

      // Save assistant message to localStorage
      addMessage(convId, {
        conversationId: convId,
        participantId: participant.id,
        role: "assistant",
        content: accumulated,
        modelId: participant.modelId,
        roundNumber: null,
      });

      // Finalize
      setModelStates((prev) => ({
        ...prev,
        [participant.id]: {
          ...prev[participant.id],
          messages: [
            ...prev[participant.id].messages,
            { role: "assistant" as const, content: accumulated },
          ],
          streamingText: "",
          isStreaming: false,
        },
      }));
    } catch (err) {
      if (!signal.aborted) {
        setModelStates((prev) => ({
          ...prev,
          [participant.id]: {
            ...prev[participant.id],
            streamingText: "",
            isStreaming: false,
            error: err instanceof Error ? err.message : "Failed to get response",
          },
        }));
      }
    }
  };

  const isAnyStreaming = participants.some(
    (p) => modelStates[p.id]?.isStreaming
  );

  const gridCols =
    participants.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : participants.length <= 3
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 overflow-auto p-3 sm:p-4 grid ${gridCols} gap-3 sm:gap-4 auto-rows-[minmax(200px,1fr)] sm:auto-rows-fr`}>
        {participants.map((p, index) => (
          <ModelPanel
            key={p.id}
            modelName={p.displayName}
            colorIndex={index}
            messages={modelStates[p.id]?.messages || []}
            streamingText={modelStates[p.id]?.streamingText || ""}
            isStreaming={modelStates[p.id]?.isStreaming || false}
            error={modelStates[p.id]?.error}
          />
        ))}
      </div>
      <MessageInput
        onSend={handleSend}
        disabled={isAnyStreaming}
        placeholder="Ask all models..."
        statusText={
          isAnyStreaming
            ? `${participants.filter((p) => modelStates[p.id]?.isStreaming).length} model(s) responding...`
            : undefined
        }
      />
    </div>
  );
}
