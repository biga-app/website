import type { TabGroups, WorkspaceStoreState } from "@biga/types/stores";
import type { GroupIndex } from "@biga/types/viewer-location";
import { createStore } from "zustand/vanilla";

const CLOSED_LIMIT = 25;
const EMPTY: TabGroups = [[], []];

function neighbour(tabs: readonly string[], index: number): string | null {
    return tabs[index] ?? tabs[index - 1] ?? null;
}

function withGroup(groups: TabGroups, group: GroupIndex, tabs: readonly string[]): TabGroups {
    return group === 0 ? [tabs, groups[1]] : [groups[0], tabs];
}

function remember(closed: readonly string[], paths: readonly string[]): readonly string[] {
    const kept = closed.filter((path) => !paths.includes(path));
    return [...kept, ...paths].slice(-CLOSED_LIMIT);
}

function merged(saved: readonly string[], current: readonly string[]): readonly string[] {
    return [...saved, ...current.filter((path) => !saved.includes(path))];
}

export function createWorkspaceStore() {
    return createStore<WorkspaceStoreState>()((set, get) => {
        function update(group: GroupIndex, tabs: readonly string[], dropped: readonly string[]) {
            set((state) => ({
                groups: withGroup(state.groups, group, tabs),
                closed: remember(state.closed, dropped),
            }));
        }

        return {
            groups: EMPTY,
            focused: 0,
            closed: [],
            sidebarView: "explorer",
            pausedFollow: null,
            openTab: (path, group = 0) =>
                set((state) =>
                    state.groups[group].includes(path)
                        ? state
                        : { groups: withGroup(state.groups, group, [...state.groups[group], path]) }
                ),
            closeTab: (path, group = 0) => {
                const tabs = get().groups[group];
                const index = tabs.indexOf(path);
                if (index === -1) return null;
                const remaining = tabs.filter((tab) => tab !== path);
                update(group, remaining, [path]);
                return neighbour(remaining, index);
            },
            closeOthers: (path, group = 0) => {
                const tabs = get().groups[group];
                if (!tabs.includes(path)) return;
                update(
                    group,
                    tabs.filter((tab) => tab === path),
                    tabs.filter((tab) => tab !== path)
                );
            },
            closeToRight: (path, group = 0) => {
                const tabs = get().groups[group];
                const index = tabs.indexOf(path);
                if (index === -1) return;
                update(group, tabs.slice(0, index + 1), tabs.slice(index + 1));
            },
            closeAll: (group) =>
                set((state) => {
                    const targets: GroupIndex[] = group === undefined ? [0, 1] : [group];
                    let groups = state.groups;
                    let closed = state.closed;
                    for (const target of targets) {
                        closed = remember(closed, groups[target]);
                        groups = withGroup(groups, target, []);
                    }
                    return { groups, closed };
                }),
            moveTab: (path, index, group = 0) =>
                set((state) => {
                    const tabs = state.groups[group];
                    const from = tabs.indexOf(path);
                    if (from === -1) return state;
                    const next = tabs.filter((tab) => tab !== path);
                    next.splice(Math.max(0, Math.min(index, next.length)), 0, path);
                    return { groups: withGroup(state.groups, group, next) };
                }),
            reopenClosed: () => {
                const { closed, groups } = get();
                for (let index = closed.length - 1; index >= 0; index--) {
                    const path = closed[index] as string;
                    if (groups[0].includes(path)) continue;
                    set({ closed: closed.filter((_, position) => position !== index) });
                    return path;
                }
                return null;
            },
            focusGroup: (group) => set((state) => (state.focused === group ? state : { focused: group })),
            restore: (saved) =>
                set((state) => ({ groups: [merged(saved[0], state.groups[0]), merged(saved[1], state.groups[1])] })),
            setSidebarView: (view) => set({ sidebarView: view }),
            pauseFollow: (target) =>
                set((state) => ({ pausedFollow: { target, count: (state.pausedFollow?.count ?? 0) + 1 } })),
            resumeFollow: () => set({ pausedFollow: null }),
            reset: () => set({ groups: EMPTY, focused: 0, closed: [], sidebarView: "explorer", pausedFollow: null }),
        };
    });
}
