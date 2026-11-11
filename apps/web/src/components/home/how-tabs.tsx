"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Typography } from "@/components/ui/typography";
import { useCopyFeedback } from "@/components/viewer/copy-button";
import { CheckIcon, CopyIcon } from "lucide-react";

const STEPS = [
  {
    value: "run",
    label: "Run it",
    title: "One command in your project.",
    body: "biga watches the folder, skips what you ignore, and prints a link. There is nothing to configure.",
  },
  {
    value: "share",
    label: "Share it",
    title: "Send the link, nothing else.",
    body: "Anyone who opens it sees your files in a browser tab. No account, no install, read-only.",
  },
  {
    value: "code",
    label: "Keep coding",
    title: "Viewers follow every save.",
    body: "Each save becomes a checkpoint. Follow mode opens the file you just saved, and the timeline keeps the history.",
  },
] as const;

function Terminal({ children }: { children: ReactNode }) {
  return (
    <Card className="bg-terminal text-terminal-foreground gap-1 p-4 font-mono text-[13px]" translate="no">
      {children}
    </Card>
  );
}

function LinkField({ link }: { link: string }) {
  const { copied, copy } = useCopyFeedback();
  return (
    <InputGroup className="h-11">
      <InputGroupInput readOnly value={link} aria-label="Share link" className="font-mono text-[13px]" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-sm" aria-label={copied ? "Copied" : "Copy link"} onClick={() => void copy(link)}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function HowTabs({ host, follow }: { host: string; follow: ReactNode }) {
  const link = `https://${host}/session/k3f9zq2a`;
  return (
    <Tabs defaultValue="run" className="gap-6">
      <TabsList aria-label="Steps" className="h-10 w-full max-w-md">
        {STEPS.map((step) => (
          <TabsTrigger key={step.value} value={step.value} className="flex-1 text-sm">
            {step.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {STEPS.map((step) => (
        <TabsContent key={step.value} value={step.value}>
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div className="flex flex-col gap-3">
              <Typography variant="h3">{step.title}</Typography>
              <Typography variant="body" tone="muted" className="max-w-[46ch]">
                {step.body}
              </Typography>
            </div>
            <div className="min-w-0">
              {step.value === "run" ? (
                <Terminal>
                  <span>
                    <span className="text-terminal-accent">$</span> biga start
                  </span>
                  <span className="text-terminal-foreground/70">Broadcasting ./my-project</span>
                  <span className="text-terminal-foreground/70">Skipped .env, node_modules (ignored)</span>
                  <span>{link}</span>
                </Terminal>
              ) : null}
              {step.value === "share" ? (
                <div className="flex flex-col gap-3">
                  <LinkField link={link} />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">No account</Badge>
                    <Badge variant="outline">Read-only</Badge>
                    <Badge variant="outline">Works in any browser</Badge>
                  </div>
                </div>
              ) : null}
              {step.value === "code" ? follow : null}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
