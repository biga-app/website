import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * One type scale for the marketing surfaces. Each variant is a role (size,
 * line-height, weight and tracking decided together), written mobile first:
 * the base class is the phone size and `sm:`/`lg:` step it up.
 *
 *   display    hero headline           Bricolage 800, 40 → 72px, leading 1.04
 *   h2         section title           Bricolage 800, 32 → 56px, leading 1.06
 *   h3         card / step title       Bricolage 700, 20 → 22px, leading 1.25
 *   h4         small heading           Manrope 600, 16px
 *   statement  one-line manifesto      Manrope 500, 24 → 40px, leading 1.3
 *   lead       paragraph under a title Manrope 400, 17 → 19px, leading 1.6
 *   body       running copy            Manrope 400, 16px, leading 1.6
 *   small      dense copy              Manrope 400, 14px, leading 1.55
 *   label      annotation              Geist Pixel 500, 12px, uppercase
 *   code       inline code             Geist Mono, 0.88em
 *
 * Tracking tightens with size (-0.035em at display, 0 for body) and the
 * pixel labels open up to 0.08em, per the uppercase-label rule.
 */
const typographyVariants = cva("", {
  variants: {
    variant: {
      display:
        "font-display text-[2.5rem] leading-[1.04] font-extrabold tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl",
      h2: "font-display text-[2rem] leading-[1.06] font-extrabold tracking-[-0.032em] text-balance sm:text-5xl lg:text-[3.5rem]",
      h3: "font-display text-xl leading-[1.25] font-bold tracking-[-0.015em] text-balance sm:text-[1.375rem]",
      h4: "font-body text-base leading-snug font-semibold",
      statement:
        "font-body text-2xl leading-[1.3] font-medium tracking-[-0.02em] text-balance sm:text-[2rem] lg:text-[2.5rem]",
      lead: "font-body text-[1.0625rem] leading-relaxed text-pretty sm:text-[1.1875rem]",
      body: "font-body text-base leading-relaxed text-pretty",
      small: "font-body text-sm leading-[1.55] text-pretty",
      label: "font-pixel text-xs leading-none font-medium tracking-[0.08em] uppercase",
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
