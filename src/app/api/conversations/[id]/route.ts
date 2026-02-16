import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/conversations/[id] - get a conversation with all details
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { orderIndex: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// PATCH /api/conversations/[id] - update title
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title } = await req.json();

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json(conversation);
}

// DELETE /api/conversations/[id] - delete a conversation
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.conversation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
