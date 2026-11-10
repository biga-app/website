const MAX_FRAME_BYTES = 64 * 1024 * 1024;
const MAX_LENGTH_BYTES = 5;

function readLength(buffer: Uint8Array): { value: number; size: number } | null {
    let value = 0;
    for (let index = 0; index < MAX_LENGTH_BYTES; index++) {
        if (index >= buffer.length) return null;
        const byte = buffer[index] as number;
        value += (byte & 0x7f) * 2 ** (7 * index);
        if ((byte & 0x80) === 0) return { value, size: index + 1 };
    }
    throw new Error("The stream sent a malformed frame length.");
}

function join(first: Uint8Array, second: Uint8Array): Uint8Array {
    const joined = new Uint8Array(first.length + second.length);
    joined.set(first);
    joined.set(second, first.length);
    return joined;
}

export function createFrameParser() {
    let pending: Uint8Array = new Uint8Array(0);

    return {
        push(chunk: Uint8Array): Uint8Array[] {
            pending = pending.length === 0 ? chunk : join(pending, chunk);
            const frames: Uint8Array[] = [];
            for (;;) {
                const length = readLength(pending);
                if (length === null) break;
                if (length.value > MAX_FRAME_BYTES) throw new Error("The stream sent a frame that is too large.");
                const end = length.size + length.value;
                if (pending.length < end) break;
                frames.push(pending.slice(length.size, end));
                pending = pending.subarray(end);
            }
            return frames;
        },
    };
}
