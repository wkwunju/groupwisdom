"use client";

import { useState, useRef, useCallback } from "react";
import {
  MessageInfo,
  ParticipantInfo,
  DiscussionEvent,
} from "@/types";

interface DiscussionState {
  messages: MessageInfo[];
  activeSpeaker: {
    participantId: string;
    displayName: string;
    modelId: string;
  } | null;
  currentRound: number;
  streamingContent: string;
  isDiscussing: boolean;
}

export function useDiscussion() {
  const [state, setState] = useState<DiscussionState>({
    messages: [],
    activeSpeaker: null,
    currentRound: 0,
    streamingContent: "",
    isDiscussing: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  const startDiscussion = useCallback(
    async (
      conversationId: string,
      userMessage: string,
      mode: "round_robin" | "moderated",
      participants: ParticipantInfo[],
      maxRounds: number
    ) => {
      abortRef.current = new AbortController();

      // Add user message to local state
      setState((prev) => ({
        ...prev,
        isDiscussing: true,
        messages: [
          ...prev.messages,
          {
            id: `user-${Date.now()}`,
            conversationId,
            participantId: null,
            role: "user" as const,
            content: userMessage,
            modelId: null,
            roundNumber: null,
            createdAt: new Date(),
          },
        ],
      }));

      try {
        const res = await fetch("/api/discuss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            userMessage,
            mode,
            participants,
            maxRounds,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error("Discussion stream failed");
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (!data) continue;
              try {
                const event: DiscussionEvent = JSON.parse(data);
                handleEvent(event, conversationId);
              } catch {
                // Skip malformed events
              }
            }
          }
        }
      } catch (error) {
        if (!abortRef.current?.signal.aborted) {
          console.error("Discussion error:", error);
        }
      } finally {
        setState((prev) => ({
          ...prev,
          isDiscussing: false,
          activeSpeaker: null,
          streamingContent: "",
        }));
      }
    },
    []
  );

  const handleEvent = useCallback(
    (event: DiscussionEvent, conversationId: string) => {
      switch (event.type) {
        case "turn_start":
          setState((prev) => ({
            ...prev,
            activeSpeaker: {
              participantId: event.participantId,
              displayName: event.displayName,
              modelId: event.modelId,
            },
            currentRound: event.round,
            streamingContent: "",
          }));
          break;

        case "token":
          setState((prev) => ({
            ...prev,
            streamingContent: prev.streamingContent + event.content,
          }));
          break;

        case "turn_end":
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: event.messageId,
                conversationId,
                participantId: event.participantId,
                role: "assistant" as const,
                content: event.fullContent,
                modelId: prev.activeSpeaker?.modelId || null,
                roundNumber: event.round,
                createdAt: new Date(),
              },
            ],
            activeSpeaker: null,
            streamingContent: "",
          }));
          break;

        case "discussion_complete":
          setState((prev) => ({
            ...prev,
            isDiscussing: false,
            activeSpeaker: null,
            streamingContent: "",
          }));
          break;

        case "error":
          console.error("Discussion event error:", event.message);
          break;
      }
    },
    []
  );

  const stopDiscussion = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      isDiscussing: false,
      activeSpeaker: null,
      streamingContent: "",
    }));
  }, []);

  const setInitialMessages = useCallback((messages: MessageInfo[]) => {
    setState((prev) => ({ ...prev, messages }));
  }, []);

  return {
    ...state,
    startDiscussion,
    stopDiscussion,
    setInitialMessages,
  };
}
