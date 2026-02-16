"use client";

import { ModelBadge } from "./model-badge";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  modelName?: string;
  colorIndex?: number;
  isModerator?: boolean;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  modelName,
  colorIndex = 0,
  isModerator,
  isStreaming,
}: MessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 sm:px-4 py-2 sm:py-2.5 max-w-[90%] sm:max-w-[80%]">
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="rounded-2xl rounded-bl-md px-3 sm:px-4 py-2 sm:py-2.5 max-w-[90%] sm:max-w-[80%] bg-muted/40">
        {modelName && (
          <div className="mb-1.5">
            <ModelBadge
              name={modelName}
              colorIndex={colorIndex}
              isModerator={isModerator}
            />
          </div>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
