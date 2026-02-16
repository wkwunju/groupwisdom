import {
  ConversationMode,
  ConversationWithDetails,
  ParticipantInfo,
  MessageInfo,
} from "@/types";

const STORAGE_KEY = "groupwisdom_conversations";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface StoredConversation {
  id: string;
  title: string;
  mode: ConversationMode;
  createdAt: string;
  updatedAt: string;
  participants: ParticipantInfo[];
  messages: StoredMessage[];
}

interface StoredMessage {
  id: string;
  conversationId: string;
  participantId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  modelId: string | null;
  roundNumber: number | null;
  createdAt: string;
}

function readAll(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(conversations: StoredConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function toConversationWithDetails(c: StoredConversation): ConversationWithDetails {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    messages: c.messages.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
    })),
  };
}

// --- Public API ---

export function listConversations(): ConversationWithDetails[] {
  return readAll()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(toConversationWithDetails);
}

export function getConversation(id: string): ConversationWithDetails | null {
  const conv = readAll().find((c) => c.id === id);
  return conv ? toConversationWithDetails(conv) : null;
}

export function createConversation(
  mode: ConversationMode,
  participants: {
    modelId: string;
    displayName: string;
    role: "participant" | "moderator";
    orderIndex: number;
  }[]
): ConversationWithDetails {
  const now = new Date().toISOString();
  const id = generateId();

  const conv: StoredConversation = {
    id,
    title: "New Conversation",
    mode,
    createdAt: now,
    updatedAt: now,
    participants: participants.map((p, i) => ({
      id: `${id}-p${i}`,
      conversationId: id,
      modelId: p.modelId,
      displayName: p.displayName,
      role: p.role,
      orderIndex: p.orderIndex,
    })),
    messages: [],
  };

  const all = readAll();
  all.push(conv);
  writeAll(all);

  return toConversationWithDetails(conv);
}

export function deleteConversation(id: string) {
  const all = readAll().filter((c) => c.id !== id);
  writeAll(all);
}

export function updateConversationTitle(id: string, title: string) {
  const all = readAll();
  const conv = all.find((c) => c.id === id);
  if (conv) {
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
    writeAll(all);
  }
}

export function addMessage(
  conversationId: string,
  message: Omit<MessageInfo, "id" | "createdAt">
): MessageInfo {
  const all = readAll();
  const conv = all.find((c) => c.id === conversationId);
  if (!conv) throw new Error("Conversation not found");

  const msg: StoredMessage = {
    id: generateId(),
    conversationId,
    participantId: message.participantId,
    role: message.role,
    content: message.content,
    modelId: message.modelId,
    roundNumber: message.roundNumber,
    createdAt: new Date().toISOString(),
  };

  conv.messages.push(msg);
  conv.updatedAt = msg.createdAt;
  writeAll(all);

  return { ...msg, createdAt: new Date(msg.createdAt) };
}
