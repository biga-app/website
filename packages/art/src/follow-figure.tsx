"use client";

import { motion } from "motion/react";


import { ArtFrame } from "./art-frame";
import { Box, CodeLines, Label } from "./primitives";

const TABS = ["config.go", "filter.go", "batcher.go", "main.go"];
const TAB_WIDTH = 92;

export function FollowFigure({ className, saves = 0 }: { className?: string; saves?: number }) {
    const active = saves % TABS.length;

    return (
        <ArtFrame viewBox="0 0 420 220" title="Follow mode" description="The active tab moves to each file as it is saved." className={className}>
            <Box x={10} y={10} width={400} height={200} radius={8}>
                <line x1={10} x2={410} y1={42} y2={42} className="stroke-foreground/25" strokeWidth="1" />
                <motion.rect
                    y={16}
                    width={TAB_WIDTH}
                    height={20}
                    rx={5}
                    className="fill-brand/15 stroke-brand"
                    strokeWidth="1"
                    initial={false}
                    animate={{ x: 18 + active * (TAB_WIDTH + 4) }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                />
                {TABS.map((tab, index) => (
                    <Label key={tab} x={18 + index * (TAB_WIDTH + 4) + TAB_WIDTH / 2} y={30} textAnchor="middle" className={index === active ? "fill-foreground" : undefined}>
                        {tab}
                    </Label>
                ))}
                <CodeLines x={28} y={62} widths={[180, 120, 240, 90, 200, 150, 110]} mark={active + 1} pitch={18} />
            </Box>
        </ArtFrame>
    );
}
