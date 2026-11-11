"use client";

import type { DemoBackend } from "@biga/demo/backend";
import type { SessionRuntime } from "@biga/viewer/runtime/runtime";
import { useStoreValue } from "@biga/viewer/runtime/runtime-provider";
import { Skeleton } from "@biga/ui/components/skeleton";
import { Toggle } from "@biga/ui/components/toggle";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { useDemo } from "@/components/demo/demo-provider";

function RuleRow({ backend, pattern, locked, reason }: { backend: DemoBackend; pattern: string; locked: boolean; reason: string }) {
  const [hidden, setHidden] = useState(() => backend.isIgnored(pattern));
  const change = (next: boolean) => {
    backend.setIgnored(pattern, next);
    setHidden(next);
  };
  return (
    <li className="flex items-center gap-3 py-2">
      <code translate="no" className="w-24 shrink-0 font-mono text-xs">
        {pattern}
      </code>
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{reason}</span>
      <Toggle
        variant="outline"
        size="sm"
        pressed={hidden}
        disabled={locked}
        onPressedChange={change}
        aria-label={`${hidden ? "Share" : "Hide"} ${pattern} ${hidden ? "with" : "from"} viewers`}
        className="w-24 shrink-0"
      >
        {hidden ? <EyeOffIcon /> : <EyeIcon />}
        {hidden ? "Hidden" : "Shared"}
      </Toggle>
    </li>
  );
}

function FileCount({ runtime }: { runtime: SessionRuntime }) {
  const count = useStoreValue(runtime.stores.tree, (state) => state.fileCount);
  return (
    <p role="status" className="text-muted-foreground text-xs tabular-nums">
      Viewers can open {count.toLocaleString()} files
    </p>
  );
}

export function IgnoreRules() {
  const { backend, runtime } = useDemo();
  if (!backend || !runtime) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="flex flex-col gap-1">
      <ul className="divide-y">
        {backend.rules().map((rule) => (
          <RuleRow key={`${backend.seed}:${rule.pattern}`} backend={backend} {...rule} />
        ))}
      </ul>
      <FileCount runtime={runtime} />
    </div>
  );
}
