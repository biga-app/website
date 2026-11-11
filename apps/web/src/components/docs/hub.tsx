"use client";

import { ArrowUpRightIcon, SearchIcon } from "lucide-react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import Link from "next/link";

import { CommandBlock } from "@/components/site/command-block";
import { RELEASES_URL } from "@/components/site/links";
import { Button } from "@biga/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";
import { Kbd, useModKey } from "@biga/ui/components/kbd";

const TASKS = [
  { href: "/docs/quickstart", title: "Share a folder", body: "Install the CLI and go from nothing to a live link in two commands." },
  { href: "/docs/what-gets-shared", title: "Keep secrets out", body: "Exactly which files leave your machine, and how to check before you share." },
  { href: "/docs/viewer", title: "Watch a session", body: "The menubar, palette, search, split view and timeline that a link opens." },
  { href: "/docs/self-hosting", title: "Run your own server", body: "One Compose file, or the Go server on its own with Postgres." },
  { href: "/docs/extensions", title: "Build on the feed", body: "Connect your own service to a session and react to new checkpoints." },
];

const POPULAR = [
  { href: "/docs/cli", label: "CLI reference" },
  { href: "/docs/architecture", label: "Architecture" },
  { href: "/docs/api", label: "HTTP API" },
  { href: "/docs/encryption", label: "Encryption" },
];

function SearchButton() {
  const { setOpenSearch, enabled } = useSearchContext();
  const mod = useModKey();
  if (!enabled) return null;
  return (
    <Button variant="outline" size="lg" onClick={() => setOpenSearch(true)} className="text-muted-foreground w-full justify-start gap-2 font-normal sm:max-w-md">
      <SearchIcon />
      Search the docs
      <span className="ms-auto flex gap-0.5">
        <Kbd>{mod}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </Button>
  );
}

export function DocsHub() {
  return (
    <div className="not-prose flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <SearchButton />
        <CommandBlock className="sm:max-w-2xl" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {TASKS.map((task) => (
          <li key={task.href} className="contents">
            <Link href={task.href} className="focus-visible:ring-ring/50 rounded-xl outline-none focus-visible:ring-[3px]">
              <Card size="sm" className="hover:bg-muted/50 h-full transition-colors">
                <CardHeader>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription>{task.body}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Popular:</span>
        {POPULAR.map((page) => (
          <Button key={page.href} render={<Link href={page.href} />} variant="outline" size="sm">
            {page.label}
          </Button>
        ))}
        <Button render={<a href={RELEASES_URL} target="_blank" rel="noreferrer" />} variant="link" size="sm" className="ms-auto">
          Latest release
          <ArrowUpRightIcon />
        </Button>
      </div>
    </div>
  );
}
