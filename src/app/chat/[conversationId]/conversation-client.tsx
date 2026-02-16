"use client";

import { ConversationWithDetails } from "@/types";
import { IndependentView } from "@/components/independent/independent-view";
import { DiscussionView } from "@/components/discussion/discussion-view";
import { Badge } from "@/components/ui/badge";

interface ConversationClientProps {
  conversation: ConversationWithDetails;
}

export function ConversationClient({ conversation }: ConversationClientProps) {
  const modeLabel =
    conversation.mode === "independent"
      ? "Independent Mode"
      : conversation.mode === "round_robin"
        ? "Round-Robin Discussion"
        : "Moderated Discussion";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-background">
        <h2 className="font-semibold text-sm truncate flex-1">
          {conversation.title}
        </h2>
        <Badge variant="outline" className="text-xs shrink-0">
          {modeLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {conversation.participants.length} models
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {conversation.mode === "independent" ? (
          <IndependentView
            conversationId={conversation.id}
            participants={conversation.participants}
            initialMessages={conversation.messages}
          />
        ) : (
          <DiscussionView
            conversationId={conversation.id}
            mode={conversation.mode}
            participants={conversation.participants}
            initialMessages={conversation.messages}
          />
        )}
      </div>
    </div>
  );
}
