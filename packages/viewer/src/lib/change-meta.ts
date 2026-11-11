import type { ChangeType } from "@biga/types/checkpoint";

/**
 * Visual treatment for each change kind (source-control decorations). Colour
 * is never the only cue: every kind also carries a letter and a label.
 */
export const CHANGE_META: Record<
    ChangeType,
    { letter: string; label: string; className: string; dot: string }
> = {
    added: {
        letter: "A",
        label: "Added",
        className: "text-success",
        dot: "bg-success",
    },
    modified: {
        letter: "M",
        label: "Modified",
        className: "text-warning",
        dot: "bg-warning",
    },
    deleted: {
        letter: "D",
        label: "Deleted",
        className: "text-destructive",
        dot: "bg-destructive",
    },
    renamed: {
        letter: "R",
        label: "Renamed",
        className: "text-info",
        dot: "bg-info",
    },
};

export function dirName(path: string): string {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/");
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const shortDateWithYear = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
});
const fullDateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
});

/**
 * Compact time for dense lists: "just now", "4m ago", "3h ago", "5d ago", then
 * a date once a relative figure stops being useful ("Jul 7").
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
    const time = new Date(iso).getTime();
    const elapsed = Math.max(0, now - time);
    if (elapsed < 45_000) {
        return "just now";
    }
    if (elapsed < HOUR) {
        return `${Math.max(1, Math.round(elapsed / MINUTE))}m ago`;
    }
    if (elapsed < DAY) {
        return `${Math.round(elapsed / HOUR)}h ago`;
    }
    if (elapsed < 7 * DAY) {
        return `${Math.round(elapsed / DAY)}d ago`;
    }
    const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear();
    return (sameYear ? shortDate : shortDateWithYear).format(time);
}

/** Full, unambiguous timestamp for tooltips and `title` attributes. */
export function formatDateTime(iso: string): string {
    return fullDateTime.format(new Date(iso));
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
