"use client";

import { PauseButton } from "@/components/home/pause-button";

import { useDemo } from "./demo-provider";

export function SavesToggle() {
  const { backend, paused, togglePaused } = useDemo();
  return (
    <div className="fixed end-4 bottom-10 z-40">
      <PauseButton paused={paused} onToggle={togglePaused} disabled={!backend} playLabel="Resume saves" pauseLabel="Pause saves" size="xs" className="bg-background shadow-md" />
    </div>
  );
}
