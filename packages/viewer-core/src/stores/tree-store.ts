import type { TreeStoreState } from "@biga/types/stores";
import type { TreeTable } from "@biga/types/tree-table";
import { createStore } from "zustand/vanilla";

import { createTreeModel } from "../pipeline/tree-model.ts";

const LOAD_SLICE_ENTRIES = 8_192;

const EMPTY_TABLE: TreeTable = {
    paths: [],
    hashes: [],
    parents: new Int32Array(0),
    kinds: new Uint8Array(0),
    sizes: new Float64Array(0),
    binary: new Uint8Array(0),
};

export function createTreeStore() {
    const model = createTreeModel();

    const view = () => ({ revision: model.revision, rows: model.rows().slice(), fileCount: model.fileCount });

    return createStore<TreeStoreState>()((set, get) => {
        const refresh = () => {
            if (model.revision !== get().revision) set(view());
        };
        return {
            ...view(),
            touched: new Set(),
            touchedRevision: 0,
            reader: model,
            load: (table) => {
                model.load(table);
                refresh();
            },
            prepareLoad: async (table, nextFrame) => {
                const load = model.startLoad(table);
                while (!load.done) {
                    load.step(LOAD_SLICE_ENTRIES);
                    if (!load.done) await nextFrame();
                }
                return () => {
                    load.commit();
                    refresh();
                };
            },
            apply: (patches) => {
                model.apply(patches);
                refresh();
            },
            setExpanded: (path, open) => {
                model.setExpanded(path, open);
                refresh();
            },
            expandAncestors: (path) => {
                model.expandAncestors(path);
                refresh();
            },
            collapseAll: () => {
                model.collapseAll();
                refresh();
            },
            markTouched: (paths) => set((state) => ({ touched: new Set(paths), touchedRevision: state.touchedRevision + 1 })),
            reset: () => {
                model.collapseAll();
                model.load(EMPTY_TABLE);
                set({ ...view(), touched: new Set(), touchedRevision: 0 });
            },
        };
    });
}
