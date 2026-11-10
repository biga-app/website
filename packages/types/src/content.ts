export type RequestOptions = {
    signal?: AbortSignal;
    priority?: "high" | "low" | "auto";
};

export type ApiClientOptions = {
    baseUrl: string;
    fetch: typeof fetch;
    sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
    maxAttempts?: number;
    backoffMs?: number;
};

export type BlobEntry = {
    content: string;
    lineCount: number;
    maxLineLength: number;
};

export type BlobStoreOptions = {
    budgetBytes: number;
    maxEntries: number;
};

export type DocumentTier = "full" | "reduced" | "plain";

export type DocumentMeasure = {
    bytes: number;
    lineCount: number;
    maxLineLength: number;
};

export type TierFeatures = {
    highlighting: boolean;
    folding: boolean;
    bracketColorization: boolean;
    occurrencesHighlight: boolean;
    links: boolean;
    stickyScroll: boolean;
    changeHighlight: boolean;
    maxTokenizationLineLength: number;
};
