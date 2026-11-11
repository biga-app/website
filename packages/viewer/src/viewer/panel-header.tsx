import type { ReactNode } from "react";

/** Title row for a sidebar panel (Files, Timeline): label, count, actions. */
export function PanelHeader({
    title,
    id,
    meta,
    actions,
}: {
    title: string;
    /** Id for the heading, so the panel can be labelled by it. */
    id?: string;
    meta?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="flex h-9 shrink-0 items-center gap-2 pr-1.5 pl-3">
            <h2
                id={id}
                className="text-muted-foreground text-[11px] font-semibold tracking-[0.06em] uppercase"
            >
                {title}
            </h2>
            {meta !== undefined && (
                <span className="text-muted-foreground text-[11px] tabular-nums">{meta}</span>
            )}
            {actions && <div className="ml-auto flex items-center gap-0.5">{actions}</div>}
        </div>
    );
}
