import type { DemoBackend } from "@biga/demo/backend";
import type { ViewerActions } from "@biga/viewer/commands/types";
import {
  Columns2Icon,
  GitCompareArrowsIcon,
  GitGraphIcon,
  LayoutDashboardIcon,
  LocateFixedIcon,
  SearchIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";

export type TourContext = { actions: ViewerActions; backend: DemoBackend };

export type Chapter = {
  id: string;
  label: string;
  title: string;
  body: string;
  icon: LucideIcon;
  target: (root: HTMLElement) => HTMLElement | null;
  run: (context: TourContext) => void;
};

const TEST_PATH = /(\.test\.|_test\.|(^|\/)tests?\/|\/test_)/;

function sourcePaths({ session, project }: DemoBackend): string[] {
  return [...session.files.keys()].filter((path) => path.endsWith(`.${project.ext}`) && !TEST_PATH.test(path)).sort();
}

function recentSource(backend: DemoBackend): string {
  const sources = new Set(sourcePaths(backend));
  for (const checkpoint of [...backend.session.checkpoints].reverse()) {
    const hit = checkpoint.changes.find((change) => change.changeType === "modified" && sources.has(change.path));
    if (hit) return hit.path;
  }
  return sourcePaths(backend)[0] ?? "README.md";
}

function latestSeq(backend: DemoBackend): number {
  return backend.session.checkpoints.at(-1)?.seq ?? 0;
}

function away(actions: ViewerActions): void {
  actions.setFollow(false);
  actions.closeSplitView();
}

function railButton(root: HTMLElement, label: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`nav[aria-label="Views"] button[aria-label^="${label}"]`);
}

function buttonText(root: HTMLElement, text: string): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>("button")].find((button) => button.textContent?.trim() === text) ?? null;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: "follow",
    label: "Follow",
    title: "Follow every save",
    body: "Follow mode opens the file the broadcaster just saved, so you read what they are writing as they write it. Click anywhere and it pauses.",
    icon: LocateFixedIcon,
    target: (root) => buttonText(root, "Follow"),
    run: ({ actions, backend }) => {
      actions.closeSplitView();
      actions.setFollow(true);
      actions.setSidebarView("explorer");
      actions.openFile(recentSource(backend));
    },
  },
  {
    id: "timeline",
    label: "Timeline",
    title: "Step back through the timeline",
    body: "Every save is a checkpoint. Pick one to see exactly what changed, file by file, and share a link to that moment.",
    icon: GitGraphIcon,
    target: (root) => railButton(root, "Timeline"),
    run: ({ actions, backend }) => {
      away(actions);
      actions.setSidebarView("timeline");
      actions.openCheckpoint(latestSeq(backend));
    },
  },
  {
    id: "diff",
    label: "Compare",
    title: "Compare with an earlier version",
    body: "Open any file and compare it with the start of the session or with any checkpoint. The diff is computed in your browser.",
    icon: GitCompareArrowsIcon,
    target: (root) => root.querySelector<HTMLElement>('button[aria-label="Compare"]') ?? railButton(root, "Files"),
    run: ({ actions, backend }) => {
      away(actions);
      actions.setSidebarView("explorer");
      actions.openFile(recentSource(backend), { base: { kind: "start" } });
    },
  },
  {
    id: "search",
    label: "Search",
    title: "Search every shared file",
    body: "The viewer searches the files it already has, so nothing you type leaves the tab. Case, whole word and regex are one click away.",
    icon: SearchIcon,
    target: (root) => railButton(root, "Search"),
    run: ({ actions, backend }) => {
      away(actions);
      actions.searchFor(backend.project.modules[1] ?? backend.project.modules[0] ?? "main");
    },
  },
  {
    id: "split",
    label: "Split",
    title: "Read two files side by side",
    body: "Open a second file beside the first, each with its own tabs, and keep the test next to the code.",
    icon: Columns2Icon,
    target: (root) => root.querySelector<HTMLElement>('button[aria-label="More file actions"]'),
    run: ({ actions, backend }) => {
      actions.setFollow(false);
      const [first, second] = sourcePaths(backend);
      if (first) actions.openFile(first);
      if (second) actions.openToSide(second);
    },
  },
  {
    id: "overview",
    label: "Overview",
    title: "See the whole session",
    body: "Activity, languages, the most changed files and the latest saves, kept current while the broadcast runs.",
    icon: LayoutDashboardIcon,
    target: (root) => buttonText(root, "Overview"),
    run: ({ actions }) => {
      away(actions);
      actions.showOverview();
    },
  },
  {
    id: "privacy",
    label: "Privacy",
    title: "Keep private things private",
    body: "Secrets and dependencies are never listed. Hide a folder and it drops out of the live tree for everyone watching.",
    icon: ShieldCheckIcon,
    target: (root) => railButton(root, "Files"),
    run: ({ actions }) => {
      away(actions);
      actions.setSidebarView("explorer");
    },
  },
];
