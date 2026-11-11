"use client";

import { baseName } from "@biga/types/file-identity";
import type { FileMatches, LineMatch } from "@biga/viewer-core/runtime/content-search";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CaseSensitiveIcon, RegexIcon, WholeWordIcon, XIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { EmptyState } from "@/components/viewer/empty-state";
import { IconAction } from "@/components/viewer/icon-action";
import { PanelHeader } from "@/components/viewer/panel-header";
import { pluralize } from "@/lib/change-meta";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

import { useCommandContext } from "../commands/command-provider";
import { useViewerUi } from "../shell/ui-state";
import { useContentSearch } from "./use-content-search";

const FILE_ROW = 28;
const MATCH_ROW = 24;
const OVERSCAN = 12;

type Row =
    | { kind: "file"; key: string; result: FileMatches }
    | { kind: "match"; key: string; path: string; match: LineMatch };

function buildRows(results: readonly FileMatches[]): Row[] {
    const rows: Row[] = [];
    for (const result of results) {
        rows.push({ kind: "file", key: `f:${result.path}`, result });
        for (const match of result.matches) {
            rows.push({ kind: "match", key: `m:${result.path}:${match.line}:${match.from}`, path: result.path, match });
        }
    }
    return rows;
}

function Highlighted({ match }: { match: LineMatch }) {
    return (
        <span className="truncate">
            {match.text.slice(0, match.from)}
            <mark className="bg-brand-mark/50 text-foreground rounded-[2px]">{match.text.slice(match.from, match.to)}</mark>
            {match.text.slice(match.to)}
        </span>
    );
}

