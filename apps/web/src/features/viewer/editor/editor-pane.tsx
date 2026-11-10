"use client";

import { baseName } from "@biga/types";
import { FileCodeIcon, LockIcon } from "lucide-react";

import { OpenTabs } from "@/app/session/[sessionId]/code-viewer-tab";
import { Button } from "@/components/ui/button";
import { Kbd, useModKey } from "@/components/ui/kbd";
import { CodeBreadcrumbs } from "@/components/code-breadcrumbs";
import { EmptyState } from "@/components/viewer/empty-state";
import { languageForPath, languageLabel } from "@/lib/languages";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/use-viewer-view";
import { CheckpointDiff } from "./checkpoint-diff";
import { FileView } from "./file-view";
import { FollowPausedPill } from "./follow-paused-pill";

function NoFileOpen({ onOpenQuickOpen }: { onOpenQuickOpen: () => void }) {
    const mod = useModKey();
    return (
        <EmptyState icon={FileCodeIcon} title="No file open" description="Pick a file from the tree, or search for one by name.">
            <Button variant="outline" size="sm" onClick={onOpenQuickOpen}>
                Go to file
                <span className="ms-1 flex gap-0.5">
                    <Kbd>{mod}</Kbd>
                    <Kbd>P</Kbd>
                </span>
            </Button>
        </EmptyState>
    );
}

export function EditorPane({ onOpenQuickOpen }: { onOpenQuickOpen: () => void }) {
    const runtime = useRuntime();
    const { workspace } = runtime.stores;
    const { view, activeFile, openFile, showLive } = useViewerView();
    const tabs = useStoreValue(workspace, (state) => state.tabs);

    if (view.type === "checkpoint") return <CheckpointDiff seq={view.seq} file={view.file} />;
    if (!activeFile) return <NoFileOpen onOpenQuickOpen={onOpenQuickOpen} />;

    const closeTab = (path: string) => {
        const next = workspace.getState().closeTab(path);
        if (path !== activeFile) return;
        if (next) openFile(next, "replace");
        else showLive("replace");
    };

    return (
        <div className="@container flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center border-b">
                <OpenTabs
                    tabs={[...tabs]}
                    activePath={activeFile}
                    onSelect={(path) => openFile(path)}
                    onClose={closeTab}
                />
                <FollowPausedPill />
            </div>
            <div className="flex h-8 shrink-0 items-center gap-2 border-b pe-1.5">
                <CodeBreadcrumbs path={activeFile} />
            </div>
            <div className="min-h-0 flex-1">
                <FileView key={activeFile} path={activeFile} />
            </div>
            <footer className="bg-sidebar text-muted-foreground flex h-6 shrink-0 items-center gap-4 border-t px-3 text-[11px]">
                <span className="flex items-center gap-1">
                    <LockIcon className="size-3" aria-hidden />
                    Read-only
                </span>
                <span className="ms-auto" title={baseName(activeFile)}>
                    {languageLabel(languageForPath(activeFile))}
                </span>
            </footer>
        </div>
    );
}
