import { prisma } from "./db";
import { streamOpenRouterResponse, parseSSEStream } from "./openrouter";
import { buildParticipantPrompt, buildModeratorPrompt } from "./prompts";
import { ParticipantInfo, DiscussionEvent } from "@/types";

interface DiscussionOptions {
  conversationId: string;
  userMessage: string;
  mode: "round_robin" | "moderated";
  participants: ParticipantInfo[];
  maxRounds: number;
  signal?: AbortSignal;
}

export async function* orchestrateDiscussion(
  options: DiscussionOptions
): AsyncGenerator<DiscussionEvent> {
  const { conversationId, userMessage, mode, participants, maxRounds, signal } =
    options;

  // Save user message
  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
    },
  });

  // Build conversation history with speaker labels
  const conversationHistory: { role: string; content: string }[] = [
    { role: "user", content: userMessage },
  ];

  if (mode === "round_robin") {
    yield* roundRobinDiscussion(
      conversationId,
      participants,
      conversationHistory,
      maxRounds,
      signal
    );
  } else {
    yield* moderatedDiscussion(
      conversationId,
      participants,
      conversationHistory,
      maxRounds,
      signal
    );
  }

  yield { type: "discussion_complete", totalRounds: maxRounds };
}

async function* roundRobinDiscussion(
  conversationId: string,
  participants: ParticipantInfo[],
  history: { role: string; content: string }[],
  maxRounds: number,
  signal?: AbortSignal
): AsyncGenerator<DiscussionEvent> {
  const orderedParticipants = [...participants].sort(
    (a, b) => a.orderIndex - b.orderIndex
  );

  const spokenSoFar: string[] = [];

  for (let round = 1; round <= maxRounds; round++) {
    for (const participant of orderedParticipants) {
      if (signal?.aborted) return;

      const otherNames = orderedParticipants
        .filter((p) => p.id !== participant.id)
        .map((p) => p.displayName);

      const systemPrompt = buildParticipantPrompt({
        displayName: participant.displayName,
        otherParticipants: otherNames,
        round,
        maxRounds,
        spokenBefore: [...spokenSoFar],
      });

      yield {
        type: "turn_start",
        participantId: participant.id,
        modelId: participant.modelId,
        displayName: participant.displayName,
        round,
      };

      const fullContent = yield* streamModelResponse(
        participant,
        systemPrompt,
        history,
        signal
      );

      spokenSoFar.push(participant.displayName);

      // Add to history with speaker label
      history.push({
        role: "assistant",
        content: `[${participant.displayName}]: ${fullContent}`,
      });

      // Save to database
      const message = await prisma.message.create({
        data: {
          conversationId,
          participantId: participant.id,
          role: "assistant",
          content: fullContent,
          modelId: participant.modelId,
          roundNumber: round,
        },
      });

      yield {
        type: "turn_end",
        participantId: participant.id,
        fullContent,
        round,
        messageId: message.id,
      };
    }
  }
}

