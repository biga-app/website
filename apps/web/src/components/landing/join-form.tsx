"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useRef, useState, useTransition } from "react";

import { Button } from "@biga/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@biga/ui/components/input-group";
import { Label } from "@biga/ui/components/label";
import { Spinner } from "@biga/ui/components/spinner";
import { cn } from "@biga/ui/lib/utils";

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function parseSessionInput(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    const fromUrl = /\/session\/([^/?#\s]+)/.exec(value)?.[1];
    const candidate = fromUrl ? decodeURIComponent(fromUrl) : value;
    return SESSION_ID_RE.test(candidate) ? candidate : null;
}

export function JoinForm({ className }: { className?: string }) {
    const router = useRouter();
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function onSubmit(event: FormEvent) {
        event.preventDefault();
        const sessionId = parseSessionInput(value);
        if (!sessionId) {
            setError(
                value.trim()
                    ? "Use a share link or a session ID made of letters and numbers, like k3f9zq2a."
                    : "Enter a session ID or paste a share link."
            );
            inputRef.current?.focus();
            return;
        }
        setError(null);
        startTransition(() => router.push(`/session/${encodeURIComponent(sessionId)}`));
    }

    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
        <form onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-2", className)}>
            <Label htmlFor={id}>Session ID or share link</Label>
            <InputGroup className="h-11">
                <InputGroupInput
                    ref={inputRef}
                    id={id}
                    name="session"
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value);
                        if (error) setError(null);
                    }}
                    placeholder="k3f9zq2a"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : hintId}
                    className="font-mono text-sm"
                />
                <InputGroupAddon align="inline-end">
                    <Button type="submit" size="sm" disabled={pending}>
                        {pending ? <Spinner /> : <ArrowRightIcon />}
                        {pending ? "Opening" : "Open session"}
                    </Button>
                </InputGroupAddon>
            </InputGroup>
            {error ? (
                <p id={errorId} className="text-destructive text-xs">
                    {error}
                </p>
            ) : (
                <p id={hintId} className="text-muted-foreground text-xs">
                    Viewers are read-only. Nothing is installed, and no account is created.
                </p>
            )}
        </form>
    );
}
