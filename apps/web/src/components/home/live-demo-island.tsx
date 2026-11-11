"use client";

import { clientLazy } from "@biga/viewer/client-lazy";

const Island = clientLazy(() => import("@/components/home/live-demo").then((module) => module.LiveDemo), <section id="demo" aria-hidden className="min-h-svh border-b" />);

export function LiveDemoIsland({ host }: { host: string }) {
  return <Island host={host} />;
}
