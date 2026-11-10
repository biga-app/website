export const SIDEBAR_COOKIE = "biga-viewer-sidebar";
export const SIDEBAR_DEFAULT_PERCENT = 22;
export const SIDEBAR_MIN_PERCENT = 14;
export const SIDEBAR_MAX_PERCENT = 45;

export function clampSidebarSize(value: number): number {
    return Math.min(SIDEBAR_MAX_PERCENT, Math.max(SIDEBAR_MIN_PERCENT, value));
}

export function parseSidebarSize(raw: string | undefined): number {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? clampSidebarSize(parsed) : SIDEBAR_DEFAULT_PERCENT;
}
