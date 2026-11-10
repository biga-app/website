const VERSION = 1;
const FLAG_DEFLATE = 1;
const KEY_BYTES = 32;
const NONCE_BYTES = 12;
const HEADER_BYTES = 2;
const TAG_BYTES = 16;

const encoder = new TextEncoder();

export type ContentOpener = (id: string, sealed: Uint8Array) => Promise<Uint8Array>;

export type ShareKey = { text: string; bytes: Uint8Array };

/**
 * Reads the key from a link's fragment, `#k=` and 43 base64url characters. The
 * fragment never reaches a server, which is what keeps the key from it.
 */
export function parseShareKey(fragment: string): ShareKey | null {
    const text = /^#?k=([A-Za-z0-9_-]{43})$/.exec(fragment)?.[1];
    if (!text) return null;
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return bytes.length === KEY_BYTES ? { text, bytes } : null;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Opens content sealed by the CLI. From the one key, HKDF-SHA256 derives an
 * encryption key and a nonce key; the id a blob is named by is authenticated
 * with it, so content cannot be passed off under another id. Keys are derived
 * on first use.
 */
export function createContentOpener(key: Uint8Array, subtle: SubtleCrypto = globalThis.crypto.subtle): ContentOpener {
    let keys: Promise<{ aes: CryptoKey; nonce: CryptoKey }> | null = null;

    async function derive() {
        const base = await subtle.importKey("raw", key as BufferSource, "HKDF", false, ["deriveBits"]);
        const bits = (label: string) =>
            subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: encoder.encode(`biga/e2ee/v1/${label}`) }, base, KEY_BYTES * 8);
        const [enc, nonce] = await Promise.all([bits("enc"), bits("nonce")]);
        return {
            aes: await subtle.importKey("raw", enc, "AES-GCM", false, ["decrypt"]),
            nonce: await subtle.importKey("raw", nonce, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
        };
    }

    return async (id, sealed) => {
        if (sealed.length < HEADER_BYTES + TAG_BYTES || sealed[0] !== VERSION || ((sealed[1] as number) & ~FLAG_DEFLATE) !== 0) {
            throw new Error("The content is not in a format this viewer understands.");
        }
        keys ??= derive();
        const { aes, nonce } = await keys;
        const idBytes = encoder.encode(id);
        const iv = new Uint8Array(await subtle.sign("HMAC", nonce, idBytes)).slice(0, NONCE_BYTES);
        const additionalData = new Uint8Array(HEADER_BYTES + idBytes.length);
        additionalData.set(sealed.subarray(0, HEADER_BYTES));
        additionalData.set(idBytes, HEADER_BYTES);
        const plain = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv, additionalData }, aes, sealed.subarray(HEADER_BYTES) as BufferSource));
        return (sealed[1] as number) & FLAG_DEFLATE ? inflate(plain) : plain;
    };
}
