import { ModelInfo } from "@/types";

// Curated default models for quick selection
export const DEFAULT_MODELS: ModelInfo[] = [
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's flagship multimodal model",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    description: "Anthropic's balanced model",
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro",
    description: "Google's advanced reasoning model",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    description: "DeepSeek's reasoning model",
  },
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Meta's open-source frontier model",
  },
  {
    id: "qwen/qwen3-235b-a22b",
    name: "Qwen3 235B",
    description: "Alibaba's large-scale model",
  },
];

export const PRESET_GROUPS = [
  {
    name: "Frontier Models",
    description: "Top models from leading providers",
    modelIds: [
      "openai/gpt-4o",
      "anthropic/claude-sonnet-4",
      "google/gemini-2.5-pro-preview",
    ],
  },
  {
    name: "Open Source",
    description: "Best open-source models",
    modelIds: [
      "deepseek/deepseek-r1",
      "meta-llama/llama-4-maverick",
      "qwen/qwen3-235b-a22b",
    ],
  },
];

// Extract a human-readable name from an OpenRouter model ID
export function getModelDisplayName(modelId: string): string {
  const preset = DEFAULT_MODELS.find((m) => m.id === modelId);
  if (preset) return preset.name;
  // Fallback: take the part after the slash and clean up
  const parts = modelId.split("/");
  const name = parts[parts.length - 1];
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
