import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RowButton({
    selected = false,
    className,
    ...props
}: Omit<ComponentProps<typeof Button>, "variant" | "size"> & { selected?: boolean }) {
    return (
        <Button
            variant={selected ? "secondary" : "ghost"}
            size="xs"
            className={cn("h-auto w-full justify-start gap-2 rounded-none px-3 py-1 text-start text-[13px] font-normal shadow-none", className)}
            {...props}
        />
    );
}
