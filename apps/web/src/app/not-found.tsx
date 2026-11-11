import Link from "next/link";

import { JoinForm } from "@/components/landing/join-form";
import { BigaMark } from "@/components/site/biga-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <BigaMark cell={5} className="text-foreground" />
        <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
          This page doesn&apos;t exist. If you followed a session link, the
          session may have ended and been deleted.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button render={<Link href="/" />} size="sm">Go to the homepage</Button>
          <Button render={<Link href="/docs" />} variant="outline" size="sm">Read the docs</Button>
        </div>

        <div className="mt-10 border-t pt-6">
          <h2 className="mb-3 text-sm font-medium">Open a session</h2>
          <JoinForm tone="default" />
        </div>
      </div>
    </main>
  );
}
