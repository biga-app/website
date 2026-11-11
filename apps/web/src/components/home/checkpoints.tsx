import { HashDedupFigure } from "@biga/art/hash-dedup-figure";
import { SaveToCheckpointFigure } from "@biga/art/save-to-checkpoint-figure";
import { HomeSection, SectionTitle } from "@/components/home/section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@biga/ui/components/card";
import { CHECKPOINT_IDLE_MS, CHECKPOINT_MAX_WAIT_MS } from "@biga/viewer/lib/checkpoint-timing";

export function Checkpoints() {
  return (
    <HomeSection id="checkpoints">
      <SectionTitle
        title="Every save becomes a checkpoint."
        lead="A burst of saves goes out as one checkpoint, and a save that changes nothing sends nothing."
      />
      <div className="mt-10 grid gap-4 lg:mt-12 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Batched, not chatty</CardTitle>
            <CardDescription>
              biga waits for {CHECKPOINT_IDLE_MS} ms of quiet, and never holds a checkpoint longer than {CHECKPOINT_MAX_WAIT_MS / 1000} s.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SaveToCheckpointFigure />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hashed per file</CardTitle>
            <CardDescription>Bytes that match the last upload never leave your machine. Every checkpoint stays in the session.</CardDescription>
          </CardHeader>
          <CardContent>
            <HashDedupFigure />
          </CardContent>
        </Card>
      </div>
    </HomeSection>
  );
}
