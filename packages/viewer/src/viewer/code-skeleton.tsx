import { cn } from "@biga/ui/lib/utils";

const WIDTHS = [38, 62, 54, 0, 71, 46, 83, 58, 0, 34, 66, 77, 49, 0, 41, 69, 56, 28];

/**
 * Placeholder shaped like source code (a gutter and ragged lines), so the
 * moment content arrives the eye is already where the text will be.
 */
export function CodeSkeleton({ lines = WIDTHS.length, className }: { lines?: number; className?: string }) {
    return (
        <div aria-hidden className={cn("flex h-full gap-6 overflow-hidden px-5 py-3.5", className)}>
            <div className="flex w-6 shrink-0 flex-col items-end gap-[9px] pt-[3px]">
                {Array.from({ length: lines }).map((_, i) => (
                    <span key={i} className="bg-muted h-2.5 w-3 rounded-sm" />
                ))}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[9px] pt-[3px]">
                {Array.from({ length: lines }).map((_, i) => {
                    const width = WIDTHS[i % WIDTHS.length] ?? 50;
                    return (
                        <span
                            key={i}
                            className={cn("bg-muted h-2.5 rounded-sm motion-safe:animate-pulse", width === 0 && "invisible")}
                            style={{ width: `${width || 10}%`, animationDelay: `${(i % 6) * 120}ms` }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
