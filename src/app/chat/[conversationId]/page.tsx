"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getConversation } from "@/lib/storage";
import { ConversationWithDetails } from "@/types";
import { ConversationClient } from "./conversation-client";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const conv = getConversation(conversationId);
    if (conv) {
      setConversation(conv);
    } else {
      setNotFound(true);
    }
  }, [conversationId]);

  if (notFound) {
    router.push("/");
    return null;
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <ConversationClient conversation={conversation} />;
}
