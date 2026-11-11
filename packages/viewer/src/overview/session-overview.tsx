"use client";

import { baseName } from "@biga/types/file-identity";
import { formatBytes } from "@biga/viewer-core/runtime/session-stats";
import { GitCommitVerticalIcon, LockIcon, LockOpenIcon } from "lucide-react";

import { FileTypeIcon } from "@biga/viewer/file-icon";
import { Button } from "@biga/ui/components/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@biga/ui/components/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@biga/ui/components/input-group";
import { Progress } from "@biga/ui/components/progress";
import { ScrollArea } from "@biga/ui/components/scroll-area";
import { ActivityChart } from "@biga/viewer/viewer/activity-chart";
import { CopyButton } from "@biga/viewer/viewer/copy-button";
import { DiffStat } from "@biga/viewer/viewer/diff-stat";
import { EmptyState } from "@biga/viewer/viewer/empty-state";
import { RowButton } from "@biga/viewer/viewer/row-button";
import { StatTile } from "@biga/viewer/viewer/stat-tile";
import { formatDateTime, formatRelativeTime, pluralize } from "@biga/viewer/lib/change-meta";
import { languageLabel } from "@biga/viewer/lib/languages";
import { displayTitle, shareUrlFor } from "@biga/viewer/lib/session-title";
import { useNow } from "@biga/viewer/lib/use-now";
import { cn } from "@biga/ui/lib/utils";

import { useCommandContext } from "../commands/command-provider";
import { useRuntime, useStoreValue } from "../runtime/runtime-provider";
import { STATUS_DOT, STATUS_LABELS } from "../shell/status-meta";
import { useOverviewData } from "./use-overview-data";

