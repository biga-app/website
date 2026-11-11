import { IgnoreFilterFigure } from "@biga/art/ignore-filter-figure";
import { LinkAnatomyFigure } from "@biga/art/link-anatomy-figure";
import { HomeSection, SectionTitle } from "@/components/home/section";
import { Badge } from "@biga/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";

export function Privacy() {
  return (
    <HomeSection id="privacy">
      <SectionTitle
        title="Your .env stays on your machine."
        lead="biga only shares files that pass your ignore rules and a secret scan. You can check before anyone sees a thing."
      />
      <div className="mt-10 grid gap-4 lg:mt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardContent>
            <IgnoreFilterFigure />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="bg-terminal text-terminal-foreground">
            <CardHeader>
              <CardTitle className="font-mono text-sm" translate="no">
                $ biga start --dry-run
              </CardTitle>
              <CardDescription className="text-terminal-foreground/70">Prints what would be shared and what would be withheld. It never contacts the server.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Encrypted sessions
                <Badge variant="secondary">optional</Badge>
              </CardTitle>
              <CardDescription>Files are sealed before upload. The key lives in the link, after the hash sign.</CardDescription>
            </CardHeader>
            <CardContent>
              <LinkAnatomyFigure />
            </CardContent>
          </Card>
        </div>
      </div>
    </HomeSection>
  );
}
