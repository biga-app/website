import type { SessionStoreState } from "@biga/types/stores";
import { createStore } from "zustand/vanilla";

export function createSessionStore() {
    return createStore<SessionStoreState>()((set) => ({
        session: null,
        mode: "lazy",
        hydrate: (session, mode) => set({ session, mode }),
        reset: () => set({ session: null, mode: "lazy" }),
    }));
}
