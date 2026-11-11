import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CopyValue } from "@/components/brand/copy-value";
import { BigaLogo, MARK_CELLS } from "@biga/ui/components/biga-mark";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { Badge } from "@biga/ui/components/badge";
import { Button } from "@biga/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";
import { Typography } from "@biga/ui/components/typography";

export const metadata: Metadata = {
  title: "Brand",
  description: "The biga mark, colours and type, with files to download.",
};

const DOWNLOADS = [
  { file: "biga-mark.svg", label: "Mark", note: "for light grounds" },
  { file: "biga-mark-light.svg", label: "Mark", note: "for dark grounds" },
  { file: "biga-logo.svg", label: "Logo", note: "for light grounds" },
  { file: "biga-logo-light.svg", label: "Logo", note: "for dark grounds" },
  { file: "biga-icon.svg", label: "App icon", note: "on its tile" },
];

function Construction() {
  const cell = 28;
  const pad = 56;
  const w = 5 * cell + pad * 2;
  const h = 7 * cell + pad * 2;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="The mark drawn on a 5 by 7 grid, with one cell of clear space on every side. The top right cell is green."
      className="mx-auto h-auto w-full max-w-[22rem]"
    >
      {/* clear space */}
      <rect
        x={pad / 2}
        y={pad / 2}
        width={w - pad}
        height={h - pad}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeDasharray="4 5"
      />
      {/* grid */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={pad + i * cell}
          x2={pad + i * cell}
          y1={pad}
          y2={pad + 7 * cell}
          stroke="currentColor"
          strokeOpacity={0.14}
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={pad}
          x2={pad + 5 * cell}
          y1={pad + i * cell}
          y2={pad + i * cell}
          stroke="currentColor"
          strokeOpacity={0.14}
        />
      ))}
      {MARK_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={pad + x * cell} y={pad + y * cell} width={cell} height={cell} fill="currentColor" />
      ))}
      <rect x={pad + 4 * cell} y={pad} width={cell} height={cell} fill="var(--brand)" />
      <g className="font-mono" fill="currentColor" fontSize={11} letterSpacing={0.9}>
        <text x={pad + 5 * cell + 8} y={pad + cell / 2 + 4} fill="var(--brand-text)">
          SAVED
        </text>
        <text x={pad} y={pad / 2 - 8} opacity={0.6}>
          5 × 7 CELLS
        </text>
        <text x={pad} y={h - pad / 2 + 20} opacity={0.6}>
          CLEAR SPACE: 1 CELL
        </text>
      </g>
    </svg>
  );
}


function RawMark({ cell = 6, lit = "var(--brand)", ink = "currentColor" }: { cell?: number; lit?: string; ink?: string }) {
  return (
    <svg viewBox="0 0 5 7" width={5 * cell} height={7 * cell} shapeRendering="crispEdges" aria-hidden>
      {MARK_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={ink} />
      ))}
      <rect x={4} y={0} width={1} height={1} fill={lit} />
    </svg>
  );
}


type Swatch = {
  name: string;
  token: string;
  role: string;
  light: { oklch: string; hex: string };
  dark?: { oklch: string; hex: string };
  /** Text colour that reads on the swatch. */
  on: "dark" | "light";
};

const SWATCHES: Swatch[] = [
  {
    name: "Marker",
    token: "--brand-mark",
    role: "The loud green: the lit cell of the mark and large fills. Text on it is always Ink.",
    light: { oklch: "oklch(0.8196 0.1546 155)", hex: "#63e197" },
    on: "dark",
  },
  {
    name: "Signal",
    token: "--brand",
    role: "Strokes, packets, dots and icons. Three to one against the page is enough for a shape.",
    light: { oklch: "oklch(0.5811 0.1403 155)", hex: "#0e9254" },
    dark: { oklch: "oklch(0.72 0.16 155)", hex: "#35c177" },
    on: "light",
  },
  {
    name: "Green text",
    token: "--brand-text",
    role: "Small green type. Seven to one on white and on the dark ground.",
    light: { oklch: "oklch(0.4416 0.1112 154.1)", hex: "#006435" },
    dark: { oklch: "oklch(0.8196 0.1546 155)", hex: "#63e197" },
    on: "light",
  },
  {
    name: "Ink",
    token: "--foreground",
    role: "Text and the mark on light grounds.",
    light: { oklch: "oklch(0.16 0.006 260)", hex: "#0c0d10" },
    on: "light",
  },
  {
    name: "Night",
    token: "--background",
    role: "The dark page, and the mark's ground in the app icon.",
    light: { oklch: "oklch(0.155 0.005 260)", hex: "#0b0c0e" },
    on: "light",
  },
  {
    name: "Terminal",
    token: "--terminal",
    role: "Command lines and code, dark in both themes.",
    light: { oklch: "oklch(0.1716 0.0097 255.65)", hex: "#0d1014" },
    on: "light",
  },
];


