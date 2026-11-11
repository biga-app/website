"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode, SVGProps } from "react";

import { cn } from "@biga/ui/lib/utils";

export type Point = readonly [number, number];

export function Label({ className, children, ...props }: SVGProps<SVGTextElement>) {
    return (
        <text
            className={cn("fill-muted-foreground font-mono text-[12px]", className)}
            {...props}
        >
            {children}
        </text>
    );
}

export function Box({
    x,
    y,
    width,
    height,
    radius = 6,
    tone = "default",
    className,
    children,
}: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    tone?: "default" | "live";
    className?: string;
    children?: ReactNode;
}) {
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={radius}
                className={cn("fill-card stroke-foreground/25", tone === "live" && "stroke-brand", className)}
                strokeWidth="1"
            />
            {children}
        </g>
    );
}

export function Wire({ points, dashed = false, className }: { points: readonly Point[]; dashed?: boolean; className?: string }) {
    const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
    return <path d={d} className={cn("stroke-foreground/25", className)} strokeWidth="1" strokeDasharray={dashed ? "3 4" : undefined} strokeLinejoin="round" />;
}

function progressTimes(points: readonly Point[]): number[] {
    const lengths = points.slice(1).map(([x, y], index) => {
        const [px, py] = points[index] as Point;
        return Math.hypot(x - px, y - py);
    });
    const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
    let travelled = 0;
    return [0, ...lengths.map((length) => (travelled += length) / total)];
}

export function Packet({
    points,
    run,
    delay = 0,
    duration = 1.1,
    className,
}: {
    points: readonly Point[];
    run: number;
    delay?: number;
    duration?: number;
    className?: string;
}) {
    const reduce = useReducedMotion();
    if (reduce || run === 0) return null;
    const times = progressTimes(points);
    const first = points[0] as Point;
    return (
        <motion.circle
            key={run}
            r={3.5}
            className={cn("fill-brand", className)}
            initial={{ cx: first[0], cy: first[1], opacity: 0 }}
            animate={{ cx: points.map(([x]) => x), cy: points.map(([, y]) => y), opacity: 1 }}
            transition={{
                cx: { duration, delay, times, ease: "linear" },
                cy: { duration, delay, times, ease: "linear" },
                opacity: { duration: 0.15, delay },
            }}
        />
    );
}

export function Pulse({ x, y, run, delay = 0 }: { x: number; y: number; run: number; delay?: number }) {
    const reduce = useReducedMotion();
    if (reduce || run === 0) return null;
    return (
        <motion.circle
            key={run}
            cx={x}
            cy={y}
            r={4}
            className="stroke-brand"
            strokeWidth="1.5"
            initial={{ r: 4, opacity: 0.9 }}
            animate={{ r: 14, opacity: 0 }}
            transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
    );
}

function seedBits(seed: string, count: number): boolean[] {
    let state = 0x811c9dc5;
    const bits: boolean[] = [];
    for (let index = 0; bits.length < count; index++) {
        state = Math.imul(state ^ (seed.charCodeAt(index % seed.length) + index), 0x01000193) >>> 0;
        bits.push((state & 0x100) !== 0);
    }
    return bits;
}

export function DotGlyph({ x, y, seed, columns = 8, rows = 3, pitch = 5, className }: { x: number; y: number; seed: string; columns?: number; rows?: number; pitch?: number; className?: string }) {
    const bits = seedBits(seed, columns * rows);
    return (
        <g className={className}>
            {bits.map((on, index) => (
                <circle
                    key={index}
                    cx={x + (index % columns) * pitch}
                    cy={y + Math.floor(index / columns) * pitch}
                    r={on ? 1.5 : 0.8}
                    className={on ? "fill-current" : "fill-current opacity-40"}
                />
            ))}
        </g>
    );
}

export function CodeLines({ x, y, widths, mark, pitch = 11, className }: { x: number; y: number; widths: readonly number[]; mark?: number; pitch?: number; className?: string }) {
    return (
        <g className={className}>
            {widths.map((width, index) => (
                <rect
                    key={index}
                    x={x}
                    y={y + index * pitch}
                    width={width}
                    height={4}
                    rx={2}
                    className={index === mark ? "fill-brand" : "fill-muted-foreground/30"}
                />
            ))}
        </g>
    );
}

export function Dimension({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
    return (
        <g>
            <line x1={x1} x2={x2} y1={y} y2={y} className="stroke-foreground/40" strokeWidth="1" />
            <line x1={x1} x2={x1} y1={y - 4} y2={y + 4} className="stroke-foreground/40" strokeWidth="1" />
            <line x1={x2} x2={x2} y1={y - 4} y2={y + 4} className="stroke-foreground/40" strokeWidth="1" />
            <Label x={(x1 + x2) / 2} y={y - 8} textAnchor="middle">
                {label}
            </Label>
        </g>
    );
}
