import { z } from "zod/v4";
import { CheckpointSummarySchema, FileHistoryEntrySchema } from "./checkpoint.js";
import { FileSnapshotSchema } from "./file.js";
import { SessionResponseSchema } from "./session.js";

export const LoadModeSchema = z.enum(["eager", "lazy"]);
export type LoadMode = z.infer<typeof LoadModeSchema>;

export const SessionStateSchema = z.object({
    session: SessionResponseSchema,
    snapshot: FileSnapshotSchema.nullable(),
    checkpoints: z.array(CheckpointSummarySchema),
    mode: LoadModeSchema,
    contents: z.record(z.string(), z.string()).optional(),
});
export type SessionState = z.infer<typeof SessionStateSchema>;

export const FileContentSchema = z.object({
    content: z.string(),
    binary: z.boolean(),
    hash: z.string().length(64),
});
export type FileContent = z.infer<typeof FileContentSchema>;

export const FileHistoryResponseSchema = z.object({ history: z.array(FileHistoryEntrySchema) });

export const CheckpointsResponseSchema = z.object({ checkpoints: z.array(CheckpointSummarySchema) });
