import type { PrefetcherOptions } from "@biga/types/content";

export function createPrefetcher(options: PrefetcherOptions) {
    const queue: string[] = [];
    let active = 0;
    let dwelling: { path: string; cancel: () => void } | null = null;

    function pump(): void {
        while (active < options.concurrency && queue.length > 0) {
            const path = queue.shift() as string;
            active++;
            options
                .run(path)
                .catch(() => undefined)
                .finally(() => {
                    active--;
                    pump();
                });
        }
    }

    function cancelDwell(): void {
        dwelling?.cancel();
        dwelling = null;
    }

    function enqueue(path: string): void {
        if (!queue.includes(path)) queue.push(path);
        pump();
    }

    return {
        hover(path: string): void {
            if (dwelling?.path === path) return;
            cancelDwell();
            dwelling = {
                path,
                cancel: options.clock.setTimer(() => {
                    dwelling = null;
                    enqueue(path);
                }, options.dwellMs),
            };
        },
        leave(path: string): void {
            if (dwelling?.path === path) cancelDwell();
        },
    };
}
