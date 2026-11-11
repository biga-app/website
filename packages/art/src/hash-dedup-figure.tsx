import { ArtFrame } from "./art-frame";
import { Box, DotGlyph, Label, Wire } from "./primitives";

const FILES = [
    { name: "main.go", hash: "a41f", sent: false },
    { name: "filter.go", hash: "c902", sent: false },
    { name: "config.go", hash: "7be3", sent: true },
];

export function HashDedupFigure({ className }: { className?: string }) {
    return (
        <ArtFrame
            viewBox="0 0 520 220"
            title="Only changed bytes travel"
            description="Each file is hashed. Files whose hash matches the last upload stay put. The one that changed is uploaded."
            className={className}
        >
            {FILES.map((file, index) => {
                const y = 20 + index * 62;
                return (
                    <g key={file.name}>
                        <Box x={20} y={y} width={150} height={46} tone={file.sent ? "live" : "default"} />
                        <Label x={32} y={y + 20} className="fill-foreground">
                            {file.name}
                        </Label>
                        <DotGlyph x={32} y={y + 30} seed={file.hash} columns={9} rows={2} pitch={5} className={file.sent ? "text-brand" : "text-muted-foreground"} />
                        <Label x={190} y={y + 27}>
                            {file.sent ? "new hash, upload" : "same hash, skip"}
                        </Label>
                        {file.sent ? (
                            <>
                                <Wire points={[[330, y + 23], [440, y + 23]]} className="stroke-brand" />
                                <Box x={440} y={y} width={60} height={46} tone="live">
                                    <Label x={470} y={y + 28} textAnchor="middle" className="fill-foreground">
                                        server
                                    </Label>
                                </Box>
                            </>
                        ) : null}
                    </g>
                );
            })}
        </ArtFrame>
    );
}
