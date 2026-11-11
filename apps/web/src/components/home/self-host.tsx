import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

import { HomeSection } from "@/components/home/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Typography } from "@/components/ui/typography";

const STACK = ["Go server", "Postgres", "Redis, optional", "S3-compatible storage, optional", "MIT licensed"];

export function SelfHost() {
  return (
    <HomeSection>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col items-start gap-5">
          <Typography variant="h2">Run it yourself.</Typography>
          <Typography variant="lead" tone="muted" className="max-w-[44ch]">
            The whole stack is one Compose file. Keep sessions on your own network, behind your own proxy.
          </Typography>
          <ul className="flex flex-wrap gap-2">
            {STACK.map((item) => (
              <li key={item}>
                <Badge variant="outline">{item}</Badge>
              </li>
            ))}
          </ul>
          <Button render={<Link href="/docs/self-hosting" />} variant="outline" size="lg">
            <BookOpenIcon />
            Self-hosting guide
          </Button>
        </div>
        <Card className="bg-terminal text-terminal-foreground">
          <CardHeader>
            <CardTitle className="font-mono text-sm font-normal">docker</CardTitle>
            <CardDescription className="text-terminal-foreground/70">Clone, start, point the CLI at it.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre translate="no" className="overflow-x-auto font-mono text-[13px] leading-relaxed">
              <code>
                {"git clone https://github.com/biga-app/docker.git biga && cd biga\ndocker compose up -d --build\nBIGA_API_URL=http://localhost:8080 biga start"}
              </code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </HomeSection>
  );
}
