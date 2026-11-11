import { ArtFrame } from "./art-frame";
import { Box, Label, Wire } from "./primitives";

const BRANCHES = [
    { name: "src/", shared: true },
    { name: "docs/", shared: true },
    { name: ".env", shared: false, note: "ignored by default" },
    { name: "node_modules/", shared: false, note: "in .gitignore" },
    { name: "deploy.key", shared: false, note: "secret scan" },
];

export function IgnoreFilterFigure({ className }: { className?: string }) {
    return (
        <ArtFrame
            viewBox="0 0 520 290"
            title="What gets shared"
            description="From the project folder, source and docs are shared. Environment files, ignored folders and files that look like secrets stop at the folder."
            className={className}
        >
            <Box x={16} y={110} width={96} height={40}>
                <Label x={64} y={134} textAnchor="middle" className="fill-foreground">
                    project/
                </Label>
            </Box>
            {BRANCHES.map((branch, index) => {
                const y = 14 + index * 54;
                return (
                    <g key={branch.name}>
                        <Wire points={[[112, 130], [150, 130], [150, y + 20], [180, y + 20]]} dashed={!branch.shared} />
                        <Box x={180} y={y} width={130} height={40} tone={branch.shared ? "live" : "default"} className={branch.shared ? undefined : "[stroke-dasharray:3_4]"}>
                            <Label x={194} y={y + 24} className="fill-foreground">
                                {branch.name}
                            </Label>
                        </Box>
                        {branch.shared ? (
                            <>
                                <Wire points={[[310, y + 20], [370, y + 20]]} className="stroke-brand" />
                                <Label x={380} y={y + 24} className="fill-brand-text">
                                    shared
                                </Label>
                            </>
                        ) : (
                            <>
                                <line x1={330} x2={330} y1={y + 10} y2={y + 30} className="stroke-destructive" strokeWidth="1.5" />
                                <Label x={380} y={y + 24}>
                                    {branch.note}
                                </Label>
                            </>
                        )}
                    </g>
                );
            })}
        </ArtFrame>
    );
}
