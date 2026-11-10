import { createBlobStore, defaultBudgetBytes } from "@biga/viewer-core/content/blob-store";

const MAX_ENTRIES = 120;

function deviceMemoryGiB(): number | undefined {
    return typeof navigator === "undefined" ? undefined : (navigator as { deviceMemory?: number }).deviceMemory;
}

export const contentCache = createBlobStore({
    budgetBytes: defaultBudgetBytes(deviceMemoryGiB()),
    maxEntries: MAX_ENTRIES,
});
