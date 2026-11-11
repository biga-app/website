import { FollowFigure } from "@/components/art/follow-figure";
import { SegmentBars } from "@/components/art/segment-bar";
import { HomeSection, SectionTitle } from "@/components/home/section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Keys keys={keys} />
    </li>
  );
}

export function Reading() {
  return (
    <HomeSection id="features">
      <SectionTitle title="Built for reading code, not watching a video." />
      <div className="mt-10 grid gap-4 lg:mt-12 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Follow mode</CardTitle>
            <CardDescription>Opens each file as the broadcaster saves it. Click anywhere and it pauses, so you never lose your place.</CardDescription>
          </CardHeader>
          <CardContent>
            <FollowFigure className="max-w-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timeline and diffs</CardTitle>
            <CardDescription>Step back through every checkpoint and open the diff for any file.</CardDescription>
          </CardHeader>
          <CardContent>
            <SegmentBars />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Command palette</CardTitle>
            <CardDescription>Every action in one place, with a menubar and shortcuts for the rest.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              <ShortcutRow label="Go to file" keys={["⌘", "P"]} />
              <ShortcutRow label="Commands" keys={["⌘", "K"]} />
              <ShortcutRow label="Shortcuts" keys={["?"]} />
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Search in files</CardTitle>
            <CardDescription>Search every shared file in your browser, with case, word and regex options.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 font-mono text-xs" translate="no">
              <li className="text-muted-foreground">config.go</li>
              <li className="bg-muted rounded-sm px-2 py-1">62 return Config(), fmt.Errorf(…)</li>
              <li className="text-muted-foreground">batcher.go</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Split view</CardTitle>
            <CardDescription>Open a second file beside the first, each with its own tabs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2" aria-hidden>
              <div className="bg-muted/60 h-16 rounded-md border" />
              <div className="bg-muted/60 h-16 rounded-md border" />
            </div>
          </CardContent>
        </Card>
      </div>
    </HomeSection>
  );
}
