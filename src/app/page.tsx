"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModelSelector } from "@/components/model-selector/model-selector";
import { ConversationMode } from "@/types";

const MODES: {
  value: ConversationMode;
  title: string;
  titleCn: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "independent",
    title: "Independent",
    titleCn: "独立回答",
    description:
      "Each AI model answers your question independently. Great for comparing different perspectives side by side.",
    icon: "◧",
  },
  {
    value: "round_robin",
    title: "Round-Robin",
    titleCn: "轮流发言",
    description:
      "AI models take turns responding, each seeing all previous responses. Like a roundtable discussion.",
    icon: "⟳",
  },
  {
    value: "moderated",
    title: "Moderated",
    titleCn: "主持人模式",
    description:
      "One AI moderates the discussion, guiding topics and synthesizing insights from other participants.",
    icon: "🎙",
  },
];

export default function HomePage() {
  const [selectedMode, setSelectedMode] = useState<ConversationMode | null>(
    null
  );
  const [showModelSelector, setShowModelSelector] = useState(false);
  const router = useRouter();

  const handleModeSelect = (mode: ConversationMode) => {
    setSelectedMode(mode);
    setShowModelSelector(true);
  };

  const handleModelsConfirm = async (
    models: {
      modelId: string;
      displayName: string;
      role: "participant" | "moderator";
    }[]
  ) => {
    if (!selectedMode) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          participants: models.map((m, i) => ({
            modelId: m.modelId,
            displayName: m.displayName,
            role: m.role,
            orderIndex: i,
          })),
        }),
      });

      const conversation = await res.json();
      setShowModelSelector(false);
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-muted/20 overflow-auto">
      <div className="max-w-3xl w-full px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
            GroupWisdom
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-md mx-auto">
            Explore ideas with multiple AI models. Compare answers or watch them
            debate.
          </p>
        </div>

        {/* Mode selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {MODES.map((mode) => (
            <Card
              key={mode.value}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98] group"
              onClick={() => handleModeSelect(mode.value)}
            >
              <CardHeader className="pb-2">
                <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{mode.icon}</div>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  {mode.title}
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {mode.titleCn}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground mt-6 sm:mt-8">
          Select a mode, choose 2-6 AI models, and start your conversation.
        </p>
      </div>

      {selectedMode && (
        <ModelSelector
          open={showModelSelector}
          onClose={() => setShowModelSelector(false)}
          onConfirm={handleModelsConfirm}
          mode={selectedMode}
        />
      )}
    </div>
  );
}
