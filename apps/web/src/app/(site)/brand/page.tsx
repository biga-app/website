import { DownloadIcon } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";

import { Annotation } from "@/components/home/annotation";
import { CopyValue } from "@/components/brand/copy-value";
import { BigaLogo, MARK_CELLS } from "@/components/site/biga-mark";
import { HatchBand, INSET, Section, SectionHeader } from "@/components/site/frame";
import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { Button } from "@/components/ui/button";
import { Mark, Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Brand",
  description: "The biga mark, colours and type, with files to download.",
};

/* ── Logo ───────────────────────────────────────────────── */

const DOWNLOADS = [
  { file: "biga-mark.svg", label: "Mark", note: "for light grounds" },
  { file: "biga-mark-light.svg", label: "Mark", note: "for dark grounds" },
  { file: "biga-logo.svg", label: "Logo", note: "for light grounds" },
  { file: "biga-logo-light.svg", label: "Logo", note: "for dark grounds" },
  { file: "biga-icon.svg", label: "App icon", note: "on its tile" },
];

function Tile({
  className,
  children,
  caption,
}: {
  className?: string;
  children: ReactNode;
  caption: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div className={cn("border-rail grid aspect-[4/3] place-items-center rounded-xl border", className)}>{children}</div>
      <figcaption className="text-muted-foreground font-body text-xs">{caption}</figcaption>
    </figure>
  );
}

/* ── Construction: the mark on its grid ─────────────────── */

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
      <g className="font-pixel" fill="currentColor" fontSize={11} letterSpacing={0.9}>
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

/* ── Don'ts ─────────────────────────────────────────────── */

