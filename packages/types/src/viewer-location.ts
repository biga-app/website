export type CompareBase = { kind: "start" } | { kind: "checkpoint"; seq: number };

export type ViewerView =
    | { type: "live" }
    | { type: "file"; path: string; base: CompareBase | null }
    | { type: "checkpoint"; seq: number; file: string | null };
