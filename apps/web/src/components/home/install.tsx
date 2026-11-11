import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { Annotation } from "@/components/home/annotation";
import { StartSteps } from "@/components/home/start-steps";
import { GitHubGlyph } from "@/components/landing/primitives";
import { Section } from "@/components/site/frame";
import { CLI_REPO_URL } from "@/components/site/links";
import { Button } from "@/components/ui/button";
import { Mark, Typography } from "@/components/ui/typography";

export function Install({ siteUrl }: { siteUrl: string }) {
  const { hostname } = new URL(siteUrl);
  // The CLI's default server is localhost:3000; anywhere else it needs telling.
  const apiUrl = hostname === "localhost" || hostname === "127.0.0.1" ? null : siteUrl;

  return (
    <Section id="install" stage>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <Typography variant="display" as="h2" className="max-w-[12ch]">
            Share your <Mark>next save</Mark>.
          </Typography>
          <Typography variant="lead" tone="muted" className="max-w-[40ch]">
            Run a workshop, pair across timezones, or let people watch you build. Two commands, then send the link.
          </Typography>

          <div className="mt-2 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button render={<a href={CLI_REPO_URL} target="_blank" rel="noreferrer" />} size="lg" className="rounded-full">
                  <GitHubGlyph className="size-4" />
                  Star on GitHub
                </Button>
              <Button render={<Link href="/docs" />} variant="outline" size="lg" className="rounded-full">
                  <BookOpenIcon strokeWidth={1.75} />
                  Read the docs
                </Button>
            </div>
            <Annotation direction="up" className="ml-2">
              MIT licensed. Issues and PRs welcome
            </Annotation>
          </div>
        </div>

        <div className="bg-terminal text-terminal-foreground rounded-2xl border border-white/10 p-5 shadow-[0_1px_1px_oklch(0_0_0_/_0.05),0_28px_70px_-40px_oklch(0_0_0_/_0.55)] sm:p-7">
          <StartSteps apiUrl={apiUrl} />
        </div>
      </div>
    </Section>
  );
}