export function SearchPanel() {
    const { actions } = useCommandContext();
    const request = useViewerUi((state) => state.searchRequest);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const [query, setQuery] = useState("");
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [wholeWord, setWholeWord] = useState(false);
    const [regex, setRegex] = useState(false);
    const [folder, setFolder] = useState<string | null>(null);
    const [active, setActive] = useState(0);
    const [seenNonce, setSeenNonce] = useState(request.nonce);

    if (request.nonce !== seenNonce) {
        setSeenNonce(request.nonce);
        setFolder(request.folder);
    }

    useEffect(() => {
        if (request.nonce > 0) inputRef.current?.focus();
    }, [request.nonce]);

    const search = useContentSearch({ query, caseSensitive, wholeWord, regex }, folder);
    const rows = useMemo(() => buildRows(search.results), [search.results]);
    const matchIndexes = useMemo(() => rows.flatMap((row, index) => (row.kind === "match" ? [index] : [])), [rows]);
    const current = matchIndexes.includes(active) ? active : (matchIndexes[0] ?? -1);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => viewportRef.current,
        estimateSize: (index) => (rows[index]?.kind === "file" ? FILE_ROW : MATCH_ROW),
        overscan: OVERSCAN,
    });

    useEffect(() => {
        virtualizer.measure();
    }, [rows, virtualizer]);

    const open = (index: number) => {
        const row = rows[index];
        if (row?.kind !== "match") return;
        setActive(index);
        actions.openFile(row.path, { line: row.match.line, group: 0 });
    };

    const move = (step: number) => {
        const position = matchIndexes.indexOf(current);
        const next = matchIndexes[Math.max(0, Math.min(matchIndexes.length - 1, position + step))];
        if (next === undefined) return;
        setActive(next);
        virtualizer.scrollToIndex(next, { align: "auto" });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowDown") move(1);
        else if (event.key === "ArrowUp") move(-1);
        else if (event.key === "Home") setActive(matchIndexes[0] ?? 0);
        else if (event.key === "End") setActive(matchIndexes.at(-1) ?? 0);
        else if (event.key === "Enter") open(current);
        else return;
        event.preventDefault();
    };

    const total = search.results.reduce((sum, result) => sum + result.matches.length, 0);
    const status = search.error
        ? search.error
        : query === ""
          ? "Type to search every shared file."
          : search.running
            ? `Searching… ${search.progress.searched.toLocaleString()} of ${search.progress.total.toLocaleString()} files`
            : `${pluralize(total, "result")} in ${pluralize(search.results.length, "file")}${search.summary?.truncated ? " (showing the first matches)" : ""}`;

    return (
        <div className="flex h-full flex-col">
            <PanelHeader title="Search" id="search-heading" />
            <div className="flex flex-col gap-2 px-3 pb-2">
                <InputGroup className="h-8">
                    <InputGroupInput
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "ArrowDown" && matchIndexes.length > 0) {
                                event.preventDefault();
                                listRef.current?.focus();
                            }
                        }}
                        placeholder="Search in files"
                        aria-label="Search in files"
                        aria-describedby={`${listId}-status`}
                        spellCheck={false}
                        autoComplete="off"
                        className="text-[13px]"
                    />
                    <InputGroupAddon align="inline-end" className="gap-0.5">
                        <Toggle size="sm" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label="Match case" className="size-6 min-w-6 px-0">
                            <CaseSensitiveIcon />
                        </Toggle>
                        <Toggle size="sm" pressed={wholeWord} onPressedChange={setWholeWord} aria-label="Match whole word" className="size-6 min-w-6 px-0">
                            <WholeWordIcon />
                        </Toggle>
                        <Toggle size="sm" pressed={regex} onPressedChange={setRegex} aria-label="Use regular expression" className="size-6 min-w-6 px-0">
                            <RegexIcon />
                        </Toggle>
                    </InputGroupAddon>
                </InputGroup>
                {folder ? (
                    <div className="bg-muted flex items-center gap-1 self-start rounded-md ps-2 text-xs">
                        <span className="truncate">in {folder}</span>
                        <IconAction label="Search everywhere" className="size-6" onClick={() => setFolder(null)}>
                            <XIcon />
                        </IconAction>
                    </div>
                ) : null}
                <p id={`${listId}-status`} aria-live="polite" className={cn("flex items-center gap-1.5 text-xs", search.error ? "text-destructive" : "text-muted-foreground")}>
                    {search.running ? <Spinner className="size-3" /> : null}
                    {status}
                </p>
                {search.stale ? (
                    <Button variant="link" size="xs" onClick={search.rerun} className="h-auto self-start px-0 text-xs">
                        Files changed since this search. Search again
                    </Button>
                ) : null}
            </div>
            {rows.length === 0 ? (
                query !== "" && !search.running && !search.error ? (
                    <EmptyState icon={SearchIcon} title="No results" description="Nothing in the shared files matches. Binary and very large files are skipped." />
                ) : null
            ) : (
                <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
                    <div
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        tabIndex={0}
                        aria-label="Search results"
                        aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined}
                        onKeyDown={onKeyDown}
                        className="focus-visible:ring-ring/60 relative w-full pb-2 outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {virtualizer.getVirtualItems().map((item) => {
                            const row = rows[item.index];
                            if (!row) return null;
                            const style = { height: item.size, transform: `translateY(${item.start}px)` };
                            if (row.kind === "file") {
                                return (
                                    <div
                                        key={row.key}
                                        role="presentation"
                                        style={style}
                                        className="absolute start-0 top-0 flex w-full items-center gap-1.5 ps-3 pe-2 text-[13px] font-medium"
                                    >
                                        <FileTypeIcon kind="file" name={baseName(row.result.path)} className="size-4 shrink-0" />
                                        <span className="truncate" title={row.result.path}>
                                            {baseName(row.result.path)}
                                        </span>
                                        <span className="text-muted-foreground truncate text-[11px] font-normal">{row.result.path}</span>
                                        <span className="text-muted-foreground ms-auto shrink-0 text-[11px] tabular-nums">{row.result.matches.length}</span>
                                    </div>
                                );
                            }
                            return (
                                <div
                                    key={row.key}
                                    id={`${listId}-${item.index}`}
                                    role="option"
                                    aria-selected={item.index === current}
                                    style={style}
                                    onClick={() => open(item.index)}
                                    className={cn(
                                        "hover:bg-sidebar-accent/60 absolute start-0 top-0 flex w-full cursor-default items-center gap-2 ps-8 pe-2 font-mono text-[12px]",
                                        item.index === current && "bg-sidebar-accent text-sidebar-accent-foreground"
                                    )}
                                >
                                    <span className="text-muted-foreground w-8 shrink-0 text-end tabular-nums">{row.match.line}</span>
                                    <Highlighted match={row.match} />
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}
