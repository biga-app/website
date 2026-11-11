import { HomeIcon } from "lucide-react";
import Link from "next/link";

import { JoinForm } from "@/components/landing/join-form";
import { BigaMark } from "@biga/ui/components/biga-mark";
import { Button } from "@biga/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <BigaMark cell={5} className="text-foreground mb-2" />
          <CardTitle role="heading" aria-level={1} className="text-xl">
            Page not found
          </CardTitle>
          <CardDescription>This page doesn&apos;t exist. If you followed a session link, the session may have ended and been deleted.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/" />}>
              <HomeIcon />
              Go to the homepage
            </Button>
            <Button render={<Link href="/docs" />} variant="outline">
              Read the docs
            </Button>
          </div>
          <JoinForm />
        </CardContent>
      </Card>
    </main>
  );
}
