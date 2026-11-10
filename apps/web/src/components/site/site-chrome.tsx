import Link from "next/link";
import type { ReactNode } from "react";

import { GitHubGlyph } from "@/components/landing/primitives";
import { BigaLogo, BigaMark } from "@/components/site/biga-mark";
import { Frame, HatchBand, INSET } from "@/components/site/frame";
import { CLI_REPO_URL, ISSUES_URL, RELEASES_URL, SECTIONS, WEB_REPO_URL } from "@/components/site/links";
import { siteConfig } from "@/lib/site-config";
import { ThemeSwitch } from "@/components/site/theme-switch";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/** A header link: a shadcn link-variant button, quiet until it is hovered. */
function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button asChild variant="link" size="sm" className="text-muted-foreground hover:text-foreground font-body px-3">
      <Link href={href}>{children}</Link>
    </Button>
  );
}

/** A footer link, set as quiet running text. */
function FooterLink({ href, external, children }: { href: string; external: boolean; children: ReactNode }) {
  return (
    <Button
      asChild
      variant="link"
      className="text-muted-foreground hover:text-foreground font-body h-auto justify-start p-0 text-sm font-normal"
    >
      {external ? (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      ) : (
        <Link href={href}>{children}</Link>
      )}
    </Button>
  );
}

/**
 * Sticky header inside the rails, with a hatched band under it. Section
 * links are a desktop convenience; phones keep the logo, Docs, GitHub and
 * the theme switch, which all fit at 320px.
 */
export function SiteHeader() {
  return (
    <>
      <Button
        asChild
        variant="secondary"
        size="sm"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:shadow-md"
      >
        <a href="#content">Skip to content</a>
      </Button>
      <header className="biga-glass border-rail sticky top-0 z-40 border-b">
        <Frame columnClassName={cn(INSET, "flex h-14 items-center gap-2")}>
          <Link
            href="/"
            aria-label="biga home"
            className="focus-visible:ring-ring/50 -ml-1 rounded-md px-1 py-1 outline-none focus-visible:ring-[3px]"
          >
            <BigaLogo />
          </Link>

          <nav aria-label="Sections" className="ml-4 hidden items-center md:flex">
            {SECTIONS.map((section) => (
              <NavLink key={section.id} href={`/#${section.id}`}>
                {section.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <NavLink href="/docs">Docs</NavLink>
            <Button
              asChild
              variant="outline"
              size="icon"
              className="border-rail text-muted-foreground hover:text-foreground rounded-full shadow-none"
            >
              <a href={CLI_REPO_URL} target="_blank" rel="noreferrer">
                <GitHubGlyph className="size-4" />
                <span className="sr-only">biga on GitHub</span>
              </a>
            </Button>
            <ThemeSwitch />
          </div>
        </Frame>
      </header>
      <HatchBand className="h-4 sm:h-5" />
    </>
  );
}

const FOOTER_GROUPS = [
  {
    title: "Product",
    links: [
      ...SECTIONS.map((section) => ({ href: `/#${section.id}`, label: section.label, external: false })),
      { href: "/docs", label: "Docs", external: false },
      { href: "/brand", label: "Brand", external: false },
    ],
  },
  {
    title: "Source",
    links: [
      { href: CLI_REPO_URL, label: "CLI on GitHub", external: true },
      { href: WEB_REPO_URL, label: "Server on GitHub", external: true },
      { href: RELEASES_URL, label: "Releases", external: true },
      { href: ISSUES_URL, label: "Report an issue", external: true },
    ],
  },
];

/**
 * Footer: the link groups, then the wordmark set huge and cut by the bottom
 * edge of the page, filled with the same hatch as the bands.
 */
export function SiteFooter() {
  return (
    <footer className="overflow-hidden">
      <Frame joints columnClassName={cn(INSET, "grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:py-16")}>
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <BigaLogo />
          <Typography variant="small" tone="muted" className="max-w-[34ch]">
            Broadcast a folder, share the link, watch it live. No accounts on either end.
          </Typography>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
            <Typography variant="label" tone="muted">
              {group.title}
            </Typography>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} external={link.external}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Frame>

      <Frame columnClassName="border-rail relative border-t">
        <div aria-hidden className="flex items-end gap-[3vw] overflow-hidden px-4 pt-8 sm:px-8 lg:px-12">
          <BigaMark cell={10} className="text-foreground/90 mb-[1.2vw] hidden h-auto w-[7vw] max-w-20 sm:block" />
          <span
            translate="no"
            className="biga-wordmark font-display -mb-[0.14em] block text-[34vw] leading-[0.8] font-extrabold tracking-[-0.06em] select-none sm:text-[22vw] xl:text-[15rem]"
          >
            biga
          </span>
        </div>
        <div className="border-rail font-body text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-4 py-4 text-xs sm:px-8 lg:px-12">
          <span>MIT licensed. © 2026 {siteConfig.author}</span>
          <span>Made for people who teach, pair and build in public.</span>
        </div>
      </Frame>
    </footer>
  );
}
