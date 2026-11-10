"use client";

import type { ChangeType } from "@biga/types";
import { useMemo } from "react";

import { useRuntime, useStoreValue } from "../runtime/runtime-provider";

export function useDecorations(): Map<string, ChangeType> {
    const { history } = useRuntime().stores;
    const selected = useStoreValue(history, (state) => (state.selectedSeq === null ? undefined : state.loaded.get(state.selectedSeq)));
    return useMemo(() => new Map((selected?.changes ?? []).map((change) => [change.path, change.changeType])), [selected]);
}
