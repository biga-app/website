export const KIND_FILE = 0;
export const KIND_DIRECTORY = 1;
export const KIND_IGNORED = 2;

export type TreeTable = {
    paths: string[];
    hashes: string[];
    parents: Int32Array;
    kinds: Uint8Array;
    sizes: Float64Array;
    binary: Uint8Array;
};

export type TreePatch =
    | { op: "upsert"; path: string; hash: string; binary: boolean; size?: number }
    | { op: "remove"; path: string };

export type TreeEntry = {
    path: string;
    name: string;
    kind: number;
    depth: number;
    parent: string;
    hash: string;
    size: number;
    binary: boolean;
    children: string[];
};

export type TreePosition = { setSize: number; posInSet: number };

export type TreeLoad = {
    readonly done: boolean;
    step(count: number): void;
    commit(): void;
};
