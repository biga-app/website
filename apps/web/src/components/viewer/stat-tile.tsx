import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatTile({
    label,
    value,
    hint,
    className,
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    className?: string;
}) {
    return (
        <Card size="sm" className={cn("min-w-0", className)}>
            <CardContent className="flex flex-col gap-1">
                <span className="text-muted-foreground text-[11px] font-medium tracking-[0.06em] uppercase">{label}</span>
                <div className="truncate text-lg font-semibold tracking-[-0.01em] tabular-nums">{value}</div>
                {hint ? <div className="text-muted-foreground truncate text-xs">{hint}</div> : null}
            </CardContent>
        </Card>
    );
}
