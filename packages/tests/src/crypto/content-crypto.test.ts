import assert from "node:assert/strict";
import test from "node:test";

import { createContentOpener, parseShareKey } from "@biga/viewer-core/crypto/content-crypto";

import { vector, vectorKeyText, vectorNames } from "../fixtures/e2ee-vectors.ts";

const key = parseShareKey(`#k=${vectorKeyText}`)?.bytes as Uint8Array;
const open = createContentOpener(key);

test("every vector the CLI sealed opens to its plaintext", async () => {
    assert.ok(vectorNames.length >= 6);
    for (const name of vectorNames) {
        const { id, plain, sealed } = vector(name);
        assert.deepEqual([...(await open(id, sealed))], [...plain], name);
    }
});

test("deflated and plain content are both covered by the vectors", () => {
    assert.equal(vector("compressible").sealed[1], 1, "a repetitive file is sent deflated");
    assert.equal(vector("incompressible").sealed[1], 0, "random bytes are sent as they are");
});

test("text that is not UTF-8 comes back byte for byte", async () => {
    const { id, sealed } = vector("not utf-8");
    assert.deepEqual([...(await open(id, sealed))], [0x61, 0xff, 0xfe, 0x62, 0x00, 0x63]);
});

test("another key cannot open the content", async () => {
    const wrong = Uint8Array.from(key);
    wrong[0] = (wrong[0] as number) ^ 1;
    const { id, sealed } = vector("short");
    await assert.rejects(createContentOpener(wrong)(id, sealed));
});

test("content cannot be passed off under another id", async () => {
    await assert.rejects(open(vector("unicode").id, vector("short").sealed));
});

test("anything that was changed is refused", async () => {
    const { id, sealed } = vector("unicode");
    const flipped = Uint8Array.from(sealed);
    flipped[flipped.length - 1] = (flipped[flipped.length - 1] as number) ^ 1;
    const version = Uint8Array.from(sealed);
    version[0] = 2;
    const flags = Uint8Array.from(sealed);
    flags[1] = (flags[1] as number) | 0x80;
    const claimsDeflate = Uint8Array.from(sealed);
    claimsDeflate[1] = 1;
    for (const [name, bad] of Object.entries({ flipped, version, flags, claimsDeflate, truncated: sealed.slice(0, 10), empty: new Uint8Array(0) })) {
        await assert.rejects(open(id, bad), () => true, name);
    }
});

test("the same opener can open many blobs", async () => {
    const results = await Promise.all(vectorNames.map((name) => open(vector(name).id, vector(name).sealed)));
    assert.equal(results.length, vectorNames.length);
});

test("a share key is read from the link's fragment", () => {
    const parsed = parseShareKey(`#k=${vectorKeyText}`);
    assert.equal(parsed?.text, vectorKeyText);
    assert.equal(parsed?.bytes.length, 32);
    assert.equal(parseShareKey(`k=${vectorKeyText}`)?.text, vectorKeyText, "the # is optional");
});

test("anything else is not a key", () => {
    for (const bad of ["", "#", "#k=", "#k=short", `#k=${vectorKeyText}A`, `#k=${vectorKeyText.slice(1)}`, `#key=${vectorKeyText}`, `#k=${"!".repeat(43)}`, `#k=${vectorKeyText}&x=1`]) {
        assert.equal(parseShareKey(bad), null, JSON.stringify(bad));
    }
});
