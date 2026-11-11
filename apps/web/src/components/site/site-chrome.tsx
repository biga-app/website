import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { BigaLogo } from "@/components/site/biga-mark";
import { CLI_REPO_URL, ISSUES_URL, RELEASES_URL, SECTIONS, WEB_REPO_URL } from "@/components/site/links";
import { ThemeSwitch } from "@/components/site/theme-switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/lib/site-config";

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className="size-4">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <>
      <Button
        render={<a href="#content" />}
        variant="secondary"
        size="sm"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50"
      >
        Skip to content
      </Button>
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="biga home"
            className="focus-visible:ring-ring/50 -ms-1 rounded-md px-1 py-1 outline-none focus-visible:ring-[3px]"
          >
            <BigaLogo />
          </Link>

          <nav aria-label="Sections" className="ms-3 hidden items-center md:flex">
            {SECTIONS.map((section) => (
              <Button key={section.id} render={<Link href={`/#${section.id}`} />} variant="link" size="sm" className="text-muted-foreground hover:text-foreground">
                {section.label}
              </Button>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1.5">
            <Button render={<Link href="/docs" />} variant="outline" size="sm">
              <BookOpenIcon />
              Docs
            </Button>
            <Button render={<a href={CLI_REPO_URL} target="_blank" rel="noreferrer" />} variant="outline" size="icon-sm" aria-label="biga on GitHub">
              <GitHubMark />
            </Button>
            <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />
            <ThemeSwitch />
          </div>
        </div>
      </header>
    </>
  );
}

const FOOTER_LINKS = [
  ...SECTIONS.map((section) => ({ href: `/#${section.id}`, label: section.label, external: false })),
  { href: "/docs", label: "Docs", external: false },
  { href: "/brand", label: "Brand", external: false },
  { href: CLI_REPO_URL, label: "CLI", external: true },
  { href: WEB_REPO_URL, label: "Website", external: true },
  { href: RELEASES_URL, label: "Releases", external: true },
  { href: ISSUES_URL, label: "Issues", external: true },
];

export function SiteFooter() {
  return (
    <footer className="bg-sidebar border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <BigaLogo />
          <p className="text-muted-foreground max-w-[36ch] text-sm">Broadcast a folder, share the link, watch it live. No accounts on either end.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-1 gap-y-1 md:max-w-md md:justify-end">
          {FOOTER_LINKS.map((link) => (
            <Button
              key={link.label}
              render={link.external ? <a href={link.href} target="_blank" rel="noreferrer" /> : <Link href={link.href} />}
              variant="link"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Button>
          ))}
        </nav>
      </div>
      <Separator />
      <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 font-mono text-xs sm:px-6">
        <span>MIT licensed, {siteConfig.author}</span>
        <span>Made for people who teach, pair and build in public.</span>
      </div>
    </footer>
  );
}
