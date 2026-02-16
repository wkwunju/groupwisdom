import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ConversationClient } from "./conversation-client";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { orderBy: { orderIndex: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    notFound();
  }

  return (
    <ConversationClient
      conversation={{
        ...conversation,
        mode: conversation.mode as "independent" | "round_robin" | "moderated",
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map((p: { id: string; conversationId: string; modelId: string; displayName: string; role: string; orderIndex: number }) => ({
          ...p,
          role: p.role as "participant" | "moderator" | "user",
        })),
        messages: conversation.messages.map((m: { id: string; conversationId: string; participantId: string | null; role: string; content: string; modelId: string | null; roundNumber: number | null; createdAt: Date }) => ({
          ...m,
          role: m.role as "user" | "assistant" | "system",
          createdAt: m.createdAt,
        })),
      }}
    />
  );
}
