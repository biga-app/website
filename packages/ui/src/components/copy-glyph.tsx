import { CheckIcon, CopyIcon } from "lucide-react";

import { cn } from "@biga/ui/lib/utils";

/**
 * Copy icon that cross-fades to a check: both glyphs stay mounted, the
 * entering one scales up from 0.25 out of a 4px blur while the other leaves
 * the same way, so the swap can be interrupted mid-flight.
 */
export function CopyGlyph({
    copied,
    className,
    checkClassName = "text-success",
}: {
    copied: boolean;
    className?: string;
    /** Colour of the confirming check; surfaces like the terminal need their own. */
    checkClassName?: string;
}) {
    const swap = "transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]";
    return (
        <span className={cn("relative grid size-3.5 place-items-center", className)}>
            <CheckIcon
                className={cn(
                    "absolute size-3.5",
                    checkClassName,
                    swap,
                    copied ? "blur-0 scale-100 opacity-100" : "scale-[0.25] opacity-0 blur-[4px]"
                )}
            />
            <CopyIcon
                className={cn(
                    "size-3.5",
                    swap,
                    copied ? "scale-[0.25] opacity-0 blur-[4px]" : "blur-0 scale-100 opacity-100"
                )}
            />
        </span>
    );
}
