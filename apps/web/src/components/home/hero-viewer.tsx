"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { useBroadcast } from "@/components/home/broadcast-clock";
import { PauseButton } from "@/components/home/pause-button";
import { ShowcaseProvider } from "@/components/showcase/showcase-provider";
import { Scaled } from "@/components/showcase/scaled";
import { PanelCode, PanelFiles, PanelHeader, PanelTimeline } from "@/components/showcase/viewer-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const BASE = "120";
const VALUES = ["150", "200", "80", "100", "250"];
const FIRST_LINE = 62;

function valueFor(saves: number): string {
    return saves === 0 ? BASE : (VALUES[(saves - 1) % VALUES.length] as string);
}

function ViewerSurface({ value, compact = false }: { value: string; compact?: boolean }) {
    return (
        <div inert className="flex h-full flex-col">
            <div className="h-12 shrink-0">
                <PanelHeader live />
            </div>
            <div className="flex min-h-0 flex-1">
                {compact ? null : (
                    <div className="w-72 shrink-0">
                        <PanelFiles />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <PanelCode
                        save={value === BASE ? undefined : { from: BASE, to: value, target: "hero-change" }}
                        firstLine={FIRST_LINE}
                        wrap
                        tabSize={2}
                    />
                </div>
                {compact ? null : (
                    <div className="w-72 shrink-0">
                        <PanelTimeline />
                    </div>
                )}
            </div>
        </div>
    );
}

function Terminal({ saves }: { saves: number }) {
    const lines = Array.from({ length: Math.min(saves, 3) }, (_, index) => saves - index).reverse();
    return (
        <div role="log" aria-label="What the biga command prints" className="bg-terminal text-terminal-foreground flex min-h-[4.5rem] flex-col gap-0.5 px-4 py-3 font-mono text-xs" translate="no">
            <span>
                <span className="text-terminal-accent">$</span> biga start
            </span>
            <span className="text-terminal-foreground/70">live at biga.n10nce.dev/session/k3f9zq2a</span>
            {lines.map((save) => (
                <span key={save} className="text-terminal-foreground/70">
                    checkpoint #{save + 4} <span className="text-terminal-foreground">config.go</span> +1 -1
                </span>
            ))}
        </div>
    );
}

export function HeroViewer({ host, sessionPath }: { host: string; sessionPath: string }) {
    const { saves, paused, toggle, still } = useBroadcast();
    const value = valueFor(saves);

    return (
        <ShowcaseProvider state={{ status: "active", saves }}>
            <Card className="gap-0 overflow-hidden p-0">
                <div className="flex items-center gap-3 border-b px-3 py-2">
                    <Badge variant="outline" translate="no" className="min-w-0 truncate font-mono font-normal">
                        {host}
                        {sessionPath}
                    </Badge>
                    <div className="ms-auto flex items-center gap-2">
                        {still && !paused ? null : <PauseButton paused={paused} onToggle={toggle} playLabel="Play" pauseLabel="Pause" aria-label={paused ? "Play the demo" : "Pause the demo"} />}
                        <Button render={<Link href={sessionPath} />} variant="outline" size="xs">
                            Open full screen
                            <ArrowUpRightIcon />
                        </Button>
                    </div>
                </div>
                <div className="hidden md:block">
                    <Scaled width={1180} height={520} autoHeight>
                        <ViewerSurface value={value} />
                    </Scaled>
                </div>
                <div className="md:hidden">
                    <Scaled width={520} height={400} autoHeight>
                        <ViewerSurface value={value} compact />
                    </Scaled>
                </div>
                <Separator />
                <Terminal saves={saves} />
            </Card>
        </ShowcaseProvider>
    );
}
