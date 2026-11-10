import { readFileSync } from "node:fs";

type RawVectors = { key: string; cases: { name: string; plaintext: string; id: string; sealed: string }[] };

const file = JSON.parse(readFileSync(new URL("./e2ee-vectors.json", import.meta.url), "utf8")) as RawVectors;

function fromHex(hex: string): Uint8Array {
    return Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16));
}

export const vectorKeyText = file.key;

export function vector(name: string) {
    const found = file.cases.find((item) => item.name === name);
    if (!found) throw new Error(`no vector named ${name}`);
    return { id: found.id, plain: fromHex(found.plaintext), sealed: fromHex(found.sealed) };
}

export const vectorNames = file.cases.map((item) => item.name);
