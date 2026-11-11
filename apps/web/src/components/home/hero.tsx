import { ArrowDownIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { BroadcastFigure } from "@/components/art/broadcast-figure";
import { HeroViewer } from "@/components/home/hero-viewer";
import { CommandBlock } from "@/components/site/command-block";
import { SelectionMark } from "@/components/site/selection-mark";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export function Hero({ siteUrl, sessionPath }: { siteUrl: string; sessionPath: string }) {
  const host = new URL(siteUrl).host;

  return (
    <>
      <section id="top" className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:pt-20 lg:pb-14">
          <div className="flex min-w-0 flex-col items-start gap-6">
            <Typography variant="display" className="max-w-[14ch]">
              Stream your <span className="whitespace-nowrap"><SelectionMark>saves</SelectionMark>,</span> not your screen.
            </Typography>
            <Typography variant="lead" tone="muted" className="max-w-[44ch]">
              One command turns a folder into a live, read-only link. Viewers follow every save in their browser.
            </Typography>
            <CommandBlock />
            <div className="flex flex-wrap items-center gap-2">
              <Button render={<Link href="#demo" />} size="lg">
                <ArrowDownIcon />
                See it run
              </Button>
              <Button render={<Link href="/docs" />} variant="outline" size="lg">
                <BookOpenIcon />
                Read the docs
              </Button>
            </div>
          </div>
          <div className="min-w-0">
            <BroadcastFigure />
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16">
          <HeroViewer host={host} sessionPath={sessionPath} />
        </div>
      </section>
    </>
  );
}
