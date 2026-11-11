import { ArtFrame } from "./art-frame";
import { Box, CodeLines, Label } from "./primitives";

export function PixelsVsTextFigure({ className }: { className?: string }) {
    const cells = Array.from({ length: 6 * 8 });
    return (
        <ArtFrame
            viewBox="0 0 520 190"
            title="A screen share versus the files themselves"
            description="A screen share sends a grid of pixels that cannot be selected. biga sends the text, which stays sharp and selectable."
            className={className}
        >
            <Box x={14} y={14} width={220} height={140} />
            {cells.map((_, index) => (
                <rect
                    key={index}
                    x={30 + (index % 8) * 24}
                    y={30 + Math.floor(index / 8) * 20}
                    width={22}
                    height={18}
                    className="fill-muted-foreground"
                    opacity={0.15 + ((index * 37) % 7) * 0.08}
                />
            ))}
            <Label x={14} y={176}>
                a screen share: pixels
            </Label>
            <Box x={286} y={14} width={220} height={140} tone="live" />
            <CodeLines x={302} y={34} widths={[150, 100, 170, 70, 140, 120]} mark={2} pitch={18} />
            <rect x={300} y={66} width={176} height={14} className="fill-brand/20 stroke-brand" strokeWidth="1" />
            <Label x={286} y={176} className="fill-brand-text">
                biga: text you can select
            </Label>
        </ArtFrame>
    );
}
