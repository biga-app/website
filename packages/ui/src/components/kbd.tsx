"use client";

import { useEffect, useState, type ComponentProps } from "react";

import { cn } from "@biga/ui/lib/utils";

/** Keyboard key hint, e.g. inside a tooltip or a search trigger. */
function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "border-border bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded border px-1 font-sans text-[11px] font-medium tabular-nums",
        "[[data-slot=tooltip-content]_&]:border-background/20 [[data-slot=tooltip-content]_&]:bg-background/10 [[data-slot=tooltip-content]_&]:text-background",
        className
      )}
      {...props}
    />
  );
}

/**
 * The platform's primary modifier: ⌘ on Apple devices, Ctrl elsewhere.
 * Resolved after mount so server and first client render agree.
 */
function useModKey(): string {
  const [mod, setMod] = useState("Ctrl");
  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)) {
      setMod("⌘");
    }
  }, []);
  return mod;
}

export { Kbd, useModKey };
