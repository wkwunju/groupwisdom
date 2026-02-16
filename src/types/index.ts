export type ConversationMode = "independent" | "round_robin" | "moderated";
export type ParticipantRole = "participant" | "moderator" | "user";

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  createdAt?: number; // unix timestamp
  isOpenSource?: boolean;
  isNew?: boolean; // added within last 30 days
}

export interface ConversationWithDetails {
  id: string;
  title: string;
  mode: ConversationMode;
  createdAt: Date;
  updatedAt: Date;
  participants: ParticipantInfo[];
  messages: MessageInfo[];
}

export interface ParticipantInfo {
  id: string;
  conversationId: string;
  modelId: string;
  displayName: string;
  role: ParticipantRole;
  orderIndex: number;
}

export interface MessageInfo {
  id: string;
  conversationId: string;
  participantId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  modelId: string | null;
  roundNumber: number | null;
  createdAt: Date;
}

// SSE event types for discussion mode
export type DiscussionEventType =
  | "turn_start"
  | "token"
  | "turn_end"
  | "discussion_complete"
  | "error";

export interface TurnStartEvent {
  type: "turn_start";
  participantId: string;
  modelId: string;
  displayName: string;
  round: number;
}

export interface TokenEvent {
  type: "token";
  content: string;
  participantId: string;
}

export interface TurnEndEvent {
  type: "turn_end";
  participantId: string;
  fullContent: string;
  round: number;
  messageId: string;
}

export interface DiscussionCompleteEvent {
  type: "discussion_complete";
  totalRounds: number;
}

export interface DiscussionErrorEvent {
  type: "error";
  message: string;
  participantId?: string;
}

export type DiscussionEvent =
  | TurnStartEvent
  | TokenEvent
  | TurnEndEvent
  | DiscussionCompleteEvent
  | DiscussionErrorEvent;

// Model color palette for UI
export const MODEL_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", dot: "bg-emerald-500" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", dot: "bg-purple-500" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", dot: "bg-orange-500" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", dot: "bg-pink-500" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300", dot: "bg-cyan-500" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", dot: "bg-indigo-500" },
];

export function getModelColor(index: number) {
  return MODEL_COLORS[index % MODEL_COLORS.length];
}
