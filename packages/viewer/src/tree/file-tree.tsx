"use client";

import type { ChangeType } from "@biga/types/checkpoint";
import { KIND_DIRECTORY, KIND_IGNORED, type TreeEntry } from "@biga/types/tree-table";
import { defaultRangeExtractor, useVirtualizer, type Range } from "@tanstack/react-virtual";
import { ChevronRight, FolderClosedIcon, ListCollapseIcon, SearchIcon } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes } from "react";

import { FileTypeIcon } from "@biga/viewer/file-icon";
import { Badge } from "@biga/ui/components/badge";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@biga/ui/components/context-menu";
import { useModKey } from "@biga/ui/components/kbd";
import { ScrollArea } from "@biga/ui/components/scroll-area";
import { EmptyState } from "@biga/viewer/viewer/empty-state";
import { IconAction } from "@biga/viewer/viewer/icon-action";
import { PanelHeader } from "@biga/viewer/viewer/panel-header";
import { CHANGE_META } from "@biga/viewer/lib/change-meta";
import { useRovingTree, type TreeItemMeta } from "@biga/viewer/lib/use-roving-tree";
import { cn } from "@biga/ui/lib/utils";

import { useCommandContext } from "../commands/command-provider";
import { CommandMenuItem } from "../commands/menu-items";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { useViewerView } from "../runtime/navigation-context";
import { useDecorations } from "./use-decorations";

const INDENT = 12;
const BASE_PAD = 8;
const ROW_HEIGHT = 26;
const COMFORTABLE_ROW_HEIGHT = 36;
const OVERSCAN = 10;

const ROW_CLASS =
    "group/row absolute start-0 top-0 flex w-full cursor-default items-center gap-1.5 pe-2 text-[13px] outline-none select-none " +
    "hover:bg-sidebar-accent/60 focus-visible:ring-ring/70 focus-visible:ring-2 focus-visible:ring-inset " +
    "aria-selected:bg-sidebar-accent aria-selected:text-sidebar-accent-foreground";

type RowProps = {
    entry: TreeEntry;
    expanded: boolean;
    selected: boolean;
    decoration: ChangeType | undefined;
    flashKey: number | null;
    height: number;
    offset: number;
    setSize: number;
    posInSet: number;
    itemProps: HTMLAttributes<HTMLDivElement>;
    onActivate: () => void;
};

type TreeMenu = { kind: "file" | "folder" | "root"; path: string | null };

function rowPath(target: EventTarget): string | undefined {
    return (target as HTMLElement).closest<HTMLElement>("[role=treeitem]")?.dataset.path;
}

const TreeRow = memo(function TreeRow({
    entry,
    expanded,
    selected,
    decoration,
    flashKey,
    height,
    offset,
    setSize,
    posInSet,
    itemProps,
    onActivate,
}: RowProps) {
    const isDirectory = entry.kind === KIND_DIRECTORY;
    const isIgnored = entry.kind === KIND_IGNORED;
    const meta = decoration ? CHANGE_META[decoration] : null;
    const common = {
        role: "treeitem",
        "data-path": entry.path,
        "aria-level": entry.depth + 1,
        "aria-setsize": setSize,
        "aria-posinset": posInSet,
        className: cn(ROW_CLASS, isIgnored && "text-muted-foreground hover:bg-transparent"),
        style: { height, transform: `translateY(${offset}px)`, paddingInlineStart: BASE_PAD + entry.depth * INDENT },
        ...itemProps,
    } as const;

    if (isIgnored) {
        return (
            <div {...common} aria-disabled>
                <span className="size-3.5 shrink-0" />
                <FileTypeIcon kind="directory" name={entry.name} className="size-4 opacity-50" />
                <span className="truncate">{entry.name}</span>
                <Badge variant="outline" className="text-muted-foreground ms-auto h-4 shrink-0 px-1.5 text-[10px] font-normal">not shared</Badge>
            </div>
        );
    }

    if (isDirectory) {
        return (
            <div {...common} aria-expanded={expanded} onClick={onActivate}>
                <ChevronRight
                    aria-hidden
                    className={cn(
                        "text-muted-foreground size-3.5 shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none rtl:-scale-x-100",
                        expanded && "rotate-90 rtl:rotate-90"
                    )}
                />
                <FileTypeIcon kind="directory" name={entry.name} expanded={expanded} className="size-4" />
                <span className="truncate">{entry.name}</span>
            </div>
        );
    }

    return (
        <div {...common} aria-selected={selected} onClick={onActivate}>
            {flashKey !== null && (
                <span key={flashKey} aria-hidden className="biga-just-changed pointer-events-none absolute inset-0" />
            )}
            <span className="size-3.5 shrink-0" />
            <FileTypeIcon kind="file" name={entry.name} className="size-4" />
            <span className={cn("truncate", meta && decoration !== "modified" && meta.className)}>{entry.name}</span>
            {meta && (
                <span
                    className={cn("ms-auto w-3 shrink-0 text-center font-mono text-[11px] font-semibold", meta.className)}
                    title={meta.label}
                >
                    {meta.letter}
                    <span className="sr-only">, {meta.label.toLowerCase()}</span>
                </span>
            )}
        </div>
    );
});

