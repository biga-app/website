"use client";

import { useMemo } from "react";

import { ActivityBar } from "@/components/activity-bar";
import { Badge } from "@/components/ui/badge";
import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
import { OpenTabs } from "@/features/viewer/editor/open-tabs";
import { useViewerView } from "@/features/viewer/runtime/navigation-context";
import { useRuntime, useStoreValue } from "@/features/viewer/runtime/runtime-provider";
import { ViewerHeader } from "@/features/viewer/shell/viewer-header";
import { Timeline } from "@/features/viewer/timeline/timeline";
import { FileTree } from "@/features/viewer/tree/file-tree";
import { DEMO_FILE, DEMO_LINE, type ShowcaseFixture } from "@/lib/showcase";
import { cn } from "@/lib/utils";

import { useShowcase } from "./showcase-provider";
import { StaticCode } from "./static-code";

/*
 * The viewer's regions, each one the real component reading the stores of a
 * static runtime (seeded by `ShowcaseProvider`). Only the pieces that need a network or
 * Monaco are replaced: the code body is `StaticCode`, and every callback is a
 * no-op because the panels are pictures of the product, not controls.
 */

const noop = () => {};

/** Holds a panel's place until the fixture has loaded. */
function Placeholder() {
  return <div className="bg-muted/40 size-full" />;
}

/** Where each file's pane starts, so the lines worth reading are on screen. */
const FIRST_LINE: Record<string, number> = {
  "internal/ignore/filter.go": 27,
  "internal/config/config.go": 66,
  "internal/watch/batcher.go": 1,
  "cmd/biga/main.go": 1,
  "README.md": 1,
};

export function PanelHeader({ live }: { live: boolean }) {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <div className="bg-background size-full">
      <ViewerHeader status={live ? "live" : "ended"} embed />
    </div>
  );
}

export function PanelFiles({ activity = true }: { activity?: boolean }) {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <div className="bg-sidebar text-sidebar-foreground flex size-full min-w-0">
      {activity ? <ActivityBar view="explorer" sidebarOpen unseenTimeline={false} onChange={noop} /> : null}
      <aside aria-label="Files" className={cn("min-w-0 flex-1", activity && "border-r")}>
        <FileTree onOpenQuickOpen={noop} />
      </aside>
    </div>
  );
}

export function PanelTimeline() {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return (
    <aside aria-label="Timeline" className="bg-sidebar text-sidebar-foreground size-full min-w-0 border-l">
      <Timeline />
    </aside>
  );
}

type CodeOptions = {
  /** An edit landing on the demo line: `from` becomes `to`, drawn under the highlighter, and targetable as `target`. */
  save?: { from: string; to: string; target?: string };
  /** Override where the pane starts and stops, for a short crop of the file. */
  firstLine?: number;
  lastLine?: number;
  wrap?: boolean;
  tabSize?: 2 | 4;
};

export function PanelCode(options: CodeOptions) {
  const fixture = useShowcase();
  if (!fixture) return <Placeholder />;
  return <CodePane fixture={fixture} {...options} />;
}

function CodePane({ fixture, save, firstLine, lastLine, wrap, tabSize }: CodeOptions & { fixture: ShowcaseFixture }) {
  const { stores } = useRuntime();
  const tabs = useStoreValue(stores.workspace, (state) => state.groups[0]);
  const { activeFile: active } = useViewerView();
  const file = useMemo(
    () => fixture.shown.find((candidate) => candidate.path === active) ?? fixture.shown[0],
    [fixture, active]
  );
  const loaded = useStoreValue(stores.tree, (state) => state.fileCount > 0);
  if (!file || !loaded) return <Placeholder />;

  const path = file.path;
  const shownTabs = tabs.length ? tabs : [path];
  const replace = save && path === DEMO_FILE ? { line: DEMO_LINE, mark: true, ...save } : undefined;

  return (
    <div className="bg-background flex size-full min-w-0 flex-col">
      <div className="flex h-10 shrink-0 items-center border-b">
        <OpenTabs tabs={shownTabs} activePath={path} onSelect={noop} onClose={noop} />
      </div>
      <div className="flex h-8 shrink-0 items-center border-b">
        <CodeBreadcrumbs path={path} />
        <Badge variant="outline" className="text-muted-foreground me-2 shrink-0 font-normal">
          Read only
        </Badge>
      </div>
      <div className="min-h-0 flex-1">
        <StaticCode
          file={file}
          firstLine={firstLine ?? FIRST_LINE[path] ?? 1}
          lastLine={lastLine}
          replace={replace}
          wrap={wrap}
          tabSize={tabSize}
        />
      </div>
    </div>
  );
}
