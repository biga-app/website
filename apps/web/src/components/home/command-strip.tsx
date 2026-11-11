"use client";

import type { Checkpoint } from "@biga/types/checkpoint";
import type { DemoBackend } from "@biga/demo/backend";
import { Button } from "@biga/ui/components/button";
import { Skeleton } from "@biga/ui/components/skeleton";
import { ArrowUpRightIcon, RefreshCwIcon, SaveIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { useDemo } from "@/components/demo/demo-provider";
import { PauseButton } from "@/components/home/pause-button";

const STRIP_BUTTON = "border-terminal-foreground/25 bg-transparent text-terminal-foreground hover:bg-terminal-foreground/10 hover:text-terminal-foreground dark:bg-transparent dark:hover:bg-terminal-foreground/10";

function useLatestCheckpoint(backend: DemoBackend | null): Checkpoint | null {
  const [latest, setLatest] = useState<Checkpoint | null>(null);
  useEffect(() => {
    if (!backend) return;
    setLatest(backend.session.checkpoints.at(-1) ?? null);
    return backend.onCheckpoint(setLatest);
  }, [backend]);
  return latest;
}

function Ticker({ checkpoint }: { checkpoint: Checkpoint | null }) {
  const reduce = useReducedMotion();
  return (
    <span role="log" aria-label="Latest checkpoint" className="relative block h-4 min-w-0 flex-1 overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        {checkpoint ? (
          <motion.span
            key={checkpoint.seq}
            initial={reduce ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -14, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="text-terminal-foreground/70 absolute inset-x-0 truncate"
          >
            checkpoint #{checkpoint.seq} <span className="text-terminal-foreground">{checkpoint.label.replace(/^\w+ /, "")}</span>{" "}
            <span className="text-brand-mark">+{checkpoint.additions}</span> <span className="text-destructive">-{checkpoint.deletions}</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

export function CommandStrip({ host }: { host: string }) {
  const { backend, seed, shuffle, paused, togglePaused } = useDemo();
  const latest = useLatestCheckpoint(backend);
  return (
    <div role="group" aria-label="The broadcast" translate="no" className="bg-terminal text-terminal-foreground flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl px-4 py-2.5 font-mono text-xs">
      <span className="shrink-0">
        <span className="text-terminal-accent">$</span> biga start
      </span>
      {backend ? <span className="text-terminal-foreground/70 shrink-0">Broadcasting ./{backend.project.name}</span> : <Skeleton className="h-3 w-40" />}
      <span className="text-terminal-foreground/70 hidden shrink-0 xl:inline">
        live at {host}/session/{seed ?? "…"}
      </span>
      <Ticker checkpoint={latest} />
      <div className="flex flex-wrap items-center gap-2 font-sans">
        <Button size="xs" disabled={!backend} onClick={() => backend?.save()}>
          <SaveIcon />
          Save a change
        </Button>
        <Button size="xs" variant="outline" className={STRIP_BUTTON} disabled={!backend} onClick={shuffle}>
          <RefreshCwIcon />
          New project
        </Button>
        <PauseButton paused={paused} onToggle={togglePaused} playLabel="Resume saves" pauseLabel="Pause saves" size="xs" className={STRIP_BUTTON} />
        <Button render={<a href={seed ? `/demo?seed=${seed}` : "/demo"} target="_blank" rel="noreferrer" />} variant="outline" size="xs" className={STRIP_BUTTON}>
          Open in a new tab
          <ArrowUpRightIcon />
        </Button>
      </div>
    </div>
  );
}