/** A mark the guidelines forbid, drawn by hand so the "wrong" part is exact. */
function Wrong({
  caption,
  children,
  className,
  style,
}: {
  caption: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cn("border-rail bg-muted/40 relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border", className)}
        style={style}
      >
        {children}
        <span aria-hidden className="bg-destructive/90 absolute top-0 right-3 h-full w-px rotate-[28deg]" />
      </div>
      <figcaption className="font-body text-xs">{caption}</figcaption>
    </figure>
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

/* ── Colour ─────────────────────────────────────────────── */

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
    role: "The highlighter: a fill behind a phrase, a ticker band, the one loud cell. Text on it is always Ink.",
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

/* ── Type ───────────────────────────────────────────────── */

const TYPE = [
  {
    name: "Bricolage Grotesque",
    use: "Display. Headlines and the wordmark, at 800, tracked tight.",
    className: "font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl",
    sample: "Aa biga",
  },
  {
    name: "Manrope",
    use: "Body. Running copy and interface text.",
    className: "font-body text-5xl font-medium tracking-[-0.02em] sm:text-6xl",
    sample: "Aa biga",
  },
  {
    name: "Geist Mono",
    use: "Code, commands, paths and hashes.",
    className: "font-mono text-4xl sm:text-5xl",
    sample: "Aa biga()",
  },
  {
    name: "Geist Pixel Square",
    use: "Annotations and chapter markers, uppercase, opened up to 0.08em.",
    className: "font-pixel text-3xl tracking-[0.08em] uppercase sm:text-4xl",
    sample: "Aa biga",
  },
];

export default function BrandPage() {
  return (
    <div className="biga-landing font-body relative overflow-x-clip">
      <SiteHeader />

      <main id="content">
        <Section id="brand" className="biga-glow relative isolate" columnClassName="pt-12 pb-14 sm:pt-16 lg:pt-20">
          <div className="flex max-w-3xl flex-col items-start gap-5">
            <span className="text-brand-text font-pixel flex items-center gap-2.5 text-xs leading-none tracking-[0.08em] uppercase">
              <span aria-hidden className="bg-brand-mark size-2 shrink-0 rotate-45" />
              Brand
            </span>
            <Typography variant="display" as="h1" className="max-w-[14ch]">
              A <Mark>pixel</Mark> that just got saved.
            </Typography>
            <Typography variant="lead" tone="muted" className="max-w-[48ch]">
              The mark is a lowercase b on a 5 × 7 grid, the same grid the site&apos;s labels are set on, with its
              top-right cell lit: the save that just went out.
            </Typography>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
              <BigaLogo cell={5} />
              <Annotation className="ml-1">Files below</Annotation>
            </div>
          </div>
        </Section>

        {/* Logo */}
        <Section id="logo">
          <SectionHeader
            eyebrow="01 / Logo"
            title={<Typography variant="h2">One mark, three grounds.</Typography>}
            lead={
              <Typography variant="lead" tone="muted">
                The mark is Ink on light and paper-white on dark. The green cell never changes, and is never the only
                thing on the ground.
              </Typography>
            }
          />

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Tile caption="On white, in Ink" className="bg-white text-[#0c0d10]">
              <BigaLogo cell={6} />
            </Tile>
            <Tile caption="On Night, in paper-white" className="bg-[#0b0c0e] text-[#f4f5f6]">
              <BigaLogo cell={6} />
            </Tile>
            <Tile caption="On Marker green, in Ink" className="bg-brand-mark text-brand-mark-foreground">
              <span className="inline-flex items-center gap-3">
                <RawMark cell={6} lit="#09090b" />
                <span translate="no" className="font-display text-[2.6rem] leading-none font-extrabold tracking-[-0.04em]">
                  biga
                </span>
              </span>
            </Tile>
          </div>

          <div className="mt-14 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border-rail text-foreground rounded-xl border p-6">
              <Construction />
            </div>
            <div className="flex flex-col gap-5">
              <Typography variant="h3">Built on the grid</Typography>
              <Typography variant="body" tone="muted">
                Sixteen cells in Ink or paper-white and one in green. Leave one cell of clear space on every side, and
                don&apos;t draw it smaller than 3 px a cell (15 × 21 px), where the cells stay crisp.
              </Typography>
              <ul className="font-body text-muted-foreground flex flex-col gap-2 text-sm">
                <li className="flex gap-2.5">
                  <span aria-hidden className="bg-brand-mark mt-1.5 size-1.5 shrink-0 rotate-45" />
                  The wordmark is always lowercase: biga.
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden className="bg-brand-mark mt-1.5 size-1.5 shrink-0 rotate-45" />
                  In running text it is biga, not Biga or BIGA.
                </li>
                <li className="flex gap-2.5">
                  <span aria-hidden className="bg-brand-mark mt-1.5 size-1.5 shrink-0 rotate-45" />
                  Where only the mark fits, use the mark.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14">
            <Typography variant="h3">Don&apos;t</Typography>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Wrong caption="Recolour the saved cell">
                <RawMark cell={7} lit="currentColor" />
              </Wrong>
              <Wrong caption="Stretch or squash it">
                <span className="inline-block origin-center scale-x-[1.7]">
                  <RawMark cell={7} />
                </span>
              </Wrong>
              <Wrong caption="Outline it or add effects">
                <span className="[filter:drop-shadow(0_0_6px_var(--brand))]">
                  <RawMark cell={7} ink="none" />
                </span>
              </Wrong>
              <Wrong caption="Set it in capitals">
                <span translate="no" className="font-display text-4xl font-extrabold tracking-[-0.04em]">
                  BIGA
                </span>
              </Wrong>
            </div>
          </div>
        </Section>

        <HatchBand />

        {/* Colour */}
        <Section id="colour">
          <SectionHeader
            eyebrow="02 / Colour"
            title={<Typography variant="h2">One green, used as a highlighter.</Typography>}
            lead={
              <Typography variant="lead" tone="muted">
                Green means &ldquo;this is the bit to read&rdquo;. It is never decoration. The viewer&apos;s blue means
                something else: now.
              </Typography>
            }
          />

          <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SWATCHES.map((swatch) => (
              <li key={swatch.name} className="border-rail overflow-hidden rounded-xl border">
                <div
                  className={cn(
                    "flex h-28 items-end justify-between p-3",
                    swatch.on === "dark" ? "text-[#09090b]" : "text-white"
                  )}
                  style={{ backgroundColor: SWATCH_STYLE[swatch.name] }}
                >
                  <span className="font-display text-xl font-bold tracking-[-0.02em]">{swatch.name}</span>
                  <span translate="no" className="font-mono text-xs opacity-80">
                    {swatch.token}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <Typography variant="small" tone="muted">
                    {swatch.role}
                  </Typography>
                  <div className="flex flex-wrap items-center gap-x-1">
                    <CopyValue value={swatch.light.hex} label={`${swatch.name} hex`} />
                    <CopyValue value={swatch.light.oklch} label={`${swatch.name} OKLCH`} />
                  </div>
                  {swatch.dark ? (
                    <div className="border-rail flex flex-wrap items-center gap-x-1 border-t pt-2">
                      <span className="text-muted-foreground font-pixel mr-1 text-[0.6875rem] tracking-[0.08em] uppercase">
                        Dark
                      </span>
                      <CopyValue value={swatch.dark.hex} label={`${swatch.name} dark hex`} />
                      <CopyValue value={swatch.dark.oklch} label={`${swatch.name} dark OKLCH`} />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center gap-3">
            <span aria-hidden className="size-4 shrink-0 rounded" style={{ backgroundColor: "#2d5bff" }} />
            <Typography variant="small" tone="muted">
              Viewer blue, <span translate="no" className="font-mono">#2d5bff</span> (<span translate="no" className="font-mono">#4f78ff</span> on dark), marks
              the live broadcast and the newest checkpoint inside the viewer, and nowhere else.
            </Typography>
          </div>
        </Section>

        <HatchBand />

        {/* Type */}
        <Section id="type">
          <SectionHeader
            eyebrow="03 / Type"
            title={<Typography variant="h2">Four faces, four jobs.</Typography>}
            lead={
              <Typography variant="lead" tone="muted">
                A tight grotesque to be loud, a humanist sans to be read, a mono for things you type, and a pixel face
                for the small marginal notes.
              </Typography>
            }
          />

          <dl className="border-rail mt-10 divide-y rounded-xl border">
            {TYPE.map((face) => (
              <div key={face.name} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-6">
                <div className="flex flex-col gap-1.5">
                  <dt className="font-body text-sm font-semibold">{face.name}</dt>
                  <dd className="font-body text-muted-foreground text-sm">{face.use}</dd>
                </div>
                <p translate="no" className={cn("leading-none", face.className)}>
                  {face.sample}
                </p>
              </div>
            ))}
          </dl>
        </Section>

        <HatchBand />

        {/* Elements */}
        <Section id="elements">
          <SectionHeader
            eyebrow="04 / Elements"
            title={<Typography variant="h2">The page is a ruled column.</Typography>}
            lead={
              <Typography variant="lead" tone="muted">
                Hairline rails with diamond joints, hatched spacer bands, a marker stroke across the phrase that
                matters, and notes in the margin.
              </Typography>
            }
          />

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="border-rail flex flex-col gap-3 rounded-xl border p-5">
              <Typography variant="label" tone="muted">
                Marker
              </Typography>
              <Typography variant="statement">
                Stream your <Mark>saves</Mark>, not your screen.
              </Typography>
            </div>
            <div className="border-rail flex flex-col gap-3 rounded-xl border p-5">
              <Typography variant="label" tone="muted">
                Margin note
              </Typography>
              <div className="pt-4">
                <Annotation>Psst, start here</Annotation>
              </div>
            </div>
            <div className="border-rail flex flex-col gap-3 overflow-hidden rounded-xl border md:col-span-2">
              <Typography variant="label" tone="muted" className="px-5 pt-5">
                Hatch band and rails
              </Typography>
              <div className="biga-hatch border-rail h-8 border-y" />
              <div className="mx-auto mb-5 flex h-16 w-full max-w-xs items-center justify-center border-x">
                <span className="text-muted-foreground font-pixel text-xs tracking-[0.08em] uppercase">The column</span>
              </div>
            </div>
          </div>
        </Section>

        <HatchBand />

        {/* Voice + downloads */}
        <Section id="files" bleed>
          <div className={cn(INSET, "py-16 sm:py-20")}>
            <SectionHeader
              eyebrow="05 / Files"
              title={<Typography variant="h2">Take the files.</Typography>}
              lead={
                <Typography variant="lead" tone="muted">
                  Vector, with the wordmark already outlined, so nothing depends on a font being installed.
                </Typography>
              }
            />
            <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {DOWNLOADS.map((item) => (
                <li key={item.file}>
                  <Button
                    asChild
                    variant="outline"
                    className="border-rail group h-auto w-full justify-between gap-4 rounded-xl p-4 text-left font-normal whitespace-normal shadow-none"
                  >
                    <a href={`/brand/${item.file}`} download>
                      <span className="flex flex-col gap-1">
                        <span className="font-body text-sm font-semibold">{item.label}</span>
                        <span className="text-muted-foreground font-body text-xs">{item.note}</span>
                        <span translate="no" className="text-muted-foreground font-mono text-[11px]">
                          {item.file}
                        </span>
                      </span>
                      <DownloadIcon
                        aria-hidden
                        className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 transition-colors"
                        strokeWidth={1.75}
                      />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>

            <div className="border-rail mt-14 flex flex-col gap-3 border-t pt-8">
              <Typography variant="label" tone="muted">
                In a sentence
              </Typography>
              <Typography variant="statement" className="max-w-[34ch]">
                biga broadcasts a folder as a live, read-only link.
              </Typography>
              <Typography variant="small" tone="muted" className="max-w-[60ch]">
                Say what it does and what it doesn&apos;t need: no account, nothing to install. Prefer &ldquo;save&rdquo;
                and &ldquo;checkpoint&rdquo; to anything about streaming video, because what biga sends is files.
              </Typography>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </div>
  );
}
