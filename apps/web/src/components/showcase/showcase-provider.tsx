"use client";

import type { ViewerNavigation } from "@biga/types";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { NavigationProvider } from "@/features/viewer/runtime/navigation-context";
import { RuntimeProvider } from "@/features/viewer/runtime/runtime-provider";
import { createStaticRuntime } from "@/features/viewer/runtime/static-runtime";
import { DEMO_FILE, loadShowcase, seedShowcase, type ShowcaseFixture, type ShowcaseState } from "@/lib/showcase";

const ShowcaseContext = createContext<ShowcaseFixture | null>(null);

export function useShowcase(): ShowcaseFixture | null {
  return useContext(ShowcaseContext);
}

const noop = () => undefined;

const STATIC_NAVIGATION: ViewerNavigation = {
  view: { type: "live" },
  embed: true,
  activeFile: DEMO_FILE,
  openFile: noop,
  openCheckpoint: noop,
  showLive: noop,
};

export function ShowcaseProvider({ state, children }: { state?: ShowcaseState; children: ReactNode }) {
  const [fixture, setFixture] = useState<ShowcaseFixture | null>(null);
  const [seeded, setSeeded] = useState(false);
  const runtime = useMemo(() => (fixture ? createStaticRuntime(fixture.session.id) : null), [fixture]);
  const status = state?.status ?? "active";
  const saves = state?.saves ?? 0;

  useEffect(() => {
    let alive = true;
    void loadShowcase().then((loaded) => {
      if (alive) setFixture(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!fixture || !runtime) return;
    seedShowcase(runtime, fixture, { status, saves });
    setSeeded(true);
  }, [fixture, runtime, status, saves]);

  if (!runtime) return <ShowcaseContext.Provider value={null}>{children}</ShowcaseContext.Provider>;
  return (
    <RuntimeProvider runtime={runtime}>
      <NavigationProvider value={STATIC_NAVIGATION}>
        <ShowcaseContext.Provider value={seeded ? fixture : null}>{children}</ShowcaseContext.Provider>
      </NavigationProvider>
    </RuntimeProvider>
  );
}
