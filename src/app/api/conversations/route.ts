import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ConversationMode } from "@/types";

// GET /api/conversations - list all conversations
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      participants: true,
      messages: {
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations - create a new conversation
export async function POST(req: Request) {
  const {
    title,
    mode,
    participants,
  }: {
    title?: string;
    mode: ConversationMode;
    participants: {
      modelId: string;
      displayName: string;
      role?: string;
      orderIndex?: number;
    }[];
  } = await req.json();

  const conversation = await prisma.conversation.create({
    data: {
      title: title || "New Conversation",
      mode,
      participants: {
        create: participants.map((p, index) => ({
          modelId: p.modelId,
          displayName: p.displayName,
          role: p.role || "participant",
          orderIndex: p.orderIndex ?? index,
        })),
      },
    },
    include: {
      participants: true,
      messages: true,
    },
  });

  return NextResponse.json(conversation);
}
