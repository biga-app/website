import type { ConnectionStoreState } from "@biga/types";
import { createStore } from "zustand/vanilla";

export function createConnectionStore() {
    return createStore<ConnectionStoreState>()((set) => ({
        status: "connecting",
        unavailable: null,
        setStatus: (status) => set({ status }),
        setUnavailable: (kind) => set({ unavailable: kind, status: "unavailable" }),
        reset: () => set({ status: "connecting", unavailable: null }),
    }));
}