function Section({ title, meta, className, children }: { title: string; meta?: string; className?: string; children: React.ReactNode }) {
    return (
        <Card className={cn("min-w-0", className)}>
            <CardHeader>
                <CardTitle role="heading" aria-level={2}>
                    {title}
                </CardTitle>
                {meta ? (
                    <CardAction>
                        <span className="text-muted-foreground text-xs tabular-nums">{meta}</span>
                    </CardAction>
                ) : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">{children}</CardContent>
        </Card>
    );
}

function LanguageList({ languages, total }: { languages: ReturnType<typeof useOverviewData>["languages"]; total: number }) {
    if (languages.length === 0) return <p className="text-muted-foreground text-sm">No files yet.</p>;
    return (
        <ul className="flex flex-col gap-2.5">
            {languages.map((share) => {
                const percent = total === 0 ? 0 : (share.files / total) * 100;
                return (
                    <li key={share.language} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate">{share.language === "other" ? "Other" : languageLabel(share.language)}</span>
                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                {pluralize(share.files, "file")} · {formatBytes(share.bytes)}
                            </span>
                        </div>
                        <Progress value={Math.max(2, percent)} aria-label={`${share.language} share of files`} />
                    </li>
                );
            })}
        </ul>
    );
}

export function SessionOverview() {
    const runtime = useRuntime();
    const { session: sessionStore, history } = runtime.stores;
    const session = useStoreValue(sessionStore, (state) => state.session);
    const status = useStoreValue(runtime.stores.connection, (state) => state.status);
    const summaries = useStoreValue(history, (state) => state.checkpoints);
    const { actions } = useCommandContext();
    const now = useNow();
    const data = useOverviewData();

    if (!session) return null;

    const latest = summaries.at(-1);
    const recent = summaries.slice(-8).reverse();
    const link = typeof window === "undefined" ? "" : shareUrlFor(runtime.sessionId, undefined, runtime.shareKey);
    const earliestShown = data.buckets[0]?.start;

    return (
        <ScrollArea className="h-full">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
                <header className="flex flex-col gap-1">
                    <h1 className="text-lg font-semibold tracking-[-0.01em]">{displayTitle(session)}</h1>
                    {session.description ? <p className="text-muted-foreground text-sm">{session.description}</p> : null}
                </header>

                <div role="group" aria-label="Session facts" className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
                    <StatTile
                        label="Status"
                        value={
                            <span className="flex items-center gap-2">
                                <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                                {STATUS_LABELS[status]}
                            </span>
                        }
                        hint={latest ? `Last save ${formatRelativeTime(latest.createdAt, now)}` : "No saves yet"}
                    />
                    <StatTile label="Started" value={formatRelativeTime(session.createdAt, now)} hint={formatDateTime(session.createdAt)} />
                    <StatTile label="Files" value={data.fileCount.toLocaleString()} hint={formatBytes(data.bytes)} />
                    <StatTile
                        label="Checkpoints"
                        value={data.totalSaves.toLocaleString()}
                        hint={latest ? `Latest #${latest.seq}` : undefined}
                    />
                    <StatTile
                        label="Changes"
                        value={<DiffStat additions={summaries.reduce((sum, item) => sum + item.additions, 0)} deletions={summaries.reduce((sum, item) => sum + item.deletions, 0)} className="text-lg" />}
                        hint="In the saves loaded"
                    />
                    <StatTile
                        label="Privacy"
                        value={
                            <span className="flex items-center gap-2">
                                {session.encrypted ? <LockIcon className="size-4" aria-hidden /> : <LockOpenIcon className="text-muted-foreground size-4" aria-hidden />}
                                {session.encrypted ? "Encrypted" : "Not encrypted"}
                            </span>
                        }
                        hint={session.encrypted ? "The key stays in the link" : "The server can read files"}
                    />
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <Section
                        title="Activity"
                        meta={
                            earliestShown
                                ? `${pluralize(data.totalSaves, "save")} since ${formatRelativeTime(new Date(earliestShown).toISOString(), now)}`
                                : undefined
                        }
                    >
                        {data.buckets.length === 0 ? (
                            <EmptyState icon={GitCommitVerticalIcon} title="No saves yet" description="Each time the broadcaster saves, the chart fills in." />
                        ) : (
                            <ActivityChart buckets={data.buckets} />
                        )}
                        {data.canLoadEarlier ? (
                            <Button variant="outline" size="xs" className="w-fit" disabled={data.loadingEarlier} onClick={data.loadEarlier}>
                                {data.loadingEarlier ? "Loading…" : "Load earlier saves"}
                            </Button>
                        ) : null}
                    </Section>

                    <Section title="Languages" meta={pluralize(data.fileCount, "file")}>
                        <LanguageList languages={data.languages} total={data.fileCount} />
                    </Section>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Section title="Most changed files" meta={data.topLoading ? "Loading…" : "Latest saves"}>
                        {data.topFiles.length === 0 ? (
                            <p className="text-muted-foreground text-sm">{data.topLoading ? "Reading the latest saves…" : "No changes beyond the first snapshot yet."}</p>
                        ) : (
                            <ul className="-mx-2 flex flex-col">
                                {data.topFiles.map((file) => (
                                    <li key={file.path}>
                                        <RowButton onClick={() => actions.openFile(file.path)} className="rounded-md px-2 py-1.5 text-sm">
                                            <FileTypeIcon kind="file" name={baseName(file.path)} className="size-4 shrink-0" />
                                            <span className="min-w-0 flex-1 truncate" title={file.path}>
                                                {file.path}
                                            </span>
                                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{pluralize(file.changes, "change")}</span>
                                            <DiffStat additions={file.additions} deletions={file.deletions} className="hidden shrink-0 text-xs sm:flex" />
                                        </RowButton>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section title="Recent saves" meta={latest ? `#${latest.seq}` : undefined}>
                        {recent.length === 0 ? (
                            <p className="text-muted-foreground text-sm">Saves appear here as they land.</p>
                        ) : (
                            <ul className="-mx-2 flex flex-col">
                                {recent.map((summary) => (
                                    <li key={summary.seq}>
                                        <RowButton onClick={() => actions.openCheckpoint(summary.seq, null, "push")} className="rounded-md px-2 py-1.5 text-sm">
                                            <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">#{summary.seq}</span>
                                            <span className="min-w-0 flex-1 truncate">{summary.label}</span>
                                            <DiffStat additions={summary.additions} deletions={summary.deletions} className="hidden shrink-0 text-xs sm:flex" />
                                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{formatRelativeTime(summary.createdAt, now)}</span>
                                        </RowButton>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </div>

                <Section title="Share link">
                    <InputGroup>
                        <InputGroupInput readOnly value={link} aria-label="Session link" className="font-mono text-xs" />
                        <InputGroupAddon align="inline-end">
                            <CopyButton text={link} label="Copy session link" variant="ghost" />
                        </InputGroupAddon>
                    </InputGroup>
                </Section>
            </div>
        </ScrollArea>
    );
}
