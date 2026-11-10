import { StreamEventSchema } from "@biga/types/events";
import type { DecodeResult, DecoderOptions } from "@biga/types/pipeline";
import { decodeStreamEvent } from "@biga/types/wire";

export function decodeFrame(data: Uint8Array): DecodeResult {
    let event;
    try {
        event = decodeStreamEvent(data);
    } catch {
        return { ok: false };
    }
    if (event === null) return { ok: true, event: null };
    const parsed = StreamEventSchema.safeParse(event);
    if (!parsed.success) return { ok: false };
    return { ok: true, event: parsed.data };
}

const DEFAULT_MAX_INVALID = 3;

export function createDecoder(options: DecoderOptions) {
    const limit = options.maxConsecutiveInvalid ?? DEFAULT_MAX_INVALID;
    let invalidInARow = 0;

    return {
        push(data: Uint8Array): void {
            const result = decodeFrame(data);
            if (result.ok) {
                invalidInARow = 0;
                if (result.event) options.onEvent(result.event);
                return;
            }
            invalidInARow++;
            if (invalidInARow < limit) return;
            invalidInARow = 0;
            options.onResync();
        },
    };
}
