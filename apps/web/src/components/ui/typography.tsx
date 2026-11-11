import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * One type scale for the marketing surfaces, all Geist. Each variant is a
 * role (size, leading, weight and tracking decided together), written mobile
 * first. Tracking tightens as the size grows.
 *
 *   display    hero headline     600, 40 to 68px
 *   h2         section title     600, 32 to 48px
 *   h3         panel title       600, 18 to 20px
 *   statement  one-line pitch    500, 24 to 36px
 *   lead       under a title     400, 17 to 18px
 *   label      mono annotation   Geist Mono 500, 12px
 */
const typographyVariants = cva("", {
  variants: {
    variant: {
      display:
        "text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-[4.25rem]",
      h2: "text-[2rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance sm:text-5xl",
      h3: "text-lg leading-snug font-semibold tracking-[-0.015em] text-balance sm:text-xl",
      h4: "text-base leading-snug font-semibold",
      statement:
        "text-2xl leading-[1.25] font-medium tracking-[-0.025em] text-balance sm:text-4xl",
      lead: "text-[1.0625rem] leading-relaxed text-pretty sm:text-lg",
      body: "text-base leading-relaxed text-pretty",
      small: "text-sm leading-[1.55] text-pretty",
      label: "font-mono text-xs leading-none font-medium tracking-[0.04em]",
      code: "bg-muted text-foreground/90 rounded-md px-1.5 py-0.5 font-mono text-[0.88em]",
    },
    tone: {
      default: "",
      muted: "text-muted-foreground",
      brand: "text-brand-text",
      inherit: "text-inherit",
    },
  },
  defaultVariants: {
    variant: "body",
    tone: "default",
  },
});

type Variant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;

const ELEMENT: Record<Variant, keyof React.JSX.IntrinsicElements> = {
  display: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  statement: "p",
  lead: "p",
  body: "p",
  small: "p",
  label: "span",
  code: "code",
};

type TypographyProps = useRender.ComponentProps<"p"> &
  VariantProps<typeof typographyVariants> & {
    as?: keyof React.JSX.IntrinsicElements;
  };

function Typography({
  variant = "body",
  tone,
  as,
  render,
  className,
  ...props
}: TypographyProps) {
  const role = variant ?? "body";
  return useRender({
    defaultTagName: as ?? ELEMENT[role],
    render,
    props: mergeProps<"p">(
      {
        className: cn(typographyVariants({ variant, tone }), className),
      },
      props
    ),
    state: { slot: "typography", variant: role },
  });
}

/**
 * A highlighted phrase: the green marker stroke behind the words that carry
 * the sentence. With `draw`, the stroke sweeps on once the nearest
 * `[data-revealed]` ancestor reveals it (see `Reveal`).
 */
function Mark({
  draw = false,
  className,
  ...props
}: React.ComponentProps<"mark"> & { draw?: boolean }) {
  return (
    <mark
      data-slot="mark"
      className={cn("biga-mark", draw && "biga-mark-draw", className)}
      {...props}
    />
  );
}

export { Mark, Typography, typographyVariants };
