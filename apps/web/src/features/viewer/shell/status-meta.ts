import type { StreamStatus } from "@biga/types/stream";

export const STATUS_LABELS: Record<StreamStatus, string> = {
    connecting: "Connecting",
    live: "Live",
    reconnecting: "Reconnecting",
    offline: "Offline",
    ended: "Ended",
    unavailable: "Unavailable",
};

export const STATUS_DOT: Record<StreamStatus, string> = {
    connecting: "bg-warning",
    live: "bg-biga",
    reconnecting: "bg-warning",
    offline: "bg-destructive",
    ended: "bg-muted-foreground",
    unavailable: "bg-destructive",
};
