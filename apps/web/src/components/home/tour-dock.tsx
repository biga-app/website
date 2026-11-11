"use client";

import { Button } from "@biga/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@biga/ui/components/toggle-group";
import { Typography } from "@biga/ui/components/typography";
import { RotateCcwIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type MotionValue } from "motion/react";

import { CHAPTERS } from "@/components/home/chapters";

function Caption({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const chapter = CHAPTERS[index]!;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chapter.id}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="flex min-w-0 flex-col gap-1 text-start"
      >
        <Typography variant="h4">{chapter.title}</Typography>
        <Typography variant="small" tone="muted" className="max-w-[68ch]">
          {chapter.body}
        </Typography>
      </motion.div>
    </AnimatePresence>
  );
}

function Progress({ progress }: { progress: MotionValue<number> }) {
  return (
    <div aria-hidden className="bg-border h-0.5 w-full overflow-hidden rounded-full">
      <motion.div style={{ scaleX: progress }} className="bg-brand h-full origin-left" />
    </div>
  );
}

export function TourDock({
  active,
  onSelect,
  progress,
  driving,
  onResume,
}: {
  active: number;
  onSelect: (index: number) => void;
  progress: MotionValue<number> | null;
  driving: boolean;
  onResume: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <ToggleGroup
            aria-label="Tour"
            value={[CHAPTERS[active]!.id]}
            onValueChange={([next]) => {
              const index = CHAPTERS.findIndex((chapter) => chapter.id === next);
              if (index !== -1) onSelect(index);
            }}
            className="h-9 w-max"
          >
            {CHAPTERS.map(({ id, label, icon: Icon }) => (
              <ToggleGroupItem key={id} value={id} aria-label={label} className="gap-1.5 px-3 text-[13px]">
                <Icon />
                <span className="max-sm:sr-only">{label}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {progress ? <Progress progress={progress} /> : null}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6">
        <Caption index={active} />
        {driving ? (
          <Button size="xs" variant="secondary" onClick={onResume}>
            <RotateCcwIcon />
            You&apos;re driving · Resume tour
          </Button>
        ) : (
          <span className="text-muted-foreground font-mono text-xs tabular-nums" translate="no">
            {active + 1} / {CHAPTERS.length}
          </span>
        )}
      </div>
    </div>
  );
}