const SWATCH_STYLE: Record<string, string> = {
  Marker: "#63e197",
  Signal: "#0e9254",
  "Green text": "#006435",
  Ink: "#0c0d10",
  Night: "#0b0c0e",
  Terminal: "#0d1014",
};


const TYPE = [
  {
    name: "Geist",
    use: "Headlines, the wordmark and interface text. Semibold, tracked tight at large sizes.",
    className: "text-5xl font-semibold tracking-[-0.045em] sm:text-6xl",
    sample: "Aa biga",
  },
  {
    name: "Geist Mono",
    use: "Code, commands, paths, hashes and small annotations.",
    className: "font-mono text-4xl sm:text-5xl",
    sample: "Aa biga()",
  },
];

function Section({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:py-20">
        <div className="flex max-w-2xl flex-col gap-3">
          <Typography variant="h2">{title}</Typography>
          <Typography variant="lead" tone="muted">
            {lead}
          </Typography>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function BrandPage() {
  return (
    <div className="relative overflow-x-clip">
      <SiteHeader />
      <main id="content">
        <section className="border-b">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 pt-12 pb-14 sm:px-6 lg:pt-20">
            <Typography variant="display" as="h1" className="max-w-[16ch]">
              A pixel that just got saved.
            </Typography>
            <Typography variant="lead" tone="muted" className="max-w-[52ch]">
              The mark is a lowercase b on a 5 by 7 grid, with its top-right cell lit: the save that just went out.
            </Typography>
            <BigaLogo cell={5} />
          </div>
        </section>

        <Section title="Logo" lead="Vector files with the wordmark already outlined, so nothing depends on a font being installed.">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card>
              <CardContent>
                <Construction />
              </CardContent>
            </Card>
            <ul className="grid content-start gap-3 sm:grid-cols-2">
              {DOWNLOADS.map((item) => (
                <li key={item.file}>
                  <Button
                    render={<a href={`/brand/${item.file}`} download />}
                    variant="outline"
                    className="h-auto w-full justify-between gap-4 p-4 text-start font-normal whitespace-normal"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className="text-muted-foreground text-xs">{item.note}</span>
                      <span translate="no" className="text-muted-foreground font-mono text-[11px]">
                        {item.file}
                      </span>
                    </span>
                    <DownloadIcon aria-hidden className="text-muted-foreground size-4 shrink-0" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Do not stretch or recolour the mark.", "text-foreground"],
              ["Do not light more than one cell.", "text-foreground"],
              ["Keep one cell of clear space on every side.", "text-foreground"],
              ["Do not set the wordmark in another face.", "text-foreground"],
            ].map(([rule]) => (
              <Card key={rule} size="sm">
                <CardContent className="flex items-start gap-3 text-sm">
                  <RawMark cell={4} />
                  <span>{rule}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Colour" lead="Green means read this. The viewer keeps its own blue for what is live right now.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SWATCHES.map((swatch) => (
              <li key={swatch.name}>
                <Card className="h-full">
                  <div className="h-20 w-full" style={{ background: SWATCH_STYLE[swatch.name] }} aria-hidden />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {swatch.name}
                      <Badge variant="outline" translate="no" className="font-mono font-normal">
                        {swatch.token}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{swatch.role}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <CopyValue value={swatch.light.hex} />
                    <CopyValue value={swatch.light.oklch} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type" lead="Geist for everything people read, Geist Mono for everything people type.">
          <ul className="grid gap-4 lg:grid-cols-2">
            {TYPE.map((face) => (
              <li key={face.name}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>{face.name}</CardTitle>
                    <CardDescription>{face.use}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className={face.className} translate="no">
                      {face.sample}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
