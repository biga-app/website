"use client";

import { useBroadcast } from "@/components/home/broadcast-clock";

import { ArtFrame } from "./art-frame";
import { Box, Label, Packet, Pulse, Wire, type Point } from "./primitives";

const FOLDER: Point = [30, 150];
const CLI: Point = [196, 164];
const SERVER: Point = [316, 164];
const VIEWERS: readonly Point[] = [
    [452, 58],
    [452, 154],
    [452, 250],
];

const FILE_LINES = [0, 1, 2, 3];

function Window({ x, y, live }: { x: number; y: number; live: boolean }) {
    return (
        <Box x={x} y={y} width={104} height={64} tone={live ? "live" : "default"}>
            <line x1={x} x2={x + 104} y1={y + 14} y2={y + 14} className="stroke-foreground/25" strokeWidth="1" />
            {[0, 1, 2].map((row) => (
                <rect
                    key={row}
                    x={x + 10}
                    y={y + 24 + row * 11}
                    width={row === 1 ? 62 : 44 + row * 12}
                    height={4}
                    rx={2}
                    className={row === 1 && live ? "fill-brand" : "fill-muted-foreground/30"}
                />
            ))}
        </Box>
    );
}

export function BroadcastFigure({ className }: { className?: string }) {
    const { saves } = useBroadcast();
    const toServer: readonly Point[] = [
        [FOLDER[0] + 112, FOLDER[1] + 36],
        [CLI[0], CLI[1] + 16],
    ];
    const toViewer = (target: Point): readonly Point[] => [
        [SERVER[0] + 88, SERVER[1] + 16],
        [410, SERVER[1] + 16],
        [410, target[1] + 32],
        [target[0], target[1] + 32],
    ];

    return (
        <ArtFrame
            viewBox="0 0 580 350"
            title="How a save reaches viewers"
            description="A folder is watched by the biga command. A saved file travels to the server, which sends it to every open viewer."
            className={className}
        >
            <Wire points={[[FOLDER[0] + 112, FOLDER[1] + 36], [CLI[0], CLI[1] + 16]]} />
            <Wire points={[[CLI[0] + 80, CLI[1] + 16], [SERVER[0], SERVER[1] + 16]]} />
            {VIEWERS.map((viewer) => (
                <Wire key={viewer[1]} points={toViewer(viewer).slice(0, 4) as Point[]} />
            ))}

            <Box x={FOLDER[0]} y={FOLDER[1]} width={112} height={72}>
                <path d={`M${FOLDER[0]} ${FOLDER[1] + 14} h112`} className="stroke-foreground/25" strokeWidth="1" />
                {FILE_LINES.map((row) => (
                    <rect
                        key={row}
                        x={FOLDER[0] + 12}
                        y={FOLDER[1] + 24 + row * 10}
                        width={row === 2 ? 70 : 50 + row * 6}
                        height={4}
                        rx={2}
                        className={row === 2 ? "fill-brand" : "fill-muted-foreground/30"}
                    />
                ))}
            </Box>
            <Label x={FOLDER[0]} y={FOLDER[1] + 92}>
                your folder
            </Label>

            <Box x={CLI[0]} y={CLI[1]} width={80} height={32} tone="live">
                <Label x={CLI[0] + 40} y={CLI[1] + 20} textAnchor="middle" className="fill-foreground">
                    biga
                </Label>
            </Box>
            <Label x={CLI[0]} y={CLI[1] + 52}>
                hash, batch
            </Label>

            <Box x={SERVER[0]} y={SERVER[1]} width={88} height={32}>
                <Label x={SERVER[0] + 44} y={SERVER[1] + 20} textAnchor="middle" className="fill-foreground">
                    server
                </Label>
            </Box>
            <Label x={SERVER[0]} y={SERVER[1] + 52}>
                stores, fans out
            </Label>

            {VIEWERS.map((viewer, index) => (
                <g key={viewer[1]}>
                    <Window x={viewer[0]} y={viewer[1]} live={saves > 0 && index === (saves - 1) % VIEWERS.length} />
                </g>
            ))}
            <Label x={452} y={VIEWERS[2]![1] + 86}>
                viewers, read-only
            </Label>

            <Packet points={toServer} run={saves} />
            <Packet points={[[CLI[0] + 80, CLI[1] + 16], [SERVER[0], SERVER[1] + 16]]} run={saves} delay={0.9} duration={0.7} />
            {VIEWERS.map((viewer, index) => (
                <Packet key={viewer[1]} points={toViewer(viewer)} run={saves} delay={1.5 + index * 0.1} duration={1.2} />
            ))}
            <Pulse x={CLI[0] + 40} y={CLI[1] + 16} run={saves} delay={0.8} />
        </ArtFrame>
    );
}
