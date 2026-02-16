"use client";

import { Badge } from "@/components/ui/badge";

interface ModelBadgeProps {
  name: string;
  colorIndex: number;
  isModerator?: boolean;
}

export function ModelBadge({ name, isModerator }: ModelBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="text-xs font-medium text-muted-foreground"
    >
      {isModerator && "🎙 "}
      {name}
    </Badge>
  );
}
