"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelBadge } from "@/components/chat/model-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageItem {
  role: "user" | "assistant";
  content: string;
}

interface ModelPanelProps {
  modelName: string;
  colorIndex: number;
  messages: MessageItem[];
  streamingText: string;
  isStreaming: boolean;
  error?: string;
}

export function ModelPanel({
  modelName,
  colorIndex,
  messages,
  streamingText,
  isStreaming,
  error,
}: ModelPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <ModelBadge name={modelName} colorIndex={colorIndex} />
          {isStreaming && (
            <span className="text-xs text-muted-foreground animate-pulse">
              thinking...
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-4">
          {messages
            .filter((m) => m.role === "assistant")
            .map((msg, i) => (
              <div
                key={i}
                className="prose prose-sm dark:prose-invert max-w-none text-sm"
              >
                <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
              </div>
            ))}
          {isStreaming && streamingText && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <Markdown remarkPlugins={[remarkGfm]}>{streamingText}</Markdown>
              <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse" />
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">Failed to get response</p>
              <p className="text-xs text-destructive/80 mt-1">{error}</p>
            </div>
          )}
          {!isStreaming && !error && messages.filter((m) => m.role === "assistant").length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Waiting for response...
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
