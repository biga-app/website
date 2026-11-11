import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";

import { ViewerFrame } from "@/components/home/viewer-frame";
import { JoinForm } from "@/components/landing/join-form";
import { Section, SectionHeader } from "@/components/site/frame";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";

export function Demo({ siteUrl, sessionPath }: { siteUrl: string; sessionPath: string }) {
  const host = new URL(siteUrl).host;

  return (
    <Section id="demo">
      <SectionHeader
        eyebrow="05 / Try it"
        title={<Typography variant="h2">Open a real broadcast.</Typography>}
        lead={
          <Typography variant="lead" tone="muted">
            This is the actual viewer, playing back a finished session of this repository. The tree, the timeline and
            the diffs all work.
          </Typography>
        }
      />

      <div className="border-rail bg-muted/40 mt-10 overflow-hidden rounded-2xl border p-1.5 sm:mt-12">
        <div className="border-rail bg-background overflow-hidden rounded-xl border">
          <div className="border-rail flex items-center gap-3 border-b px-3 py-2.5">
            <span aria-hidden className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="bg-foreground/15 size-2.5 rounded-full" />
              ))}
            </span>
            <span translate="no" className="bg-muted text-muted-foreground min-w-0 flex-1 truncate rounded-full px-3 py-1 text-center font-mono text-xs sm:flex-none sm:px-6">
              {host}
              {sessionPath}
            </span>
            <Button render={<Link href={sessionPath} />} variant="secondary" size="xs" className="font-body ml-auto shrink-0 gap-1 rounded-full">
                <span className="hidden sm:inline">Open full screen</span>
                <span className="sm:hidden">Open</span>
                <ArrowUpRightIcon strokeWidth={1.75} />
              </Button>
          </div>
          <ViewerFrame src={`${sessionPath}?embed=1`} title="biga viewer, playing back a recorded broadcast of this repository" />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-end">
        <div className="flex flex-col gap-2">
          <Typography variant="h3">Already have a link?</Typography>
          <Typography variant="small" tone="muted">
            Paste it here, or just open it. Viewers never need an account.
          </Typography>
        </div>
        <JoinForm
          tone="default"
          buttonClassName="bg-foreground text-background hover:bg-foreground/90 [&>span]:bg-background/15"
        />
      </div>
    </Section>
  );
}
