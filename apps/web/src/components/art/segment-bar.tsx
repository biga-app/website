import { cn } from "@/lib/utils";

const PATTERNS: Record<string, readonly (0 | 1 | 2)[]> = {
  "config.go": [0, 1, 0, 0, 2, 1, 0, 1, 1, 0, 2, 1],
  "filter.go": [1, 0, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0],
  "batcher.go": [0, 0, 1, 1, 0, 2, 0, 0, 1, 1, 0, 1],
};

const TONE = ["bg-muted", "bg-success", "bg-destructive"] as const;

export function SegmentBars({ className }: { className?: string }) {
  return (
    <ul aria-label="Changes per save, one tick per checkpoint" className={cn("flex flex-col gap-2.5", className)}>
      {Object.entries(PATTERNS).map(([name, ticks]) => (
        <li key={name} className="flex items-center gap-3">
          <span translate="no" className="text-muted-foreground w-20 shrink-0 font-mono text-xs">
            {name}
          </span>
          <span className="flex flex-1 gap-1" aria-hidden>
            {ticks.map((tick, index) => (
              <span key={index} className={cn("h-3 flex-1 rounded-[2px]", TONE[tick])} />
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}
