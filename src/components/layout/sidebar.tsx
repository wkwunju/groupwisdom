"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listConversations, deleteConversation } from "@/lib/storage";
import { ConversationWithDetails } from "@/types";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setConversations(listConversations());
    setIsLoading(false);
  }, [pathname]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (pathname === `/chat/${id}`) {
      router.push("/");
    }
  };

  const modeLabel = (mode: string) => {
    switch (mode) {
      case "independent":
        return "Independent";
      case "round_robin":
        return "Round-Robin";
      case "moderated":
        return "Moderated";
      default:
        return mode;
    }
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-3 border-b">
        <Button
          className="w-full"
          onClick={() => { router.push("/"); onNavigate?.(); }}
        >
          + New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading && (
            <div className="p-3 text-sm text-muted-foreground">Loading...</div>
          )}
          {!isLoading && conversations.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No conversations yet
            </div>
          )}
          {conversations.map((conv) => {
            const isActive = pathname === `/chat/${conv.id}`;
            return (
              <div
                key={conv.id}
                className={cn(
                  "group flex flex-col gap-1 p-2.5 rounded-lg cursor-pointer transition-colors text-sm",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                )}
                onClick={() => { router.push(`/chat/${conv.id}`); onNavigate?.(); }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate flex-1">
                    {conv.title}
                  </span>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {modeLabel(conv.mode)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {conv.participants.length} models
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t text-center">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          GroupWisdom
        </span>
      </div>
    </div>
  );
}
