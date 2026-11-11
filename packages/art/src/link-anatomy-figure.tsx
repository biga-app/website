import { ArtFrame } from "./art-frame";
import { Label } from "./primitives";

export function LinkAnatomyFigure({ className }: { className?: string }) {
    return (
        <ArtFrame
            viewBox="0 0 380 150"
            title="Anatomy of an encrypted share link"
            description="The server sees the host and the session id. The key after the hash sign stays in the viewer's browser."
            className={className}
        >
            <text x={10} y={36} className="fill-foreground font-mono text-[15px]">
                biga.n10nce.dev/session/k3f9zq2a
                <tspan className="fill-brand-text">#k=7Hq2</tspan>
            </text>
            <path d="M10 50 V58 H296 V50" className="stroke-foreground/40" strokeWidth="1" fill="none" />
            <Label x={153} y={76} textAnchor="middle" className="text-[11px]">
                the server sees this
            </Label>
            <path d="M302 50 V58 H364 V50" className="stroke-brand" strokeWidth="1.5" fill="none" />
            <Label x={333} y={76} textAnchor="middle" className="fill-brand-text text-[12px]">
                stays in
            </Label>
            <Label x={333} y={90} textAnchor="middle" className="fill-brand-text text-[12px]">
                the browser
            </Label>
            <Label x={10} y={128} className="text-[11px]">
                files are sealed before upload
            </Label>
        </ArtFrame>
    );
}
