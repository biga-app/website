import type { ComponentType, ReactNode } from "react";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@biga/ui/components/empty";
import { cn } from "@biga/ui/lib/utils";

export function EmptyState({
    icon: Icon,
    title,
    description,
    children,
    tone = "default",
    className,
}: {
    icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
    title: string;
    description?: ReactNode;
    children?: ReactNode;
    tone?: "default" | "error";
    className?: string;
}) {
    return (
        <Empty className={cn("h-full", className)}>
            <EmptyHeader>
                {Icon ? (
                    <EmptyMedia variant="icon" className={cn(tone === "error" && "bg-destructive/10 text-destructive")}>
                        <Icon strokeWidth={1.75} />
                    </EmptyMedia>
                ) : null}
                <EmptyTitle>{title}</EmptyTitle>
                {description ? <EmptyDescription>{description}</EmptyDescription> : null}
            </EmptyHeader>
            {children ? <EmptyContent className="flex-row flex-wrap justify-center">{children}</EmptyContent> : null}
        </Empty>
    );
}
