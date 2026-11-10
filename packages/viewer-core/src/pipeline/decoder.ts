import { StreamEventSchema } from "@biga/types/events";
import type { DecodeResult, DecoderOptions } from "@biga/types/pipeline";

export function decodeFrame(name: string, data: string): DecodeResult {
    let json: unknown;
    try {
        json = JSON.parse(data);
    } catch {
        return { ok: false };
    }
    const parsed = StreamEventSchema.safeParse(json);
    if (!parsed.success || parsed.data.type !== name) return { ok: false };
    return { ok: true, event: parsed.data };
}

const DEFAULT_MAX_INVALID = 3;

export function createDecoder(options: DecoderOptions) {
    const limit = options.maxConsecutiveInvalid ?? DEFAULT_MAX_INVALID;
    let invalidInARow = 0;

    return {
        push(name: string, data: string): void {
            const result = decodeFrame(name, data);
            if (result.ok) {
                invalidInARow = 0;
                options.onEvent(result.event);
                return;
            }
            invalidInARow++;
            if (invalidInARow < limit) return;
            invalidInARow = 0;
            options.onResync();
        },
    };
}
