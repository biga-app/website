import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ArtFrame({
    viewBox,
    title,
    description,
    className,
    children,
}: {
    viewBox: string;
    title?: string;
    description?: string;
    className?: string;
    children: ReactNode;
}) {
    const id = useId();
    const labelled = title !== undefined;
    return (
        <svg
            viewBox={viewBox}
            role={labelled ? "img" : undefined}
            aria-hidden={labelled ? undefined : true}
            aria-labelledby={labelled ? `${id}-title${description ? ` ${id}-desc` : ""}` : undefined}
            fill="none"
            className={cn("h-auto w-full", className)}
        >
            {labelled ? <title id={`${id}-title`}>{title}</title> : null}
            {description ? <desc id={`${id}-desc`}>{description}</desc> : null}
            {children}
        </svg>
    );
}
