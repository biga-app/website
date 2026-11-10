"use client";

import { type ReactNode, useEffect, useState } from "react";

import { CopyGlyph } from "@/components/copy-glyph";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const INSTALL = {
  unix: {
    label: "macOS / Linux",
    command: "curl -fsSL https://raw.githubusercontent.com/biga-app/cli/main/install.sh | sh",
  },
  windows: {
    label: "Windows",
    command: "irm https://raw.githubusercontent.com/biga-app/cli/main/install.ps1 | iex",
  },
  go: {
    label: "Go",
    command: "go install github.com/biga-app/cli/cmd/biga@latest",
  },
} as const;

export type Platform = keyof typeof INSTALL;

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  return {
    copied,
    copy: async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    },
  };
}

/**
 * A shell command in a dark pill with a copy button. Long commands scroll
 * sideways inside the pill (with a fade at the trailing edge as the cue)
 * rather than truncating, so the whole command is always reachable.
 */
export function CommandLine({ command, className }: { command: string; className?: string }) {
  const { copied, copy } = useCopy(command);
  return (
    <div
      className={cn(
        "bg-terminal text-terminal-foreground flex h-12 min-w-0 items-center gap-1 rounded-full border border-white/10 pr-1.5 pl-4",
        "shadow-[0_1px_1px_oklch(0_0_0_/_0.05),0_18px_40px_-28px_oklch(0_0_0_/_0.6)]",
        className
      )}
    >
      <span aria-hidden className="text-brand-mark shrink-0 font-mono text-sm select-none">
        $
      </span>
      <div
        tabIndex={0}
        role="region"
        aria-label="Command"
        className="focus-visible:ring-brand-mark/50 min-w-0 flex-1 overflow-x-auto rounded-sm px-1 outline-none [scrollbar-width:none] focus-visible:ring-2 [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: "linear-gradient(to right, black calc(100% - 2rem), transparent)" }}
      >
        <code translate="no" className="block pr-8 font-mono text-[13px] whitespace-nowrap sm:text-sm">
          {command}
        </code>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={copy}
        className="bg-terminal-foreground/10 text-terminal-foreground hover:bg-terminal-foreground/15 focus-visible:ring-brand-mark/50 size-9 shrink-0 rounded-full shadow-none"
      >
        <CopyGlyph copied={copied} checkClassName="text-brand-mark" />
        <span className="sr-only">{copied ? "Copied" : "Copy command"}</span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}

const TAB_TONES = {
  page: { list: "", trigger: "" },
  /* On the always-dark terminal card the default (page) tab colours would be
     near-white on near-white, so the pill and its active tab are drawn in
     translucent white instead. */
  terminal: {
    list: "bg-white/8",
    trigger:
      "text-white/60 hover:text-white focus-visible:ring-white/30 focus-visible:outline-none data-[state=active]:bg-white/12 data-[state=active]:text-white data-[state=active]:shadow-none dark:text-white/60 dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-white/12 dark:data-[state=active]:text-white",
  },
} as const;

/**
 * A platform switch (macOS / Linux, Windows, Go) over one panel per platform.
 * Tabs rather than a row of toggles because each choice swaps a whole block of
 * content, and the panel stays tied to the tab that names it.
 */
export function PlatformTabs({
  platforms,
  value,
  onValueChange,
  tone = "page",
  className,
  children,
}: {
  platforms: readonly Platform[];
  value: Platform;
  onValueChange: (platform: Platform) => void;
  tone?: keyof typeof TAB_TONES;
  className?: string;
  children: (platform: Platform) => ReactNode;
}) {
  const styles = TAB_TONES[tone];
  return (
    <Tabs value={value} onValueChange={(next) => onValueChange(next as Platform)} className={cn("min-w-0 gap-3", className)}>
      <TabsList aria-label="Platform" className={cn("rounded-full", styles.list)}>
        {platforms.map((platform) => (
          <TabsTrigger key={platform} value={platform} className={cn("rounded-full px-3 text-xs", styles.trigger)}>
            {INSTALL[platform].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {platforms.map((platform) => (
        <TabsContent key={platform} value={platform} className="min-w-0">
          {children(platform)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** Install one-liner with a platform switch above it. */
export function InstallCommand({
  platforms = ["unix", "windows"],
  className,
}: {
  platforms?: Platform[];
  className?: string;
}) {
  const [active, setActive] = useState<Platform>(platforms[0] ?? "unix");

  // Start on the visitor's platform once we can see it.
  useEffect(() => {
    if (platforms.includes("windows") && /Win/i.test(navigator.platform)) {
      setActive("windows");
    }
  }, [platforms]);

  return (
    <PlatformTabs platforms={platforms} value={active} onValueChange={setActive} className={cn("w-full", className)}>
      {(platform) => <CommandLine command={INSTALL[platform].command} />}
    </PlatformTabs>
  );
}