async function* moderatedDiscussion(
  conversationId: string,
  participants: ParticipantInfo[],
  history: { role: string; content: string }[],
  maxRounds: number,
  signal?: AbortSignal
): AsyncGenerator<DiscussionEvent> {
  const moderator = participants.find((p) => p.role === "moderator");
  const others = participants.filter((p) => p.role !== "moderator");

  if (!moderator) {
    yield { type: "error", message: "No moderator designated" };
    return;
  }

  const participantNames = others.map((p) => p.displayName);
  const spokenSoFar: string[] = [];

  // Moderator opening
  {
    const systemPrompt = buildModeratorPrompt({
      displayName: moderator.displayName,
      participants: participantNames,
      phase: "open",
    });

    yield {
      type: "turn_start",
      participantId: moderator.id,
      modelId: moderator.modelId,
      displayName: moderator.displayName,
      round: 0,
    };

    const content = yield* streamModelResponse(
      moderator,
      systemPrompt,
      history,
      signal
    );

    spokenSoFar.push(moderator.displayName);

    history.push({
      role: "assistant",
      content: `[Moderator - ${moderator.displayName}]: ${content}`,
    });

    const message = await prisma.message.create({
      data: {
        conversationId,
        participantId: moderator.id,
        role: "assistant",
        content,
        modelId: moderator.modelId,
        roundNumber: 0,
      },
    });

    yield {
      type: "turn_end",
      participantId: moderator.id,
      fullContent: content,
      round: 0,
      messageId: message.id,
    };
  }

  // Discussion rounds
  for (let round = 1; round <= maxRounds; round++) {
    if (signal?.aborted) return;

    // Moderator directs the round
    {
      const systemPrompt = buildModeratorPrompt({
        displayName: moderator.displayName,
        participants: participantNames,
        phase: "direct_round",
        round,
        maxRounds,
      });

      yield {
        type: "turn_start",
        participantId: moderator.id,
        modelId: moderator.modelId,
        displayName: moderator.displayName,
        round,
      };

      const content = yield* streamModelResponse(
        moderator,
        systemPrompt,
        history,
        signal
      );

      history.push({
        role: "assistant",
        content: `[Moderator - ${moderator.displayName}]: ${content}`,
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          participantId: moderator.id,
          role: "assistant",
          content,
          modelId: moderator.modelId,
          roundNumber: round,
        },
      });

      yield {
        type: "turn_end",
        participantId: moderator.id,
        fullContent: content,
        round,
        messageId: message.id,
      };
    }

    // Each participant responds
    for (const participant of others) {
      if (signal?.aborted) return;

      const otherNames = others
        .filter((p) => p.id !== participant.id)
        .map((p) => p.displayName);

      const systemPrompt = buildParticipantPrompt({
        displayName: participant.displayName,
        otherParticipants: [...otherNames, `Moderator: ${moderator.displayName}`],
        round,
        maxRounds,
        spokenBefore: [...spokenSoFar],
      });

      yield {
        type: "turn_start",
        participantId: participant.id,
        modelId: participant.modelId,
        displayName: participant.displayName,
        round,
      };

      const content = yield* streamModelResponse(
        participant,
        systemPrompt,
        history,
        signal
      );

      spokenSoFar.push(participant.displayName);

      history.push({
        role: "assistant",
        content: `[${participant.displayName}]: ${content}`,
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          participantId: participant.id,
          role: "assistant",
          content,
          modelId: participant.modelId,
          roundNumber: round,
        },
      });

      yield {
        type: "turn_end",
        participantId: participant.id,
        fullContent: content,
        round,
        messageId: message.id,
      };
    }

    // Moderator summarizes the round
    if (round < maxRounds) {
      const systemPrompt = buildModeratorPrompt({
        displayName: moderator.displayName,
        participants: participantNames,
        phase: "summarize",
        round,
        maxRounds,
      });

      yield {
        type: "turn_start",
        participantId: moderator.id,
        modelId: moderator.modelId,
        displayName: moderator.displayName,
        round,
      };

      const content = yield* streamModelResponse(
        moderator,
        systemPrompt,
        history,
        signal
      );

      history.push({
        role: "assistant",
        content: `[Moderator - ${moderator.displayName}]: ${content}`,
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          participantId: moderator.id,
          role: "assistant",
          content,
          modelId: moderator.modelId,
          roundNumber: round,
        },
      });

      yield {
        type: "turn_end",
        participantId: moderator.id,
        fullContent: content,
        round,
        messageId: message.id,
      };
    }
  }

  // Moderator final conclusion
  {
    const systemPrompt = buildModeratorPrompt({
      displayName: moderator.displayName,
      participants: participantNames,
      phase: "conclude",
      maxRounds,
    });

    yield {
      type: "turn_start",
      participantId: moderator.id,
      modelId: moderator.modelId,
      displayName: moderator.displayName,
      round: maxRounds,
    };

    const content = yield* streamModelResponse(
      moderator,
      systemPrompt,
      history,
      signal
    );

    const message = await prisma.message.create({
      data: {
        conversationId,
        participantId: moderator.id,
        role: "assistant",
        content,
        modelId: moderator.modelId,
        roundNumber: maxRounds,
      },
    });

    yield {
      type: "turn_end",
      participantId: moderator.id,
      fullContent: content,
      round: maxRounds,
      messageId: message.id,
    };
  }
}

async function* streamModelResponse(
  participant: ParticipantInfo,
  systemPrompt: string,
  history: { role: string; content: string }[],
  signal?: AbortSignal
): AsyncGenerator<DiscussionEvent, string> {
  let fullContent = "";

  // Consolidate history into a single user message.
  // Some providers (Google/Gemini) reject conversations that end with
  // an assistant message. Packing everything into one user message
  // is universally compatible.
  const userMessage = history[0]?.content || "";
  const priorTurns = history.slice(1);

  let userContent = userMessage;
  if (priorTurns.length > 0) {
    const discussion = priorTurns.map((h) => h.content).join("\n\n");
    userContent = `Topic: ${userMessage}\n\nDiscussion so far:\n${discussion}\n\nNow it's your turn. Share your perspective.`;
  }

  try {
    const stream = await streamOpenRouterResponse({
      model: participant.modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      signal,
    });

    // Buffer initial tokens to detect and strip "[Name]:" prefix
    // that models sometimes copy from the conversation history format.
    let prefixHandled = false;
    let buffer = "";

    for await (const token of parseSSEStream(stream)) {
      fullContent += token;

      if (!prefixHandled) {
        buffer += token;
        if (buffer.startsWith("[")) {
          const closingIdx = buffer.indexOf("]:");
          if (closingIdx !== -1) {
            // Found prefix like "[Model Name]: ", strip it
            prefixHandled = true;
            const remaining = buffer.slice(closingIdx + 2).replace(/^\s*/, "");
            if (remaining) {
              yield { type: "token", content: remaining, participantId: participant.id };
            }
          } else if (buffer.length > 150) {
            // Too long to be a prefix, flush buffer as-is
            prefixHandled = true;
            yield { type: "token", content: buffer, participantId: participant.id };
          }
          // else keep buffering
        } else {
          // Doesn't start with [, no prefix to strip
          prefixHandled = true;
          yield { type: "token", content: buffer, participantId: participant.id };
        }
      } else {
        yield { type: "token", content: token, participantId: participant.id };
      }
    }

    // Flush any remaining buffer
    if (!prefixHandled && buffer) {
      yield { type: "token", content: buffer, participantId: participant.id };
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      participantId: participant.id,
    };
  }

  // Also strip prefix from fullContent for DB/history consistency
  fullContent = fullContent.replace(/^\[.*?\]:\s*/, "").trim();

  return fullContent;
}
