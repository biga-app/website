import { createParser, createSearchParamsCache, createSerializer, parseAsString } from "nuqs/server";

export type CompareBase = { kind: "start" } | { kind: "checkpoint"; seq: number };

export type ViewerView =
    | { type: "live" }
    | { type: "file"; path: string; base: CompareBase | null }
    | { type: "checkpoint"; seq: number; file: string | null };

const MAX_SEQ = 2147483647;
const SEQ_PATTERN = /^\d{1,10}$/;

function parseSeq(value: string): number | null {
    if (!SEQ_PATTERN.test(value)) return null;
    const seq = Number(value);
    return seq <= MAX_SEQ ? seq : null;
}

const seqParser = createParser<number>({
    parse: parseSeq,
    serialize: String,
});

const baseParser = createParser<CompareBase>({
    parse: (value) => {
        if (value === "start") return { kind: "start" };
        const seq = parseSeq(value);
        return seq === null ? null : { kind: "checkpoint", seq };
    },
    serialize: (base) => (base.kind === "start" ? "start" : String(base.seq)),
    eq: (a, b) => a.kind === b.kind && (a.kind === "start" || (b.kind === "checkpoint" && a.seq === b.seq)),
});

const embedParser = createParser<boolean>({
    parse: (value) => (value === "1" ? true : null),
    serialize: () => "1",
}).withDefault(false);

export const viewerParsers = {
    file: parseAsString,
    checkpoint: seqParser,
    base: baseParser,
    embed: embedParser,
};

export const viewerSearchParamsCache = createSearchParamsCache(viewerParsers);

export const serializeViewerUrl = createSerializer(viewerParsers, { clearOnDefault: true });

export function deriveView(params: {
    file: string | null;
    checkpoint: number | null;
    base: CompareBase | null;
}): ViewerView {
    if (params.checkpoint !== null) return { type: "checkpoint", seq: params.checkpoint, file: params.file || null };
    if (params.file) return { type: "file", path: params.file, base: params.base };
    return { type: "live" };
}
