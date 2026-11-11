import type { Checkpoint, CheckpointSummary } from "@biga/types/checkpoint";

export type ActivityBucket = {
    start: number;
    end: number;
    saves: number;
    additions: number;
    deletions: number;
};

export type ChangedFile = {
    path: string;
    changes: number;
    additions: number;
    deletions: number;
};

export type LanguageShare = {
    language: string;
    files: number;
    bytes: number;
};

export type SizedPath = { path: string; size: number };

const TARGET_BUCKETS = 24;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const NICE_STEPS = [MINUTE, 5 * MINUTE, 15 * MINUTE, 30 * MINUTE, 60 * MINUTE, 3 * 60 * MINUTE, 6 * 60 * MINUTE, DAY, 7 * DAY, 30 * DAY];

export function bucketSize(spanMs: number, target = TARGET_BUCKETS): number {
    const wanted = spanMs / target;
    return NICE_STEPS.find((step) => step >= wanted) ?? NICE_STEPS[NICE_STEPS.length - 1]!;
}

export function bucketActivity(checkpoints: readonly CheckpointSummary[]): ActivityBucket[] {
    const times = checkpoints.map((checkpoint) => new Date(checkpoint.createdAt).getTime()).filter(Number.isFinite);
    if (times.length === 0) return [];
    const first = Math.min(...times);
    const last = Math.max(...times);
    const size = bucketSize(last - first);
    const origin = Math.floor(first / size) * size;
    const count = Math.max(1, Math.ceil((last - origin + 1) / size));
    const buckets: ActivityBucket[] = Array.from({ length: count }, (_, index) => ({
        start: origin + index * size,
        end: origin + (index + 1) * size,
        saves: 0,
        additions: 0,
        deletions: 0,
    }));
    for (const checkpoint of checkpoints) {
        const time = new Date(checkpoint.createdAt).getTime();
        if (!Number.isFinite(time)) continue;
        const bucket = buckets[Math.min(count - 1, Math.floor((time - origin) / size))];
        if (!bucket) continue;
        bucket.saves += 1;
        bucket.additions += checkpoint.additions;
        bucket.deletions += checkpoint.deletions;
    }
    return buckets;
}

export function topChangedFiles(checkpoints: readonly Checkpoint[], limit: number): ChangedFile[] {
    const files = new Map<string, ChangedFile>();
    for (const checkpoint of checkpoints) {
        for (const change of checkpoint.changes) {
            const entry = files.get(change.path) ?? { path: change.path, changes: 0, additions: 0, deletions: 0 };
            entry.changes += 1;
            entry.additions += change.additions;
            entry.deletions += change.deletions;
            files.set(change.path, entry);
        }
    }
    return [...files.values()]
        .sort((a, b) => b.changes - a.changes || b.additions + b.deletions - (a.additions + a.deletions) || (a.path < b.path ? -1 : 1))
        .slice(0, limit);
}

export function languageBreakdown(files: readonly SizedPath[], languageOf: (path: string) => string, limit: number): LanguageShare[] {
    const shares = new Map<string, LanguageShare>();
    for (const file of files) {
        const language = languageOf(file.path);
        const share = shares.get(language) ?? { language, files: 0, bytes: 0 };
        share.files += 1;
        share.bytes += file.size;
        shares.set(language, share);
    }
    const ranked = [...shares.values()].sort((a, b) => b.files - a.files || b.bytes - a.bytes || (a.language < b.language ? -1 : 1));
    if (ranked.length <= limit) return ranked;
    const head = ranked.slice(0, limit - 1);
    const rest = ranked.slice(limit - 1);
    const other: LanguageShare = { language: "other", files: 0, bytes: 0 };
    for (const share of rest) {
        other.files += share.files;
        other.bytes += share.bytes;
    }
    return [...head, other];
}

export function totalBytes(files: readonly SizedPath[]): number {
    return files.reduce((sum, file) => sum + file.size, 0);
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}
