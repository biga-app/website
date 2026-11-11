export type SearchOptions = {
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    regex: boolean;
};

export type LineMatch = {
    line: number;
    text: string;
    from: number;
    to: number;
};

export type FileMatches = {
    path: string;
    matches: LineMatch[];
};

export type Matcher = { ok: true; pattern: RegExp } | { ok: false; error: string };

export type SearchSummary = {
    searched: number;
    total: number;
    matches: number;
    files: number;
    truncated: boolean;
    cancelled: boolean;
};

export type SearchRun = {
    paths: readonly string[];
    options: SearchOptions;
    load: (path: string) => Promise<string | null>;
    onFile: (result: FileMatches) => void;
    onProgress?: (searched: number, total: number) => void;
    signal?: AbortSignal;
    concurrency?: number;
    maxMatches?: number;
};

export const MAX_MATCHES = 2000;
export const MAX_MATCHES_PER_FILE = 200;
const CONTEXT_BEFORE = 48;
const CONTEXT_AFTER = 160;
const DEFAULT_CONCURRENCY = 6;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileMatcher(options: SearchOptions): Matcher | null {
    if (options.query === "") return null;
    const source = options.regex ? options.query : escapeRegExp(options.query);
    const bounded = options.wholeWord ? `\\b(?:${source})\\b` : source;
    try {
        const pattern = new RegExp(bounded, options.caseSensitive ? "g" : "gi");
        if (pattern.test("")) return { ok: false, error: "The pattern matches empty text." };
        pattern.lastIndex = 0;
        return { ok: true, pattern };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Invalid pattern." };
    }
}

function excerpt(line: string, start: number, end: number): Pick<LineMatch, "text" | "from" | "to"> {
    const left = Math.max(0, start - CONTEXT_BEFORE);
    const right = Math.min(line.length, end + CONTEXT_AFTER);
    const prefix = left > 0 ? "…" : "";
    const suffix = right < line.length ? "…" : "";
    const text = prefix + line.slice(left, right) + suffix;
    return { text, from: prefix.length + start - left, to: prefix.length + end - left };
}

export function matchContent(content: string, pattern: RegExp, limit = MAX_MATCHES_PER_FILE): LineMatch[] {
    const found: LineMatch[] = [];
    const lines = content.split("\n");
    for (let index = 0; index < lines.length && found.length < limit; index++) {
        const raw = lines[index] as string;
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        pattern.lastIndex = 0;
        for (let hit = pattern.exec(line); hit !== null && found.length < limit; hit = pattern.exec(line)) {
            if (hit[0] === "") {
                pattern.lastIndex++;
                continue;
            }
            found.push({ line: index + 1, ...excerpt(line, hit.index, hit.index + hit[0].length) });
        }
    }
    return found;
}

export async function searchContent(run: SearchRun): Promise<SearchSummary> {
    const matcher = compileMatcher(run.options);
    const total = run.paths.length;
    const summary: SearchSummary = { searched: 0, total, matches: 0, files: 0, truncated: false, cancelled: false };
    if (matcher === null || !matcher.ok) return summary;

    const limit = run.maxMatches ?? MAX_MATCHES;
    let next = 0;

    async function worker(): Promise<void> {
        while (!run.signal?.aborted && summary.matches < limit) {
            const path = run.paths[next++];
            if (path === undefined) return;
            const content = await run.load(path).catch(() => null);
            if (run.signal?.aborted) return;
            summary.searched++;
            if (content !== null && matcher !== null && matcher.ok) {
                const room = limit - summary.matches;
                const matches = matchContent(content, matcher.pattern, Math.min(MAX_MATCHES_PER_FILE, room));
                if (matches.length > 0) {
                    summary.matches += matches.length;
                    summary.files++;
                    run.onFile({ path, matches });
                }
            }
            run.onProgress?.(summary.searched, total);
        }
    }

    const workers = Array.from({ length: Math.max(1, run.concurrency ?? DEFAULT_CONCURRENCY) }, () => worker());
    await Promise.all(workers);
    summary.cancelled = run.signal?.aborted ?? false;
    summary.truncated = !summary.cancelled && summary.matches >= limit && summary.searched < total;
    return summary;
}
