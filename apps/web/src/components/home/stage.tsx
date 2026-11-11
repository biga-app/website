"use client";

import { Card, CardContent } from "@biga/ui/components/card";
import { cn } from "@biga/ui/lib/utils";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DemoViewer } from "@/components/demo/demo-viewer";

import { useDemo } from "@/components/demo/demo-provider";
import { CHAPTERS } from "@/components/home/chapters";
import { CommandStrip } from "@/components/home/command-strip";
import { GhostCursor, type CursorHandle } from "@/components/home/ghost-cursor";
import { IgnoreRules } from "@/components/home/ignore-rules";
import { TourDock } from "@/components/home/tour-dock";

const PRIVACY = CHAPTERS.findIndex((chapter) => chapter.id === "privacy");
const SCROLL_PER_CHAPTER_SVH = 55;

function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -inset-y-10 -z-10">
      <div className="bg-brand/15 absolute inset-x-0 top-1/4 mx-auto h-[28rem] w-[min(64rem,90%)] rounded-full blur-[120px]" />
      <div className="absolute inset-0 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  );
}

function PrivacyOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22 }}
      className="bg-popover/95 text-popover-foreground absolute end-4 bottom-10 z-40 w-[23rem] rounded-xl border p-3 shadow-xl backdrop-blur"
    >
      <p className="mb-1 text-sm font-medium">Ignore rules</p>
      <IgnoreRules />
    </motion.div>
  );
}

function scrollToChapter(track: HTMLElement, index: number): void {
  const top = track.getBoundingClientRect().top + window.scrollY;
  const span = track.offsetHeight - window.innerHeight;
  window.scrollTo({ top: top + ((index + 0.5) / CHAPTERS.length) * span, behavior: "instant" });
}

export function Stage({ host }: { host: string }) {
  const { readActions, backend } = useDemo();
  const reduce = useReducedMotion() ?? false;
  const wide = useWide();
  const pinned = wide && !reduce;
  const [active, setActive] = useState(0);
  const [driving, setDriving] = useState(false);
  const activeRef = useRef(0);
  const drivingRef = useRef(false);
  const token = useRef(0);
  const track = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDivElement>(null);
  const cursor = useRef<CursorHandle>(null);

  const { scrollYProgress: entrance } = useScroll({ target: track, offset: ["start end", "start start"] });
  const { scrollYProgress: progress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const rotateX = useTransform(entrance, [0, 1], [14, 0]);
  const scale = useTransform(entrance, [0, 1], [0.93, 1]);
  const lift = useTransform(entrance, [0, 1], [48, 0]);

  const run = useCallback(
    (index: number) => {
      const actions = readActions();
      if (actions && backend) CHAPTERS[index]!.run({ actions, backend });
    },
    [readActions, backend]
  );

  const play = useCallback(
    async (index: number) => {
      const id = ++token.current;
      const target = !reduce && viewer.current ? CHAPTERS[index]!.target(viewer.current) : null;
      if (target && cursor.current) {
        await cursor.current.glideTo(target);
        if (id !== token.current) return;
        await cursor.current.press();
        if (id !== token.current) return;
      }
      run(index);
      cursor.current?.rest();
    },
    [reduce, run]
  );

  const settle = useCallback((index: number) => {
    activeRef.current = index;
    setActive(index);
  }, []);

  const takeOver = useCallback((value: boolean) => {
    drivingRef.current = value;
    setDriving(value);
    if (value) token.current++;
  }, []);

  useMotionValueEvent(progress, "change", (value) => {
    if (!pinned) return;
    const index = Math.min(CHAPTERS.length - 1, Math.max(0, Math.floor(value * CHAPTERS.length)));
    if (index === activeRef.current) return;
    settle(index);
    if (!drivingRef.current) void play(index);
  });

  const choose = useCallback(
    (index: number) => {
      takeOver(false);
      if (pinned && track.current && index !== activeRef.current) {
        scrollToChapter(track.current, index);
        return;
      }
      settle(index);
      void play(index);
      if (!pinned) viewer.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [pinned, takeOver, settle, play]
  );

  return (
    <section id="demo" className="border-b">
      <div ref={track} style={pinned ? { height: `calc(100svh + ${(CHAPTERS.length - 1) * SCROLL_PER_CHAPTER_SVH}svh)` } : undefined}>
        <div className={cn("relative isolate mx-auto flex w-full max-w-[80rem] flex-col gap-4 px-4 pb-12 sm:px-6", pinned && "sticky top-14 h-[calc(100svh-3.5rem)] justify-center pb-6")}>
          <Backdrop />
          <CommandStrip host={host} />
          <motion.div
            ref={viewer}
            style={pinned ? { rotateX, scale, y: lift, transformPerspective: 1800, transformOrigin: "50% 100%" } : undefined}
            onPointerDownCapture={() => takeOver(true)}
            onKeyDownCapture={() => takeOver(true)}
            className={cn("bg-background ring-foreground/10 relative overflow-hidden rounded-xl border shadow-2xl ring-1 [&_footer[aria-label=Status]]:h-7", pinned ? "min-h-[24rem] flex-1" : "h-[min(36rem,80svh)]")}
          >
            <DemoViewer />
            <AnimatePresence>{pinned && active === PRIVACY ? <PrivacyOverlay key="privacy" /> : null}</AnimatePresence>
            <GhostCursor container={viewer} ref={cursor} />
          </motion.div>
          <TourDock active={active} onSelect={choose} progress={pinned ? progress : null} driving={driving} onResume={() => choose(activeRef.current)} />
          {!pinned && active === PRIVACY ? (
            <Card>
              <CardContent>
                <IgnoreRules />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
