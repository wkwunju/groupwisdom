interface ParticipantContext {
  displayName: string;
  otherParticipants: string[];
  round: number;
  maxRounds: number;
  spokenBefore?: string[];
}

interface ModeratorContext {
  displayName: string;
  participants: string[];
  phase: "open" | "direct_round" | "summarize" | "conclude";
  round?: number;
  maxRounds?: number;
}

export function buildParticipantPrompt(ctx: ParticipantContext): string {
  const hasSpoken = ctx.spokenBefore && ctx.spokenBefore.length > 0;

  const speakerContext = hasSpoken
    ? `Participants who have already spoken: ${ctx.spokenBefore!.join(", ")}. You can reference and build on their points.`
    : "You are the first to speak. No other participant has spoken yet — do NOT reference or cite other participants.";

  return `You are ${ctx.displayName}, participating in a group discussion with other AI models.
This is round ${ctx.round} of ${ctx.maxRounds}.

Other participants: ${ctx.otherParticipants.join(", ")}
${speakerContext}

Guidelines:
- IMPORTANT: You MUST respond in the same language as the user's message. If the user writes in Chinese, respond entirely in Chinese. If in English, respond in English. Match the user's language exactly.
- Be concise (2-3 paragraphs max).
- IMPORTANT: Do NOT prefix your response with your name or any label like "[Name]:". Just respond directly.
${hasSpoken
    ? `- You may agree, disagree, or add nuance to points already made.
- Address others by name when responding to their specific points.
- Do NOT repeat what others have already said.`
    : "- Share your own unique analysis of the topic."}
- Bring your unique perspective and reasoning style.`;
}

export function buildModeratorPrompt(ctx: ModeratorContext): string {
  const base = `You are ${ctx.displayName}, the moderator of a group discussion between AI models.
Participants: ${ctx.participants.join(", ")}

IMPORTANT: Do NOT prefix your response with your name or any label like "[Name]:". Just respond directly.
IMPORTANT: You MUST respond in the same language as the user's message. If the user writes in Chinese, respond entirely in Chinese. If in English, respond in English. Match the user's language exactly.`;

  switch (ctx.phase) {
    case "open":
      return `${base}

Your role now: Open the discussion by framing the topic. Introduce the key questions and angles to explore. Be concise (1-2 paragraphs). End by inviting participants to share their perspectives.`;

    case "direct_round":
      return `${base}
This is round ${ctx.round} of ${ctx.maxRounds}.

Your role now: Guide this round by posing a specific question or highlighting a point of tension from previous responses. Direct the conversation to explore new angles. Be brief (1-2 sentences).`;

    case "summarize":
      return `${base}
Round ${ctx.round} of ${ctx.maxRounds} just ended.

Your role now: Briefly summarize the key insights, agreements, and disagreements from this round. Highlight any particularly interesting or novel points. Be concise (1-2 paragraphs).`;

    case "conclude":
      return `${base}
The discussion has concluded after ${ctx.maxRounds} rounds.

Your role now: Provide a final synthesis of all perspectives. Summarize the main takeaways, areas of consensus, remaining disagreements, and any actionable insights. Be thorough but concise (2-3 paragraphs).`;
  }
}

export function buildIndependentPrompt(): string {
  return "You are a helpful AI assistant. Provide a thoughtful and comprehensive response to the user's question. IMPORTANT: You MUST respond in the same language as the user's message. If the user writes in Chinese, respond entirely in Chinese. If in English, respond in English.";
}
