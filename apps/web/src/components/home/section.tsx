import type { ComponentProps, ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function HomeSection({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("border-b", className)} {...props}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">{children}</div>
    </section>
  );
}

export function SectionTitle({ title, lead, className }: { title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", className)}>
      <Typography variant="h2">{title}</Typography>
      {lead ? (
        <Typography variant="lead" tone="muted" className="max-w-[56ch]">
          {lead}
        </Typography>
      ) : null}
    </div>
  );
}
