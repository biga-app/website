"use client";

import { LockIcon } from "lucide-react";

import { Scaled } from "@/components/showcase/scaled";
import { ShowcaseProvider } from "@/components/showcase/showcase-provider";
import { PanelCode, PanelFiles, PanelHeader, PanelTimeline } from "@/components/showcase/viewer-panels";
import { ExplodedUI } from "@/components/ui/exploded-ui";

/*
 * The real session viewer, pulled apart. Each layer is one region of the
 * viewer drawn by the viewer's own components (`FileTree`, `HistoryPanel`,
 * `SessionHeader`, …) reading a snapshot of this project's CLI repository,
 * so what floats apart is what a viewer actually gets.
 *
 * The plane is a 1280 × 800 design, so every region keeps the viewer's real
 * proportions: layers are placed in percentages of it, and each one scales
 * its content from the width it is designed at (`Scaled`).
 */
const W = 1280;
const H = 800;
const BAR = 40; // the browser's own strip, above the page
const HEAD = 48; // the viewer's header
const BODY = H - BAR - HEAD;

const FILES = 282;
const TIMELINE = 320;
const CODE = W - FILES - TIMELINE;

export function PrivacyStack({ host }: { host: string }) {
  return (
    <ShowcaseProvider>
      <ExplodedUI
        walkthrough
        spread={0.12}
        stageClassName="top-14 h-[calc(100dvh-3.5rem)]"
        className="aspect-[16/10] w-full max-w-4xl"
      >
        <ExplodedUI.Layer
          label="Their browser"
          description="A tab on your link. No account and nothing to install, and nothing in it can write back to your disk."
        >
          <div className="bg-background size-full">
            <Scaled width={W} height={H}>
              <div className="bg-muted/60 flex h-10 items-center gap-3 border-b px-4">
                <span aria-hidden className="flex gap-2">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="bg-foreground/15 size-3 rounded-full" />
                  ))}
                </span>
                <span
                  translate="no"
                  className="bg-background text-muted-foreground mx-auto flex h-7 items-center gap-2 rounded-full border px-5 font-mono text-[13px]"
                >
                  <LockIcon className="size-3" strokeWidth={2} />
                  {host}/session/k3f9zq2a
                </span>
                <span className="w-14" />
              </div>
            </Scaled>
          </div>
        </ExplodedUI.Layer>

        <ExplodedUI.Layer
          label="Code"
          description="Read-only and highlighted. Files over 2 MB and binaries show a placeholder, never their bytes."
          className="top-[11%] left-[22%] h-[89%] w-[53%]"
        >
          <Scaled width={CODE} height={BODY}>
            <div style={{ width: CODE, height: BODY }}>
              <PanelCode />
            </div>
          </Scaled>
        </ExplodedUI.Layer>

        <ExplodedUI.Layer
          label="Files"
          description=".env, keys, .git and node_modules never reach this tree. A build folder like dist/ shows as an empty stub."
          className="top-[11%] left-0 h-[89%] w-[22%]"
        >
          <Scaled width={FILES} height={BODY}>
            <div style={{ width: FILES, height: BODY }}>
              <PanelFiles />
            </div>
          </Scaled>
        </ExplodedUI.Layer>

        <ExplodedUI.Layer
          label="Timeline"
          description="One checkpoint for each burst of saves, and only the files that changed. A save that changes nothing sends nothing."
          className="top-[11%] right-0 h-[89%] w-[25%]"
        >
          <Scaled width={TIMELINE} height={BODY}>
            <div style={{ width: TIMELINE, height: BODY }}>
              <PanelTimeline />
            </div>
          </Scaled>
        </ExplodedUI.Layer>

        <ExplodedUI.Layer
          label="Header"
          description="Whether the broadcast is live, the session's name and the link you shared."
          className="top-[5%] left-0 h-[6%] w-full"
        >
          <Scaled width={W} height={HEAD}>
            <div style={{ width: W, height: HEAD }}>
              <PanelHeader live />
            </div>
          </Scaled>
        </ExplodedUI.Layer>
      </ExplodedUI>
    </ShowcaseProvider>
  );
}
