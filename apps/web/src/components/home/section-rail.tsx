"use client";

import { cn } from "@biga/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

type RailSection = { id: string; label: string };

function useActiveSection(sections: readonly RailSection[]): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(sections.findIndex((section) => section.id === entry.target.id));
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    sections.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);
  return active;
}

function useScrollReadout() {
  const readout = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const span = document.documentElement.scrollHeight - window.innerHeight;
      if (readout.current) readout.current.textContent = `${span > 0 ? Math.round((window.scrollY / span) * 100) : 0}%`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);
  return readout;
}

export function SectionRail({ sections }: { sections: readonly RailSection[] }) {
  const active = useActiveSection(sections);
  const readout = useScrollReadout();
  return (
    <nav aria-label="Page sections" className="fixed start-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 min-[1400px]:flex">
      <ol className="before:bg-border relative flex flex-col gap-3 before:absolute before:inset-y-0 before:start-1/2 before:w-px">
        {sections.map((section, index) => (
          <li key={section.id} className="group relative">
            <a
              href={`#${section.id}`}
              aria-label={section.label}
              aria-current={index === active ? "location" : undefined}
              className={cn(
                "bg-background text-muted-foreground focus-visible:ring-ring/50 relative grid size-6 place-items-center rounded-full border font-mono text-[10px] tabular-nums transition-colors outline-none focus-visible:ring-[3px]",
                index === active && "border-brand bg-brand/10 text-brand-text"
              )}
            >
              {index + 1}
            </a>
            <span aria-hidden className="bg-popover text-popover-foreground pointer-events-none absolute start-8 top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              {section.label}
            </span>
          </li>
        ))}
      </ol>
      <span ref={readout} aria-hidden className="text-muted-foreground font-mono text-[10px] tabular-nums">
        0%
      </span>
    </nav>
  );
}
