"use client";

import type { ActivityBucket } from "@biga/viewer-core/runtime/session-stats";
import { useId, useState } from "react";

import { cn } from "@biga/ui/lib/utils";

const WIDTH = 600;
const HEIGHT = 120;
const GAP = 3;
const MAX_BAR = 28;

const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function rangeLabel(bucket: ActivityBucket): string {
    const span = bucket.end - bucket.start;
    if (span >= 24 * 60 * 60_000) return day.format(bucket.start);
    return `${day.format(bucket.start)}, ${clock.format(bucket.start)}`;
}

function readout(bucket: ActivityBucket): string {
    const saves = bucket.saves === 1 ? "1 save" : `${bucket.saves} saves`;
    return `${rangeLabel(bucket)} · ${saves} · +${bucket.additions.toLocaleString()} −${bucket.deletions.toLocaleString()}`;
}

export function ActivityChart({ buckets, className }: { buckets: readonly ActivityBucket[]; className?: string }) {
    const tableId = useId();
    const [active, setActive] = useState<number | null>(null);
    const peak = Math.max(1, ...buckets.map((bucket) => bucket.saves));
    const slot = WIDTH / Math.max(1, buckets.length);
    const shown = active === null ? buckets.at(-1) : buckets[active];
    const total = buckets.reduce((sum, bucket) => sum + bucket.saves, 0);

    return (
        <figure className={cn("flex flex-col gap-3", className)}>
            <figcaption className="text-muted-foreground flex min-h-5 items-center justify-between gap-3 text-xs tabular-nums">
                <span aria-live="polite">{shown ? readout(shown) : "No saves yet"}</span>
            </figcaption>
            <svg
                role="img"
                aria-labelledby={`${tableId}-title`}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                className="h-32 w-full overflow-visible"
                onPointerLeave={() => setActive(null)}
            >
                <title id={`${tableId}-title`}>{`Saves over time: ${total} saves in ${buckets.length} intervals`}</title>
                <line x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                {buckets.map((bucket, index) => {
                    const height = bucket.saves === 0 ? 0 : Math.max(4, (bucket.saves / peak) * (HEIGHT - 8));
                    const latest = index === buckets.length - 1;
                    const barWidth = Math.min(MAX_BAR, Math.max(1, slot - GAP));
                    return (
                        <g key={bucket.start} onPointerEnter={() => setActive(index)}>
                            <rect x={index * slot} y="0" width={slot} height={HEIGHT} className="fill-transparent" />
                            <rect
                                x={index * slot + (slot - barWidth) / 2}
                                y={HEIGHT - height}
                                width={barWidth}
                                height={height}
                                rx="2"
                                className={cn(latest ? "fill-biga" : "fill-foreground/30", active === index && "fill-brand")}
                            />
                        </g>
                    );
                })}
            </svg>
            <table className="sr-only">
                <caption>Saves over time</caption>
                <thead>
                    <tr>
                        <th scope="col">Interval</th>
                        <th scope="col">Saves</th>
                        <th scope="col">Added lines</th>
                        <th scope="col">Removed lines</th>
                    </tr>
                </thead>
                <tbody>
                    {buckets.map((bucket) => (
                        <tr key={bucket.start}>
                            <th scope="row">{rangeLabel(bucket)}</th>
                            <td>{bucket.saves}</td>
                            <td>{bucket.additions}</td>
                            <td>{bucket.deletions}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}
