import type { SessionResponse } from "@biga/types";

const ISO_TIMESTAMP_RE = /^(?:session\s+)?(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)$/i;

const titleDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/**
 * The title to show for a session. Older CLIs named sessions with a raw ISO
 * timestamp or left the session id as the title, neither of which means much to
 * a viewer, so those become a readable fallback.
 */
export function displayTitle(session: Pick<SessionResponse, "id" | "title" | "createdAt">): string {
    const title = session.title.trim();
    if (!title || title === session.id) {
        return "Untitled session";
    }
    const timestamp = ISO_TIMESTAMP_RE.exec(title)?.[1];
    if (timestamp) {
        const date = new Date(timestamp);
        if (!Number.isNaN(date.getTime())) {
            return `Session from ${titleDate.format(date)}`;
        }
    }
    return title;
}

/** Canonical share URL for a session, without viewer-only query params. */
export function shareUrlFor(sessionId: string, checkpointSeq?: number): string {
    const url = `${window.location.origin}/session/${encodeURIComponent(sessionId)}`;
    return checkpointSeq === undefined ? url : `${url}?checkpoint=${checkpointSeq}`;
}
