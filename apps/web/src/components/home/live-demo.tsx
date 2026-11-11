"use client";

import { DemoProvider } from "@/components/demo/demo-provider";
import { PageBar } from "@/components/home/page-bar";
import { Stage } from "@/components/home/stage";

export function LiveDemo({ host }: { host: string }) {
  return (
    <DemoProvider>
      <Stage host={host} />
      <PageBar />
    </DemoProvider>
  );
}
