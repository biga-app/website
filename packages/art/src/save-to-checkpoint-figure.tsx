import { CHECKPOINT_IDLE_MS, CHECKPOINT_MAX_WAIT_MS } from "@biga/viewer/lib/checkpoint-timing";

import { ArtFrame } from "./art-frame";
import { Dimension, Label } from "./primitives";

const SAVES = [40, 62, 84, 118, 140, 196, 230];

export function SaveToCheckpointFigure({ className }: { className?: string }) {
    return (
        <ArtFrame
            viewBox="0 0 560 200"
            title="From saves to one checkpoint"
            description={`A burst of saves waits until the folder has been quiet for ${CHECKPOINT_IDLE_MS} milliseconds, or at most ${CHECKPOINT_MAX_WAIT_MS} milliseconds, then goes out as one checkpoint.`}
            className={className}
        >
            <line x1={20} x2={540} y1={100} y2={100} className="stroke-foreground/25" strokeWidth="1" />
            {SAVES.map((x) => (
                <g key={x}>
                    <line x1={x} x2={x} y1={84} y2={116} className="stroke-foreground/60" strokeWidth="1.5" />
                </g>
            ))}
            <Label x={40} y={140}>
                saves
            </Label>
            <Dimension x1={230} x2={350} y={60} label={`${CHECKPOINT_IDLE_MS} ms of quiet`} />
            <Dimension x1={40} x2={500} y={30} label={`${CHECKPOINT_MAX_WAIT_MS / 1000} s at most`} />
            <path d="M350 100 H470" className="stroke-brand" strokeWidth="1.5" strokeDasharray="3 4" />
            <rect x={470} y={82} width={52} height={36} rx={6} className="fill-brand/15 stroke-brand" strokeWidth="1.5" />
            <Label x={496} y={104} textAnchor="middle" className="fill-foreground">
                #42
            </Label>
            <Label x={470} y={140}>
                one checkpoint
            </Label>
        </ArtFrame>
    );
}
