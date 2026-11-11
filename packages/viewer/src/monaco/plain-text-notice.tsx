import { Button } from "@biga/ui/components/button";

export function PlainTextNotice({ onEnable }: { onEnable: () => void }) {
  return (
    <div role="status" className="flex shrink-0 items-center gap-3 border-b bg-muted px-3 py-1.5 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1">This file is large, so syntax highlighting is off to keep the viewer responsive.</span>
      <Button variant="outline" size="xs" onClick={onEnable}>
        Enable highlighting
      </Button>
    </div>
  );
}
