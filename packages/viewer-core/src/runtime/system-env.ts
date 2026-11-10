import type { Clock } from "@biga/types";

export const systemClock: Clock = {
    now: () => Date.now(),
    setTimer: (run, delayMs) => {
        const id = setTimeout(run, delayMs);
        return () => clearTimeout(id);
    },
};

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        const id = setTimeout(done, ms);
        function done(): void {
            clearTimeout(id);
            signal?.removeEventListener("abort", done);
            resolve();
        }
        signal?.addEventListener("abort", done, { once: true });
    });
}
