"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyFeedback } from "@/components/viewer/copy-button";
import { cn } from "@/lib/utils";

export const INSTALL = {
    unix: {
        label: "macOS / Linux",
        command: "curl -fsSL https://raw.githubusercontent.com/biga-app/cli/main/install.sh | sh",
    },
    windows: {
        label: "Windows",
        command: "irm https://raw.githubusercontent.com/biga-app/cli/main/install.ps1 | iex",
    },
    go: {
        label: "Go",
        command: "go install github.com/biga-app/cli/cmd/biga@latest",
    },
} as const;

export type Platform = keyof typeof INSTALL;

function CommandField({ command, label }: { command: string; label: string }) {
    const { copied, copy } = useCopyFeedback();
    return (
        <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
                <InputGroupText className="font-mono">$</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput readOnly value={command} aria-label={label} spellCheck={false} translate="no" className="font-mono text-[13px]" />
            <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-sm" aria-label={copied ? "Copied" : "Copy command"} onClick={() => void copy(command)}>
                    {copied ? <CheckIcon className="text-brand-text" /> : <CopyIcon />}
                </InputGroupButton>
            </InputGroupAddon>
        </InputGroup>
    );
}

export function CommandBlock({
    platforms = ["unix", "windows", "go"],
    className,
}: {
    platforms?: readonly Platform[];
    className?: string;
}) {
    const [active, setActive] = useState<Platform>(platforms[0] ?? "unix");

    useEffect(() => {
        if (platforms.includes("windows") && /Win/i.test(navigator.platform)) setActive("windows");
    }, [platforms]);

    return (
        <div className={cn("flex w-full min-w-0 flex-col gap-2.5", className)}>
            <Tabs value={active} onValueChange={(next) => setActive(next as Platform)} className="gap-0">
                <TabsList aria-label="Platform" className="h-8">
                    {platforms.map((platform) => (
                        <TabsTrigger key={platform} value={platform} className="px-2.5 text-xs">
                            {INSTALL[platform].label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <CommandField command={INSTALL[active].command} label={`Install command for ${INSTALL[active].label}`} />
        </div>
    );
}
