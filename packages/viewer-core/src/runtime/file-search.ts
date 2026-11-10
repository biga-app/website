export const DEFAULT_RESULT_LIMIT = 50;

const NAME_SCORE = 0;
const PATH_SCORE = 100;
const SUBSEQUENCE_SCORE = 1000;

function isSubsequence(needle: string, haystack: string): boolean {
    let cursor = 0;
    for (const char of haystack) {
        if (char === needle[cursor]) cursor++;
        if (cursor === needle.length) return true;
    }
    return needle.length === 0;
}

function scorePath(path: string, query: string): number | null {
    const lower = path.toLowerCase();
    const name = lower.slice(lower.lastIndexOf("/") + 1);
    const inName = name.indexOf(query);
    if (inName !== -1) return NAME_SCORE + inName;
    const inPath = lower.indexOf(query);
    if (inPath !== -1) return PATH_SCORE + inPath;
    return isSubsequence(query, lower) ? SUBSEQUENCE_SCORE + path.length : null;
}

export function searchPaths(paths: readonly string[], query: string, limit = DEFAULT_RESULT_LIMIT): string[] {
    const needle = query.trim().toLowerCase();
    if (needle === "") return [...paths].sort().slice(0, limit);
    const scored: { path: string; score: number }[] = [];
    for (const path of paths) {
        const score = scorePath(path, needle);
        if (score !== null) scored.push({ path, score });
    }
    scored.sort((a, b) => a.score - b.score || a.path.length - b.path.length || (a.path < b.path ? -1 : 1));
    return scored.slice(0, limit).map((item) => item.path);
}
