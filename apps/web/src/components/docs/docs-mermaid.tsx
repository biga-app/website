"use client";

import { Mermaid as FumadocsMermaid } from "fumadocs-mermaid/ui";
import { type ReactNode, Suspense } from "react";

import { cn } from "@biga/ui/lib/utils";

/*
 * Diagrams in the docs are fenced ```mermaid blocks. `fumadocs-mermaid`'s
 * remark plugin turns each one into a `<Mermaid chart config />`, and this is
 * the component MDX maps that name to: it draws with the plugin's renderer
 * (client-only, theme-aware through next-themes) and adds the figure around
 * it. Extra attributes on the fence ride along in `config`, so
 *
 *   ```mermaid title="…" summary="…" caption="…"
 *
 * names the figure, says what it shows for anyone who can't see it, and
 * captions it.
 */

/**
 * Brand touches over Mermaid's own light and dark themes: nodes and actors on
 * the docs' card colour, hairline borders, notes in the highlighter green.
 * Mermaid writes this CSS into the SVG, which sits in the page, so the docs'
 * CSS variables resolve inside it.
 */
const THEME_CSS = `
  .node rect, .node polygon, .node circle, .node ellipse, .node path, .actor, .entityBox, .statediagram-state rect {
    fill: var(--color-fd-card) !important;
    stroke: var(--color-fd-border) !important;
  }
  .cluster rect { fill: var(--color-fd-muted) !important; stroke: var(--color-fd-border) !important; }
  .labelBox { fill: var(--color-fd-muted) !important; stroke: var(--color-fd-border) !important; }
  .attributeBoxOdd { fill: var(--color-fd-card) !important; }
  .attributeBoxEven { fill: var(--color-fd-muted) !important; }
  .actor-line { stroke: var(--color-fd-border) !important; }
  .note, .noteRect, .labelBox + .note {
    fill: color-mix(in oklab, var(--brand-mark) 22%, var(--background)) !important;
    stroke: var(--brand) !important;
  }
  .noteText, .noteText > tspan { fill: var(--color-fd-foreground) !important; }
  .edgeLabel, .edgeLabel p, .edgeLabel rect { background-color: var(--background) !important; }
  .messageText, .labelText, .loopText, text.actor > tspan { fill: var(--color-fd-foreground) !important; }
`;

const KNOWN = new Set(["title", "summary", "caption"]);

/**
 * Tighter spacing than Mermaid's defaults, which are drawn for a full-width
 * canvas: the docs column is about 700px, and a diagram wider than it is
 * scaled down until its text is too small to read.
 */
const LAYOUT = {
  flowchart: { nodeSpacing: 28, rankSpacing: 34, padding: 10, curve: "basis" },
  sequence: { width: 128, actorMargin: 24, messageMargin: 26, boxMargin: 8, noteMargin: 8, wrap: true, mirrorActors: false },
  er: { minEntityWidth: 90, entityPadding: 10 },
};

/** Splits the fence's extra attributes into the figure's words and what Mermaid should still see. */
function readConfig(raw: string | undefined) {
  const words: Record<string, string> = {};
  if (!raw) return { words, rest: JSON.stringify({ config: JSON.stringify(LAYOUT) }) };
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const rest: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (KNOWN.has(key)) words[key] = value;
      else rest[key] = value;
    }
    // A fence that brings its own `config` wins; otherwise the layout above applies.
    if (!("config" in rest)) rest.config = JSON.stringify(LAYOUT);
    return { words, rest: JSON.stringify(rest) };
  } catch {
    return { words, rest: raw };
  }
}

export function DocsMermaid({
  chart,
  config,
  exportable,
  zoomable,
  theme,
  className,
}: {
  chart: string;
  config?: string;
  exportable?: string;
  zoomable?: string;
  theme?: "default" | "dark" | "neutral" | "forest";
  className?: string;
}) {
  const { words, rest } = readConfig(config);
  const fallback: ReactNode = (
    <p className="text-fd-muted-foreground py-10 text-center text-sm">Drawing the diagram…</p>
  );

  return (
    <figure className={cn("not-prose my-6", className)}>
      <div
        role="img"
        aria-label={words.title ?? "Diagram"}
        className="border-fd-border bg-fd-card/30 overflow-x-auto rounded-xl border p-3 sm:p-5"
      >
        <Suspense fallback={fallback}>
          <FumadocsMermaid
            chart={chart}
            config={rest}
            exportable={exportable}
            zoomable={zoomable}
            theme={theme}
            themeCSS={`margin: 0 auto;${THEME_CSS}`}
          />
        </Suspense>
      </div>
      {words.summary ? <p className="sr-only">{words.summary}</p> : null}
      {words.caption ? <figcaption className="text-fd-muted-foreground mt-2 text-sm">{words.caption}</figcaption> : null}
    </figure>
  );
}
