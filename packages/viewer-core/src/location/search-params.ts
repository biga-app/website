import type { CompareBase, ViewerView } from "@biga/types/viewer-location";
import { createParser, createSearchParamsCache, createSerializer, parseAsString } from "nuqs/server";

const MAX_SEQ = 2147483647;
const SEQ_PATTERN = /^\d{1,10}$/;
const MAX_LINE = 10_000_000;
const LINE_PATTERN = /^[1-9]\d{0,7}$/;

function parseSeq(value: string): number | null {
    if (!SEQ_PATTERN.test(value)) return null;
    const seq = Number(value);
    return seq <= MAX_SEQ ? seq : null;
}

function parseLine(value: string): number | null {
    if (!LINE_PATTERN.test(value)) return null;
    const line = Number(value);
    return line <= MAX_LINE ? line : null;
}

const seqParser = createParser<number>({
    parse: parseSeq,
    serialize: String,
});

const lineParser = createParser<number>({
    parse: parseLine,
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

const flagParser = createParser<boolean>({
    parse: (value) => (value === "1" ? true : null),
    serialize: () => "1",
});

const embedParser = flagParser.withDefault(false);

export const viewerParsers = {
    file: parseAsString,
    checkpoint: seqParser,
    base: baseParser,
    line: lineParser,
    split: parseAsString,
    overview: flagParser,
    embed: embedParser,
};

export const viewerSearchParamsCache = createSearchParamsCache(viewerParsers);

export const serializeViewerUrl = createSerializer(viewerParsers, { clearOnDefault: true });

export function deriveView(params: {
    file: string | null;
    checkpoint: number | null;
    base: CompareBase | null;
    line?: number | null;
    overview?: boolean | null;
}): ViewerView {
    if (params.checkpoint !== null) return { type: "checkpoint", seq: params.checkpoint, file: params.file || null };
    if (params.file) return { type: "file", path: params.file, base: params.base, line: params.line ?? null };
    if (params.overview) return { type: "overview" };
    return { type: "live" };
}
