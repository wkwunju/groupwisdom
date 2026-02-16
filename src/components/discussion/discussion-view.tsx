"use client";

import { useEffect, useRef, useState } from "react";
import { ParticipantInfo, MessageInfo } from "@/types";
import { useDiscussion } from "@/hooks/use-discussion";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DiscussionViewProps {
  conversationId: string;
  mode: "round_robin" | "moderated";
  participants: ParticipantInfo[];
  initialMessages: MessageInfo[];
}

export function DiscussionView({
  conversationId,
  mode,
  participants,
  initialMessages,
}: DiscussionViewProps) {
  const {
    messages,
    activeSpeaker,
    currentRound,
    streamingContent,
    isDiscussing,
    startDiscussion,
    stopDiscussion,
    setInitialMessages,
  } = useDiscussion();

  const [maxRounds, setMaxRounds] = useState(3);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInitialMessages(initialMessages);
  }, [initialMessages, setInitialMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = (message: string) => {
    startDiscussion(conversationId, message, mode, participants, maxRounds);
  };

  // Build participant index for color mapping
  const participantMap = new Map(
    participants.map((p, i) => [p.id, { ...p, colorIndex: i }])
  );

  // Track rounds for separators
  let lastRound: number | null = null;

  const statusText = activeSpeaker
    ? `${activeSpeaker.displayName} is speaking... (Round ${currentRound})`
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border-b flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {mode === "round_robin" ? "Round-Robin" : "Moderated"}
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rounds:</span>
          <Select
            value={String(maxRounds)}
            onValueChange={(v) => setMaxRounds(Number(v))}
            disabled={isDiscussing}
          >
            <SelectTrigger className="h-7 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0" />
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          {participants.map((p) => (
            <Badge
              key={p.id}
              variant="outline"
              className="text-xs"
            >
              {p.role === "moderator" ? "🎙 " : ""}
              {p.displayName}
            </Badge>
          ))}
        </div>
        {isDiscussing && (
          <Button variant="destructive" size="sm" onClick={stopDiscussion}>
            Stop
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 sm:p-4">
        {messages.length === 0 && !isDiscussing && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Start a discussion by typing a topic below
          </div>
        )}

        {messages.map((msg) => {
          const showRoundSeparator =
            msg.roundNumber !== null &&
            msg.roundNumber !== lastRound &&
            msg.roundNumber > 0;

          if (msg.roundNumber !== null && msg.roundNumber > 0) {
            lastRound = msg.roundNumber;
          }

          const participant = msg.participantId
            ? participantMap.get(msg.participantId)
            : null;

          return (
            <div key={msg.id}>
              {showRoundSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Round {msg.roundNumber}
                  </span>
                  <Separator className="flex-1" />
                </div>
              )}
              <MessageBubble
                role={msg.role as "user" | "assistant"}
                content={msg.content}
                modelName={participant?.displayName}
                colorIndex={participant?.colorIndex ?? 0}
                isModerator={participant?.role === "moderator"}
              />
            </div>
          );
        })}

        {/* Streaming message */}
        {activeSpeaker && streamingContent && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            modelName={activeSpeaker.displayName}
            colorIndex={
              participantMap.get(activeSpeaker.participantId)?.colorIndex ?? 0
            }
            isModerator={
              participantMap.get(activeSpeaker.participantId)?.role ===
              "moderator"
            }
            isStreaming
          />
        )}
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={isDiscussing}
        placeholder={
          isDiscussing
            ? "Discussion in progress..."
            : "Type a topic to discuss..."
        }
        statusText={statusText}
      />
    </div>
  );
}
