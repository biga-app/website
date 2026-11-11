"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";

import { Button } from "@biga/ui/components/button";
import { Kbd } from "@biga/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@biga/ui/components/tooltip";

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
    { label, shortcut, tooltipSide, className, size = "icon-xs", variant = "outline", children, ...props },
    ref
) {
    return (
        <Tooltip>
            <TooltipTrigger render={<Button ref={ref}
                    variant={variant}
                    size={size}
                    aria-label={label}
                    className={className}
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
