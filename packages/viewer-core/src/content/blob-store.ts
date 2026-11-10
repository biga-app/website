import type { BlobEntry, BlobStoreOptions } from "@biga/types/content";

const BYTES_PER_UNIT = 2;
const DEFAULT_BUDGET_BYTES = 32 * 1024 * 1024;
const LOW_MEMORY_BUDGET_BYTES = 12 * 1024 * 1024;
const LOW_MEMORY_GIB = 4;

export function defaultBudgetBytes(deviceMemoryGiB?: number): number {
    return deviceMemoryGiB !== undefined && deviceMemoryGiB <= LOW_MEMORY_GIB
        ? LOW_MEMORY_BUDGET_BYTES
        : DEFAULT_BUDGET_BYTES;
}

export function measureContent(content: string): BlobEntry {
    if (content === "") return { content, lineCount: 0, maxLineLength: 0 };
    let lineCount = 1;
    let maxLineLength = 0;
    let start = 0;
    for (let end = content.indexOf("\n"); end !== -1; end = content.indexOf("\n", start)) {
        maxLineLength = Math.max(maxLineLength, end - start);
        lineCount++;
        start = end + 1;
    }
    return { content, lineCount, maxLineLength: Math.max(maxLineLength, content.length - start) };
}

function estimateBytes(entry: BlobEntry): number {
    return entry.content.length * BYTES_PER_UNIT;
}

export function createBlobStore(options: BlobStoreOptions) {
    const entries = new Map<string, BlobEntry>();
    const pins = new Map<string, number>();
    const inflight = new Map<string, Promise<BlobEntry>>();
    let bytes = 0;

    function isPinned(hash: string): boolean {
        return (pins.get(hash) ?? 0) > 0;
    }

    function evict(keep: string): void {
        for (const hash of entries.keys()) {
            if (entries.size <= options.maxEntries && bytes <= options.budgetBytes) return;
            if (hash === keep || isPinned(hash)) continue;
            remove(hash);
        }
    }

    function newestHash(): string {
        let newest = "";
        for (const hash of entries.keys()) newest = hash;
        return newest;
    }

    function remove(hash: string): void {
        const entry = entries.get(hash);
        if (!entry) return;
        bytes -= estimateBytes(entry);
        entries.delete(hash);
    }

    function set(hash: string, content: string): BlobEntry {
        remove(hash);
        const entry = measureContent(content);
        entries.set(hash, entry);
        bytes += estimateBytes(entry);
        evict(hash);
        return entry;
    }

    function get(hash: string): BlobEntry | undefined {
        const entry = entries.get(hash);
        if (entry) {
            entries.delete(hash);
            entries.set(hash, entry);
        }
        return entry;
    }

    function load(hash: string, fetchContent: () => Promise<string>): Promise<BlobEntry> {
        const cached = get(hash);
        if (cached) return Promise.resolve(cached);
        const pending = inflight.get(hash);
        if (pending) return pending;
        const started = fetchContent()
            .then((content) => set(hash, content))
            .finally(() => inflight.delete(hash));
        inflight.set(hash, started);
        return started;
    }

    return {
        get,
        set,
        load,
        has: (hash: string) => entries.has(hash),
        isLoading: (hash: string) => inflight.has(hash),
        prefill(contents: Record<string, string>): void {
            for (const [hash, content] of Object.entries(contents)) set(hash, content);
        },
        pin(hash: string): void {
            pins.set(hash, (pins.get(hash) ?? 0) + 1);
        },
        unpin(hash: string): void {
            const count = (pins.get(hash) ?? 0) - 1;
            if (count > 0) pins.set(hash, count);
            else pins.delete(hash);
            evict(newestHash());
        },
        clear(): void {
            entries.clear();
            pins.clear();
            bytes = 0;
        },
        get size() {
            return entries.size;
        },
        get bytes() {
            return bytes;
        },
    };
}
