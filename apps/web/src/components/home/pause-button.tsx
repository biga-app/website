"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@biga/ui/components/button";
import { cn } from "@biga/ui/lib/utils";

/**
 * The Pause control for anything on the page that moves by itself (WCAG
 * 2.2.2). One pressed-state button, so the label and the icon always agree
 * with `aria-pressed`.
 */
export function PauseButton({
  paused,
  onToggle,
  playLabel = "Play",
  pauseLabel = "Pause",
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  paused: boolean;
  onToggle: () => void;
  playLabel?: string;
  pauseLabel?: string;
}) {
  const Icon = paused ? PlayIcon : PauseIcon;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={paused}
      onClick={onToggle}
      className={cn("rounded-full px-3 text-xs", className)}
      {...props}
    >
      <Icon className="size-3" strokeWidth={2} />
      {paused ? playLabel : pauseLabel}
    </Button>
  );
}
