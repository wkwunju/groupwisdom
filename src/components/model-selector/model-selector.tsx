"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_MODELS, PRESET_GROUPS } from "@/lib/models";
import { ConversationMode, ModelInfo } from "@/types";
import { cn } from "@/lib/utils";

interface SelectedModel {
  modelId: string;
  displayName: string;
  role: "participant" | "moderator";
}

interface ModelSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (models: SelectedModel[]) => void;
  mode: ConversationMode;
}

function getProvider(modelId: string): string {
  return modelId.split("/")[0] || "other";
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "meta-llama": "Meta",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  cohere: "Cohere",
  "x-ai": "xAI",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  perplexity: "Perplexity",
  "amazon-bedrock": "Amazon",
  "z-ai": "Z AI",
  minimax: "MiniMax",
  baidu: "Baidu",
  moonshotai: "Moonshot",
  "arcee-ai": "Arcee AI",
  allenai: "Allen AI",
  nousresearch: "Nous Research",
  "bytedance-seed": "ByteDance",
  tencent: "Tencent",
  alibaba: "Alibaba",
};

function getProviderDisplayName(provider: string): string {
  return (
    PROVIDER_DISPLAY_NAMES[provider] ||
    provider
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

let modelsCache: ModelInfo[] | null = null;

export function ModelSelector({
  open,
  onClose,
  onConfirm,
  mode,
}: ModelSelectorProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [allModels, setAllModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (modelsCache) {
      setAllModels(modelsCache);
      return;
    }
    setIsLoading(true);
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        const models: ModelInfo[] = data.data || DEFAULT_MODELS;
        modelsCache = models;
        setAllModels(models);
      })
      .catch(() => setAllModels(DEFAULT_MODELS))
      .finally(() => setIsLoading(false));
  }, [open]);

  const providers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of allModels) {
      const p = getProvider(m.id);
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [allModels]);

  const rightPanelModels = useMemo(() => {
    let models = allModels;
    if (activeProvider) {
      models = models.filter((m) => getProvider(m.id) === activeProvider);
    }
    if (search) {
      const q = search.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
      );
    }
    return models;
  }, [allModels, activeProvider, search]);

  const selectedPerProvider = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of selected) {
      const p = getProvider(s.modelId);
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return counts;
  }, [selected]);

  const toggleModel = (model: ModelInfo) => {
    setSelected((prev) => {
      const exists = prev.find((s) => s.modelId === model.id);
      if (exists) return prev.filter((s) => s.modelId !== model.id);
      if (prev.length >= 6) return prev;
      return [
        ...prev,
        {
          modelId: model.id,
          displayName: model.name,
          role: "participant" as const,
        },
      ];
    });
  };

  const setModerator = (modelId: string) => {
    setSelected((prev) =>
      prev.map((s) => ({
        ...s,
        role:
          s.modelId === modelId
            ? ("moderator" as const)
            : ("participant" as const),
      }))
    );
  };

  const applyPreset = (modelIds: string[]) => {
    const models = modelIds
      .map((id) => allModels.find((m) => m.id === id))
      .filter(Boolean) as ModelInfo[];
    setSelected(
      models.map((m) => ({
        modelId: m.id,
        displayName: m.name,
        role: "participant" as const,
      }))
    );
  };

  const handleConfirm = () => {
    if (selected.length < 2) return;
    if (
      mode === "moderated" &&
      !selected.some((s) => s.role === "moderator")
    ) {
      const updated = [...selected];
      updated[0].role = "moderator";
      onConfirm(updated);
    } else {
      onConfirm(selected);
    }
    setSelected([]);
    setSearch("");
    setActiveProvider(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="w-[720px] max-w-[96vw] sm:max-w-[92vw] max-h-[92dvh] sm:max-h-[82vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl"
      >
        {/* ─── Header ─── */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 space-y-3 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base font-semibold tracking-tight">
              Select Models
              <span className="font-normal text-muted-foreground text-xs ml-2">
                {selected.length} / 6
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            {PRESET_GROUPS.map((group) => (
              <Button
                key={group.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(group.modelIds)}
                className="text-xs h-7 rounded-full px-3 shrink-0"
              >
                {group.name}
              </Button>
            ))}
            <div className="relative flex-1 min-w-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs pl-8 rounded-full"
              />
            </div>
          </div>

          {/* Mobile provider filter: horizontal scroll */}
          <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
            <button
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors",
                activeProvider === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              onClick={() => setActiveProvider(null)}
            >
              All
            </button>
            {providers.slice(0, 15).map(({ name }) => (
              <button
                key={name}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors",
                  activeProvider === name
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                onClick={() => setActiveProvider(name)}
              >
                {getProviderDisplayName(name)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border shrink-0" />

        {/* ─── Two-column body (desktop) / single column (mobile) ─── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left: Providers - hidden on mobile */}
          <ScrollArea className="hidden sm:block w-48 shrink-0 border-r bg-muted/20">
            <nav className="py-1">
              <button
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 text-[13px] transition-colors",
                  activeProvider === null
                    ? "bg-background font-medium text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
                onClick={() => setActiveProvider(null)}
              >
                <span>All</span>
                <span className="text-[11px] tabular-nums text-muted-foreground/50">
                  {allModels.length}
                </span>
              </button>

              <div className="h-px bg-border mx-3 my-1" />

              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="px-4 py-2">
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                  ))
                : providers.map(({ name, count }) => {
                    const sel = selectedPerProvider.get(name) || 0;
                    const isActive = activeProvider === name;
                    return (
                      <button
                        key={name}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-4 py-[7px] text-[13px] transition-colors",
                          isActive
                            ? "bg-background font-medium text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        )}
                        onClick={() => setActiveProvider(name)}
                      >
                        <span className="flex-1 truncate text-left">
                          {getProviderDisplayName(name)}
                        </span>
                        {sel > 0 && (
                          <span className="w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center shrink-0 leading-none">
                            {sel}
                          </span>
                        )}
                        <span className="text-[11px] tabular-nums shrink-0 min-w-[18px] text-right text-muted-foreground/50">
                          {count}
                        </span>
                      </button>
                    );
                  })}
            </nav>
          </ScrollArea>

          {/* Right: Models */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {activeProvider && (
              <div className="px-4 py-2 border-b bg-muted/15 flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium">
                  {getProviderDisplayName(activeProvider)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {rightPanelModels.length} models
                </span>
                <button
                  className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => setActiveProvider(null)}
                >
                  Show all
                </button>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1.5">
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-border/60 space-y-2"
                    >
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-52" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ))}

                {!isLoading && rightPanelModels.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <span className="text-3xl opacity-20 mb-3">🔍</span>
                    <span className="text-sm">No models found</span>
                    {search && (
                      <span className="text-xs mt-1 opacity-60">
                        Try a different search term
                      </span>
                    )}
                  </div>
                )}

                {!isLoading &&
                  rightPanelModels.map((model) => {
                    const isSelected = selected.some(
                      (s) => s.modelId === model.id
                    );
                    const selectedItem = selected.find(
                      (s) => s.modelId === model.id
                    );

                    return (
                      <div
                        key={model.id}
                        className={cn(
                          "group relative rounded-xl border p-3 cursor-pointer transition-all duration-150",
                          isSelected
                            ? "border-primary/50 bg-primary/[0.035] ring-[1.5px] ring-primary/25 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
                            : "border-border/60 hover:border-border hover:bg-muted/30"
                        )}
                        onClick={() => toggleModel(model)}
                      >
                        {/* Name + tags */}
                        <div className="flex items-center gap-1.5 pr-7">
                          <span className="text-[13px] font-medium leading-snug truncate">
                            {model.name}
                          </span>
                          {model.isNew && (
                            <span className="inline-flex items-center shrink-0 rounded-full bg-emerald-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-600 ring-1 ring-inset ring-emerald-500/20 leading-[18px]">
                              New
                            </span>
                          )}
                          {model.isOpenSource && (
                            <span className="inline-flex items-center shrink-0 rounded-full bg-sky-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-sky-600 ring-1 ring-inset ring-sky-500/20 leading-[18px]">
                              OSS
                            </span>
                          )}
                        </div>

                        {/* Model ID */}
                        <div className="text-[11px] text-muted-foreground/60 mt-px truncate font-mono leading-relaxed">
                          {model.id}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-1">
                          {model.contextLength && (
                            <span className="text-[11px] text-muted-foreground/80">
                              {Math.round(model.contextLength / 1000)}K ctx
                            </span>
                          )}
                          {model.pricing &&
                            Number(model.pricing.prompt) > 0 && (
                              <span className="text-[11px] text-muted-foreground/80">
                                ${Number(model.pricing.prompt).toFixed(2)}/M
                              </span>
                            )}
                          {model.pricing &&
                            Number(model.pricing.prompt) === 0 && (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 ring-1 ring-inset ring-amber-500/20 leading-[18px]">
                                Free
                              </span>
                            )}
                        </div>

                        {/* Moderator button */}
                        {isSelected && mode === "moderated" && (
                          <Button
                            variant={
                              selectedItem?.role === "moderator"
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            className="absolute bottom-3 right-3 text-[10px] h-6 px-2 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModerator(model.id);
                            }}
                          >
                            🎙 Moderator
                          </Button>
                        )}

                        {/* Checkmark */}
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-2.5 h-2.5 text-primary-foreground"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="h-px bg-border shrink-0" />

        {/* ─── Footer ─── */}
        <div className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex-1 flex items-center gap-1.5 flex-wrap min-h-[32px] overflow-x-auto no-scrollbar">
            {selected.length === 0 ? (
              <span className="text-[12px] text-muted-foreground/50">
                Select at least 2 models to start
              </span>
            ) : (
              selected.map((s) => (
                <button
                  key={s.modelId}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={() => {
                    const model = allModels.find((m) => m.id === s.modelId);
                    if (model) toggleModel(model);
                  }}
                >
                  {s.role === "moderator" && (
                    <span className="text-[10px]">🎙</span>
                  )}
                  {s.displayName}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="w-3 h-3 opacity-40"
                  >
                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                  </svg>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selected.length < 2}
              className="text-xs h-8 px-5"
            >
              Start with {selected.length} models
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