export function FileTree({
    comfortable = false,
    onOpenQuickOpen,
    onFileOpened,
}: {
    comfortable?: boolean;
    onOpenQuickOpen: () => void;
    onFileOpened?: () => void;
}) {
    const runtime = useRuntime();
    const { stores } = runtime;
    const { tree } = stores;
    const rows = useStoreValue(tree, (state) => state.rows);
    const revision = useStoreValue(tree, (state) => state.revision);
    const fileCount = useStoreValue(tree, (state) => state.fileCount);
    const touched = useStoreValue(tree, (state) => state.touched);
    const touchedRevision = useStoreValue(tree, (state) => state.touchedRevision);
    const { reader } = tree.getState();
    const { activeFile } = useViewerView();
    const { actions } = useCommandContext();
    const [menu, setMenu] = useState<TreeMenu>({ kind: "root", path: null });
    const decorations = useDecorations();
    const mod = useModKey();
    const parentRef = useRef<HTMLDivElement>(null);
    const rowHeight = comfortable ? COMFORTABLE_ROW_HEIGHT : ROW_HEIGHT;
    const baselineTouch = useRef(touchedRevision);

    const expanded = reader.expandedPaths();
    const items = useMemo<TreeItemMeta[]>(
        () =>
            rows.map((path) => {
                const entry = reader.entry(path) as TreeEntry;
                return {
                    key: path,
                    level: entry.depth + 1,
                    label: entry.name,
                    expandable: entry.kind === KIND_DIRECTORY,
                    expanded: expanded.has(path),
                };
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [rows, revision]
    );

    const virtualizerRef = useRef<ReturnType<typeof useVirtualizer<HTMLDivElement, Element>> | null>(null);
    const scrollToIndex = useCallback((index: number) => virtualizerRef.current?.scrollToIndex(index, { align: "auto" }), []);

    const onToggle = useCallback(
        (index: number, open: boolean) => {
            const path = rows[index];
            if (path !== undefined) tree.getState().setExpanded(path, open);
        },
        [rows, tree]
    );

    const onActivate = useCallback(
        (index: number) => {
            const path = rows[index];
            const entry = path === undefined ? undefined : reader.entry(path);
            if (path === undefined || !entry) return;
            if (entry.kind === KIND_DIRECTORY) {
                tree.getState().setExpanded(path, !reader.expandedPaths().has(path));
                return;
            }
            actions.openFile(path);
            onFileOpened?.();
        },
        [rows, reader, tree, actions, onFileOpened]
    );

    const { activeIndex, getItemProps } = useRovingTree({
        items,
        containerRef: parentRef,
        selectedKey: activeFile,
        onToggle,
        onActivate,
        scrollToIndex,
    });

    const rangeExtractor = useCallback(
        (range: Range) => {
            const indexes = defaultRangeExtractor(range);
            if (activeIndex >= 0 && !indexes.includes(activeIndex)) {
                indexes.push(activeIndex);
                indexes.sort((a, b) => a - b);
            }
            return indexes;
        },
        [activeIndex]
    );

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: OVERSCAN,
        rangeExtractor,
    });
    useEffect(() => {
        virtualizerRef.current = virtualizer;
    });
    useEffect(() => {
        virtualizer.measure();
    }, [rowHeight, virtualizer]);

    const lastRevealed = useRef<string | null>(null);
    useEffect(() => {
        if (!activeFile || activeFile === lastRevealed.current) return;
        tree.getState().expandAncestors(activeFile);
    }, [activeFile, tree, fileCount]);
    useEffect(() => {
        if (!activeFile || activeFile === lastRevealed.current) return;
        const index = rows.indexOf(activeFile);
        if (index >= 0) {
            lastRevealed.current = activeFile;
            virtualizer.scrollToIndex(index, { align: "auto" });
        }
    }, [activeFile, rows, virtualizer]);

    const header = (
        <PanelHeader
            title="Files"
            id="files-heading"
            meta={fileCount > 0 ? fileCount.toLocaleString() : undefined}
            actions={
                <>
                    <IconAction label="Go to file" shortcut={[mod, "P"]} onClick={onOpenQuickOpen}>
                        <SearchIcon />
                    </IconAction>
                    <IconAction
                        label="Collapse all folders"
                        disabled={expanded.size === 0}
                        onClick={() => tree.getState().collapseAll()}
                    >
                        <ListCollapseIcon />
                    </IconAction>
                </>
            }
        />
    );

    if (rows.length === 0) {
        return (
            <div className="flex h-full flex-col">
                {header}
                <EmptyState
                    icon={FolderClosedIcon}
                    title="Waiting for files"
                    description="Files appear here as soon as the broadcaster's first snapshot uploads."
                />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {header}
            <ScrollArea className="min-h-0 flex-1" viewportRef={parentRef}>
                <ContextMenu
                    onOpenChange={(open, details) => {
                        if (!open) return;
                        const path = details.event.target ? rowPath(details.event.target) : undefined;
                        if (path === undefined) {
                            setMenu({ kind: "root", path: null });
                            return;
                        }
                        const entry = reader.entry(path);
                        if (!entry || entry.kind === KIND_IGNORED) {
                            details.cancel();
                            return;
                        }
                        setMenu({ kind: entry.kind === KIND_DIRECTORY ? "folder" : "file", path });
                    }}
                >
                    <ContextMenuTrigger
                        role="tree"
                        aria-labelledby="files-heading"
                        dir="ltr"
                        className="relative w-full pb-2"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                        onPointerOver={(event) => {
                            const path = rowPath(event.target);
                            if (path !== undefined) runtime.prefetchFile(path);
                        }}
                        onPointerOut={(event) => {
                            const path = rowPath(event.target);
                            if (path !== undefined) runtime.cancelPrefetch(path);
                        }}
                        onFocus={(event) => {
                            const path = rowPath(event.target);
                            if (path !== undefined) runtime.prefetchFile(path);
                        }}
                        onBlur={(event) => {
                            const path = rowPath(event.target);
                            if (path !== undefined) runtime.cancelPrefetch(path);
                        }}
                    >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const path = rows[virtualRow.index];
                                const entry = path === undefined ? undefined : reader.entry(path);
                                if (path === undefined || !entry) return null;
                                const position = reader.position(path) ?? { setSize: 1, posInSet: 1 };
                                const isFile = entry.kind !== KIND_DIRECTORY && entry.kind !== KIND_IGNORED;
                                return (
                                    <TreeRow
                                        key={path}
                                        entry={entry}
                                        expanded={expanded.has(path)}
                                        selected={isFile && activeFile === path}
                                        decoration={isFile ? decorations.get(path) : undefined}
                                        flashKey={isFile && touchedRevision !== baselineTouch.current && touched.has(path) ? touchedRevision : null}
                                        height={virtualRow.size}
                                        offset={virtualRow.start}
                                        setSize={position.setSize}
                                        posInSet={position.posInSet}
                                        itemProps={getItemProps(virtualRow.index)}
                                        onActivate={() => onActivate(virtualRow.index)}
                                    />
                                );
                            })}
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-60">
                        {menu.kind === "file" && menu.path ? (
                            <>
                                <CommandMenuItem id="view.splitRight" kind="context" target={{ path: menu.path }} label="Open to the Side" />
                                <ContextMenuSeparator />
                                <CommandMenuItem id="file.copyPath" kind="context" target={{ path: menu.path }} />
                                <CommandMenuItem id="file.copyContents" kind="context" target={{ path: menu.path }} />
                                <CommandMenuItem id="file.copyLink" kind="context" target={{ path: menu.path }} />
                                <CommandMenuItem id="file.download" kind="context" target={{ path: menu.path }} label="Download" />
                                <ContextMenuSeparator />
                                <CommandMenuItem id="go.revealInTimeline" kind="context" target={{ path: menu.path }} label="Show in Timeline" />
                            </>
                        ) : null}
                        {menu.kind === "folder" && menu.path ? (
                            <>
                                <ContextMenuItem onClick={() => tree.getState().setExpanded(menu.path as string, !expanded.has(menu.path as string))}>
                                    {expanded.has(menu.path) ? "Collapse" : "Expand"}
                                </ContextMenuItem>
                                <CommandMenuItem id="view.searchInFolder" kind="context" target={{ folder: menu.path }} label="Search in Folder" />
                                <ContextMenuSeparator />
                                <CommandMenuItem id="file.copyPath" kind="context" target={{ path: menu.path }} />
                            </>
                        ) : null}
                        {menu.kind === "root" ? (
                            <>
                                <CommandMenuItem id="go.file" kind="context" />
                                <CommandMenuItem id="view.showSearch" kind="context" />
                                <ContextMenuSeparator />
                                <CommandMenuItem id="view.collapseFolders" kind="context" />
                            </>
                        ) : null}
                    </ContextMenuContent>
                </ContextMenu>
            </ScrollArea>
        </div>
    );
}
