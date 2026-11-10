import type { Clock } from "@biga/types/stream";

type Timer = { id: number; at: number; run: () => void };

export function createFakeClock() {
    let time = 0;
    let timerId = 0;
    let timers: Timer[] = [];

    const clock: Clock = {
        now: () => time,
        setTimer: (run, delayMs) => {
            const id = ++timerId;
            timers.push({ id, at: time + delayMs, run });
            return () => {
                timers = timers.filter((timer) => timer.id !== id);
            };
        },
    };

    function advance(ms: number): void {
        const target = time + ms;
        for (;;) {
            const due = timers.filter((timer) => timer.at <= target).sort((a, b) => a.at - b.at)[0];
            if (!due) break;
            timers = timers.filter((timer) => timer.id !== due.id);
            time = due.at;
            due.run();
        }
        time = target;
    }

    return { clock, advance, timerCount: () => timers.length };
}
