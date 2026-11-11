import { ArrowDownIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { CommandBlock } from "@/components/site/command-block";
import { SelectionMark } from "@/components/site/selection-mark";
import { Button } from "@biga/ui/components/button";
import { Typography } from "@biga/ui/components/typography";

export function Hero() {
  return (
    <section id="top">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 pt-14 pb-6 text-center sm:px-6 lg:pt-20">
        <Typography variant="display" className="max-w-[16ch]">
          Stream your{" "}
          <span className="whitespace-nowrap">
            <SelectionMark>saves</SelectionMark>,
          </span>{" "}
          not your screen.
        </Typography>
        <Typography variant="lead" tone="muted" className="max-w-[50ch]">
          One command turns a folder into a live, read-only link. Everything below is the real viewer, following a project that was generated for this visit.
        </Typography>
        <CommandBlock className="max-w-xl text-start" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button render={<Link href="#demo" />} size="lg">
            <ArrowDownIcon />
            Watch it run
          </Button>
          <Button render={<Link href="/docs" />} variant="outline" size="lg">
            <BookOpenIcon />
            Read the docs
          </Button>
        </div>
      </div>
    </section>
  );
}
