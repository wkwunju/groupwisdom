import { NextResponse } from "next/server";
import { DEFAULT_MODELS } from "@/lib/models";

// Known open-source model providers
const OPEN_SOURCE_PROVIDERS = new Set([
  "meta-llama",
  "mistralai",
  "deepseek",
  "qwen",
  "nousresearch",
  "allenai",
  "microsoft",
  "nvidia",
  "thedrummer",
  "openchat",
  "cognitivecomputations",
  "eleutherai",
  "upstage",
  "tngtech",
  "arcee-ai",
  "ibm-granite",
]);

// Keywords in model ID that indicate open source
const OPEN_SOURCE_KEYWORDS = [
  "llama",
  "mistral",
  "mixtral",
  "gemma",
  "phi-",
  "qwen",
  "deepseek",
  "yi-",
  "command-r",
  "dbrx",
  "falcon",
  "olmo",
  "starcoder",
  "codellama",
  "wizardlm",
  "vicuna",
  "solar",
  "nous",
  "hermes",
  "openchat",
];

function isOpenSource(modelId: string): boolean {
  const provider = modelId.split("/")[0];
  if (OPEN_SOURCE_PROVIDERS.has(provider)) return true;
  const lower = modelId.toLowerCase();
  return OPEN_SOURCE_KEYWORDS.some((kw) => lower.includes(kw));
}

// Cache model list in memory
let cachedModels: unknown = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  if (cachedModels && now - cacheTime < CACHE_DURATION) {
    return NextResponse.json(cachedModels);
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "your-openrouter-api-key-here") {
      return NextResponse.json({ data: DEFAULT_MODELS });
    }

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ data: DEFAULT_MODELS });
    }

    const data = await res.json();
    const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 60 * 60;

    const models =
      data.data
        ?.filter(
          (m: { id: string }) => m.id && !m.id.includes(":extended")
        )
        .map(
          (m: {
            id: string;
            name: string;
            description?: string;
            context_length?: number;
            pricing?: { prompt: string; completion: string };
            created?: number;
          }) => ({
            id: m.id,
            name: m.name || m.id,
            description: m.description,
            contextLength: m.context_length,
            pricing: m.pricing,
            createdAt: m.created,
            isOpenSource: isOpenSource(m.id),
            isNew: m.created ? m.created > thirtyDaysAgo : false,
          })
        )
        .sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name)
        ) || DEFAULT_MODELS;

    cachedModels = { data: models };
    cacheTime = now;

    return NextResponse.json(cachedModels);
  } catch {
    return NextResponse.json({ data: DEFAULT_MODELS });
  }
}
