import type { CompareBase } from "@biga/types/viewer-location";

const START_REF = "0";

export function baseToRef(base: CompareBase): string {
    return base.kind === "start" ? START_REF : String(base.seq);
}

export function refToBase(ref: string): CompareBase {
    return ref === START_REF ? { kind: "start" } : { kind: "checkpoint", seq: Number(ref) };
}

export function isSameBase(a: CompareBase | null, b: CompareBase | null): boolean {
    if (a === null || b === null) return a === b;
    return baseToRef(a) === baseToRef(b);
}
