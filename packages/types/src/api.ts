import { z } from "zod/v4";

export const ApiErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function ApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
    return z.discriminatedUnion("ok", [
        z.object({ ok: z.literal(true), data: dataSchema }),
        z.object({ ok: z.literal(false), error: ApiErrorSchema }),
    ]);
}
export type ApiResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: ApiError };

export function PaginatedResponseSchema<T extends z.ZodTypeAny>(
    itemSchema: T
) {
    return z.object({
        items: z.array(itemSchema),
        total: z.number().int().nonnegative(),
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        hasNext: z.boolean(),
    });
}
export type PaginatedResponse<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
};

export type ApiErrorKind = "not_found" | "rate_limited" | "network" | "server" | "invalid" | "missing_key" | "wrong_key";

export class ApiRequestError extends Error {
    readonly kind: ApiErrorKind;
    readonly status: number | null;
    readonly retryAfterMs: number | null;

    constructor(kind: ApiErrorKind, message: string, status: number | null = null, retryAfterMs: number | null = null) {
        super(message);
        this.name = "ApiRequestError";
        this.kind = kind;
        this.status = status;
        this.retryAfterMs = retryAfterMs;
    }
}
