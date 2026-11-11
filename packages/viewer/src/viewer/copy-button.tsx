"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { CopyGlyph } from "@biga/ui/components/copy-glyph";
import { copyText } from "@biga/viewer/lib/file-actions";

import { IconAction } from "./icon-action";

/**
 * Copies on click and confirms in place: the icon turns into a check for a
 * moment. The confirmation sits where the reader is already looking, so no
 * toast is needed for success; only a blocked clipboard raises one.
 */
export function useCopyFeedback(resetMs = 1600) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }
        const timer = setTimeout(() => setCopied(false), resetMs);
        return () => clearTimeout(timer);
    }, [copied, resetMs]);

    const copy = useCallback(async (text: string) => {
        const ok = await copyText(text);
        if (ok) {
            setCopied(true);
        } else {
            toast.error("Unable to copy", {
                description: "The browser blocked clipboard access.",
            });
        }
        return ok;
    }, []);

    return { copied, copy };
}

export function CopyButton({
    text,
    label,
    disabled,
    className,
    ...props
}: {
    text: string;
    /** What gets copied, e.g. "Copy file contents". */
    label: string;
} & Omit<ComponentProps<typeof IconAction>, "label" | "children" | "onClick">) {
    const { copied, copy } = useCopyFeedback();

    return (
        <>
            <IconAction
                label={copied ? "Copied" : label}
                disabled={disabled}
                onClick={() => void copy(text)}
                className={className}
                {...props}
            >
                <CopyGlyph copied={copied} />
            </IconAction>
            <span aria-live="polite" className="sr-only">
                {copied ? "Copied to clipboard" : ""}
            </span>
        </>
    );
}
