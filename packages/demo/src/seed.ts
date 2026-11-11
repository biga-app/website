const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomSeed(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export function cleanSeed(value: string | null | undefined): string | null {
    const cleaned = value?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
    return cleaned && cleaned.length >= 3 ? cleaned : null;
}
