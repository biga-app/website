import type { SessionResponse, SessionState } from "@biga/types";

import { makeSummary, TIME } from "./checkpoints.ts";
import { hash } from "./hash.ts";

export function makeSessionResponse(status: SessionResponse["status"] = "active"): SessionResponse {
    return { id: "s1", title: "t", description: null, status, createdAt: TIME, updatedAt: TIME, endedAt: null };
}

export type StateOptions = {
    seqs?: number[];
    status?: SessionResponse["status"];
    snapshot?: boolean;
    mode?: SessionState["mode"];
    contents?: Record<string, string>;
};

export function makeState(options: StateOptions = {}): SessionState {
    const state: SessionState = {
        session: makeSessionResponse(options.status),
        snapshot:
            options.snapshot === false
                ? null
                : {
                      sessionId: "s1",
                      tree: {
                          type: "directory",
                          name: "root",
                          path: ".",
                          children: [{ type: "file", name: "a.ts", path: "a.ts", size: 3, hash: hash("a") }],
                      },
                      timestamp: 1700000000000,
                      sequenceNum: 0,
                  },
        checkpoints: [...(options.seqs ?? [0])].reverse().map(makeSummary),
        mode: options.mode ?? "lazy",
    };
    if (options.contents) state.contents = options.contents;
    return state;
}
