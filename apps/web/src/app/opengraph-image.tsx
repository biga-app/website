import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const alt = "biga: stream your saves, not your screen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The site's dark tokens, as sRGB (Satori has no oklch()).
const GROUND = "#0b0c0e";
const CARD = "#0d1014";
const RAIL = "rgba(255,255,255,0.10)";
const FG = "#f4f5f6";
const MUTED = "#9b9fa5";
const MARK = "#35c177"; // --brand, dark theme

const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace";

const siteUrl = siteConfig.url;
const share = `${siteUrl}/session/k3f9zq2a`.replace(/^https?:\/\//, "");

/** The pixel "b" from the site mark, with its green "just saved" cell. */
const CELLS = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 2], [2, 2], [3, 2],
  [4, 3], [4, 4], [4, 5],
  [1, 6], [2, 6], [3, 6],
];

const HEADLINE = "Stream your saves, not your screen.";
const SUBTEXT = "One command turns a folder into a live, read-only link.";
const STATUS = "4 checkpoints, 48 files";

/**
 * A Google font, subset to `text`. Google Fonts serves TTF (which Satori can
 * read) to a client that doesn't ask for woff2. Null if the fetch fails, so
 * the card still renders in the default face.
 */
async function googleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const query = `family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(`https://fonts.googleapis.com/css2?${query}`)).text();
    const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

function Mark({ cell }: { cell: number }) {
  return (
    <div style={{ position: "relative", width: cell * 5, height: cell * 7, display: "flex" }}>
      {CELLS.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          style={{ position: "absolute", left: x! * cell, top: y! * cell, width: cell, height: cell, background: FG }}
        />
      ))}
      <div style={{ position: "absolute", left: 4 * cell, top: 0, width: cell, height: cell, background: MARK }} />
    </div>
  );
}

export default async function OpengraphImage() {
  const [display, body, mono] = await Promise.all([
    googleFont("Geist", 600, `${HEADLINE}biga`),
    googleFont("Geist", 400, SUBTEXT),
    googleFont("Geist Mono", 400, `$ biga start live ${share} ${STATUS}`),
  ]);
  const fonts = [
    display && { name: "Geist", data: display, weight: 600 as const, style: "normal" as const },
    body && { name: "Geist", data: body, weight: 400 as const, style: "normal" as const },
    mono && { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ].filter((font) => font !== null);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: GROUND, fontFamily: "sans-serif" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "38px 96px 60px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Mark cell={5} />
            <div style={{ color: FG, fontSize: 36, fontWeight: 600, letterSpacing: "-0.05em", fontFamily: "Geist" }}>
              biga
            </div>
          </div>

          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 40, paddingTop: 70 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 580 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  color: FG,
                  fontFamily: "Geist",
                  fontSize: 62,
                  fontWeight: 600,
                  letterSpacing: "-0.045em",
                  lineHeight: 1.05,
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap" }}>Stream your</div>
                  <div
                    style={{
                      display: "flex",
                      position: "relative",
                      flexShrink: 0,
                      marginLeft: 16,
                      padding: "0 12px 4px",
                      border: `2px solid ${MARK}`,
                    }}
                  >
                    saves
                    {[[-6, -6], [-6, 52], [152, -6], [152, 52]].map(([x, y]) => (
                      <div key={`${x}-${y}`} style={{ position: "absolute", left: x, top: y, width: 10, height: 10, background: GROUND, border: `2px solid ${MARK}` }} />
                    ))}
                  </div>
                  <div style={{ display: "flex" }}>,</div>
                </div>
                <div style={{ display: "flex" }}>not your screen.</div>
              </div>
              <div style={{ color: MUTED, fontFamily: "Geist", fontSize: 24, lineHeight: 1.45, marginTop: 26, maxWidth: 500 }}>
                {SUBTEXT}
              </div>
            </div>

            <div
              style={{
                width: 360,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: CARD,
                border: `1px solid ${RAIL}`,
                borderRadius: 12,
                padding: "24px 26px",
                fontFamily: `'Geist Mono', ${MONO}`,
                fontSize: 19,
                color: FG,
              }}
            >
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ color: MARK }}>$</span>
                <span>biga start</span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: 6,
                  padding: "16px 18px",
                  border: `1px solid ${RAIL}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 9, background: MARK }} />
                  <span style={{ color: MARK }}>live</span>
                </div>
                <div style={{ display: "flex", color: FG, fontSize: 15 }}>{share}</div>
                <div style={{ display: "flex", color: MUTED, fontSize: 17 }}>{STATUS}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
