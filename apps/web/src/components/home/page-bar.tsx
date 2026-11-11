"use client";

import { formatRelativeTime } from "@biga/viewer/lib/change-meta";
import { useNow } from "@biga/viewer/lib/use-now";
import { useStoreValue } from "@biga/viewer/runtime/runtime-provider";
import { STATUS_DOT, STATUS_LABELS } from "@biga/viewer/shell/status-meta";
import { useCopyFeedback } from "@biga/viewer/viewer/copy-button";
import { Button } from "@biga/ui/components/button";
import { cn } from "@biga/ui/lib/utils";
import { CheckIcon, LinkIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState, type ComponentProps } from "react";

import { useDemo } from "@/components/demo/demo-provider";

function Item({ className, ...props }: ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="xs" className={cn("h-full shrink-0 gap-1.5 rounded-none px-2 text-[11px] font-normal shadow-none", className)} {...props} />;
}

function useAfterHero(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry?.isIntersecting));
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  return shown;
}

function Live() {
  const { runtime } = useDemo();
  const status = useStoreValue(runtime!.stores.connection, (state) => state.status);
  const latest = useStoreValue(runtime!.stores.history, (state) => state.checkpoints.at(-1));
  const now = useNow();
  return (
    <>
      <span className="flex items-center gap-1.5 px-2">
        <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
        <span>{STATUS_LABELS[status]}</span>
        {latest ? <span className="tabular-nums">· {formatRelativeTime(latest.createdAt, now)}</span> : null}
      </span>
      {latest ? <span className="flex items-center px-2 tabular-nums">#{latest.seq}</span> : null}
    </>
  );
}

function CopySeedLink({ seed }: { seed: string }) {
  const { copied, copy } = useCopyFeedback();
  return (
    <Item onClick={() => void copy(`${window.location.origin}/?seed=${seed}`)}>
      {copied ? <CheckIcon className="size-3" /> : <LinkIcon className="size-3" />}
      {copied ? "Copied" : "Copy seed link"}
    </Item>
  );
}

export function PageBar() {
  const { runtime, backend, seed, shuffle } = useDemo();
  const shown = useAfterHero();
  if (!runtime || !backend || !seed) return null;
  return (
    <aside
      aria-label="Demo status"
      inert={!shown}
      className={cn(
        "bg-sidebar text-muted-foreground fixed inset-x-0 bottom-0 z-30 hidden h-6 items-stretch border-t text-[11px] transition-transform duration-200 md:flex",
        shown ? "translate-y-0" : "translate-y-full"
      )}
    >
      <Live />
      <span className="flex items-center px-2" translate="no">
        {backend.project.name} · {backend.project.stackLabel}
      </span>
      <span className="ms-auto flex items-stretch">
        <span className="flex items-center px-2 font-mono" translate="no">
          seed {seed}
        </span>
        <CopySeedLink seed={seed} />
        <Item onClick={shuffle}>
          <RefreshCwIcon className="size-3" />
          New project
        </Item>
      </span>
    </aside>
  );
}
