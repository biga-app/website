"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"

import { cn } from "@/lib/utils"

function ToggleGroup({
  className,
  ...props
}: ToggleGroupPrimitive.Props) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn(
        "bg-muted/70 inline-flex h-7 items-center rounded-md p-0.5 pointer-coarse:h-9",
        className
      )}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: TogglePrimitive.Props) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex h-full items-center justify-center gap-1.5 rounded-[5px] px-2 text-xs font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 outline-none",
        "focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
        "data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-[0_0_0_1px_var(--border),0_1px_2px_oklch(0_0_0_/_0.06)]",
        "[&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
