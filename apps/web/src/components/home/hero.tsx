import { ArrowDownIcon } from "lucide-react";
import Link from "next/link";

import { Annotation } from "@/components/home/annotation";
import { HeroCircuit, HeroMotion, OnAirPill } from "@/components/home/hero-live";
import { InstallCommand } from "@/components/home/install-command";
import { Section } from "@/components/site/frame";
import { Button } from "@/components/ui/button";
import { Mark, Typography } from "@/components/ui/typography";

export function Hero({ siteUrl }: { siteUrl: string }) {
  const host = new URL(siteUrl).host;

  return (
    <HeroMotion>
      <Section id="top" className="biga-glow relative isolate" columnClassName="pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-12">
          <div className="biga-rise flex min-w-0 flex-col items-start">
            <OnAirPill />

            <Typography variant="display" className="mt-6 max-w-[13ch]">
              Stream your <Mark>saves</Mark>, not your screen.
            </Typography>

            <Typography variant="lead" tone="muted" className="mt-5 max-w-[42ch]">
              One command turns a folder into a live, read-only link. Viewers follow every save in their browser, no
              account needed.
            </Typography>

            <div className="mt-8 flex w-full max-w-xl flex-col gap-3">
              <Annotation className="ml-1">Psst, start here</Annotation>
              <InstallCommand />
            </div>

            <Button render={<Link href="#how" />} variant="outline" size="lg" className="mt-6 rounded-full">
                <ArrowDownIcon strokeWidth={1.75} />
                Watch it run
              </Button>
          </div>

          <div className="biga-rise min-w-0 [animation-delay:120ms]">
            <HeroCircuit host={host} />
          </div>
        </div>
      </Section>
    </HeroMotion>
  );
}
