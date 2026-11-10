import { cn } from "@/lib/utils";

export function DiffStat({
    additions,
    deletions,
    className,
}: {
    additions: number;
    deletions: number;
    className?: string;
}) {
    if (additions === 0 && deletions === 0) {
        return null;
    }
    return (
        <span className={cn("flex items-center gap-1.5 font-mono tabular-nums", className)}>
            {additions > 0 && (
                <span className="text-success">
                    +{additions.toLocaleString()}
                    <span className="sr-only"> added lines</span>
                </span>
            )}
            {deletions > 0 && (
                <span className="text-destructive">
                    −{deletions.toLocaleString()}
                    <span className="sr-only"> removed lines</span>
                </span>
            )}
        </span>
    );
}
