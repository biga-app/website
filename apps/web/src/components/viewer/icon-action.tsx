"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type IconActionProps = Omit<ComponentProps<typeof Button>, "aria-label"> & {
    /** Accessible name, also shown as the tooltip. */
    label: string;
    /** Optional key hint shown in the tooltip, e.g. ["⌘", "P"]. */
    shortcut?: string[];
    tooltipSide?: ComponentProps<typeof TooltipContent>["side"];
    children: ReactNode;
};

/**
 * Icon-only button with a matching accessible name and tooltip. The label is
 * the single source for both, so they can never drift apart.
 */
export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(function IconAction(
    { label, shortcut, tooltipSide, className, size = "icon-xs", variant = "ghost", children, ...props },
    ref
) {
    return (
        <Tooltip>
            <TooltipTrigger render={<Button ref={ref}
                    variant={variant}
                    size={size}
                    aria-label={label}
                    className={cn("text-muted-foreground hover:text-foreground", className)}
                    {...props} />}>
                    {children}
                </TooltipTrigger>
            <TooltipContent side={tooltipSide}>
                {label}
                {shortcut && (
                    <span className="flex gap-0.5">
                        {shortcut.map((key) => (
                            <Kbd key={key}>{key}</Kbd>
                        ))}
                    </span>
                )}
            </TooltipContent>
        </Tooltip>
    );
});
