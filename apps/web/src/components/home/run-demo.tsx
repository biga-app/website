"use client";

import { ArrowLeftIcon, ArrowRightIcon, RotateCwIcon, SquareTerminalIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FileTypeIcon } from "@/components/file-icon";
import { Annotation } from "@/components/home/annotation";
import { PauseButton } from "@/components/home/pause-button";
import { Code } from "@/components/landing/primitives";
import { ShowcaseProvider, useShowcase } from "@/components/showcase/showcase-provider";
import { PanelCode, PanelHeader, PanelTimeline } from "@/components/showcase/viewer-panels";
import { BigaMark } from "@/components/site/biga-mark";
import { Autopilot, type AutopilotChapter, type AutopilotChaptersApi } from "@/components/ui/autopilot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Typography } from "@/components/ui/typography";
import { DEMO_FILE, DEMO_LINE } from "@/lib/showcase";
import summary from "@/lib/showcase/summary.json";
import { humanBytes } from "@/lib/showcase/summary";
import { cn } from "@/lib/utils";

/*
 * A working miniature of a biga session, driven by Autopilot. Everything a
 * cursor does goes through the same handlers a visitor's clicks and keys do,
 * so once the cursor steps aside the demo is fully usable:
 *
 *   terminal   type `biga start`; while it runs, c / o / q copy the link,
 *              open it and stop (the real CLI's keys)
 *   editor     change the number on line 80 and press Save (or ⌘S / Ctrl+S)
 *   browser    paste the link in the address bar and press Enter
 *
 * The picture is two machines and the wire between them: your laptop on top,
 * Priya's browser underneath, and biga as the line that carries each save
 * down. Both windows get the full column, so the real code and the real viewer
 * render at their own size instead of being shrunk to fit side by side.
 *
 * It is this project's own CLI. The editor shows `internal/config/config.go`
 * as it is on disk, the terminal prints what the Go CLI prints (see
 * `cli/internal/ui`), and the browser is the real viewer reading a snapshot of
 * that repository: a save adds a checkpoint to the real timeline.
 *
 * The model follows the CLI's documented behaviour: a save that changes
 * nothing sends nothing, and running `biga start` again rejoins the same
 * session and uploads only what changed while it was stopped.
 */

const SESSION = summary.session.id;
const TITLE = summary.session.title;
const NAME = `${TITLE} (${SESSION})`;
const FILES = summary.stats.files;
const UPLOADED = humanBytes(summary.stats.bytes);
const FILE_NAME = DEMO_FILE.split("/").pop() ?? DEMO_FILE;
const BASE = "120";
/** One changed file, gzipped, as the live panel's "sent" total counts it. */
const SAVE_BYTES = 1126;

/** Both windows show the same lines: the `Timing` block, with line 80 (the one the demo edits) in it. */
const FIRST_LINE = 76;
const LAST_LINE = 83;
const CODE_LINE_PX = 21;

/** Who is at each machine. The colours are the cursors', so a window and its cursor read as one person. */
const PEOPLE = {
  you: { label: "You", color: "oklch(0.5 0.12 155)" },
  priya: { label: "Priya", color: "oklch(0.55 0.14 50)" },
} as const;

/*
 * The demo's controls are the real shadcn `Button` and `Input`, restyled for
 * the surfaces they sit on. The laptop is dark in both themes, so its buttons
 * are drawn in translucent white; a bare input drops the field's own chrome
 * where the surrounding element (a label, a line of code) already provides it.
 */
const TERMINAL_BUTTON =
  "border-white/12 bg-transparent text-white/75 shadow-none hover:bg-white/10 hover:text-white focus-visible:border-white/30 focus-visible:ring-white/30 data-[autopilot-hover]:bg-white/10 data-[autopilot-press]:scale-[0.96] dark:border-white/12 dark:bg-transparent dark:hover:bg-white/10";
const BARE_INPUT =
  "h-auto rounded-none border-0 bg-transparent p-0 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent";

type Status = "idle" | "live" | "stopped";
type Line = { id: number; text: ReactNode; tone?: "muted" | "error" };
type Feed = { id: number; time: string; path: string };
/** Something that just went down the wire, for the relay to show. */
type Packet = { id: number; label: string };

type State = {
  shell: string;
  status: Status;
  history: Line[];
  /** The line under the frame: how this run began. */
  started: string | null;
  feed: Feed[];
  /** Checkpoints sent since `biga start`, and the files and bytes in them. */
  checkpoints: number;
  files: number;
  sentBytes: number;
  /** Checkpoints the viewer shows beyond the recorded session. */
  saves: number;
  packet: Packet | null;
  value: string;
  saved: string;
  sent: string;
  copied: boolean;
  address: string;
  open: boolean;
  missing: boolean;
};

const INITIAL: State = {
  shell: "",
  status: "idle",
  history: [],
  started: null,
  feed: [],
  checkpoints: 0,
  files: 0,
  sentBytes: 0,
  saves: 0,
  packet: null,
  value: BASE,
  saved: BASE,
  sent: BASE,
  copied: false,
  address: "",
  open: false,
  missing: false,
};

let lineId = 0;
const line = (text: ReactNode, tone?: Line["tone"]): Line => ({ id: ++lineId, text, tone });
const prompt = (command: string) => line(<><span className="text-brand-mark">$</span> {command}</>);
const clock = () => new Date().toLocaleTimeString("en-GB");
const feedLine = (): Feed => ({ id: ++lineId, time: clock(), path: DEMO_FILE });
const packet = (label: string): Packet => ({ id: ++lineId, label });

const STARTED = `Started ${NAME} — uploaded ${FILES} files, ${UPLOADED}`;

/* Every chapter starts from a known state, so a jump or a takeover replays cleanly. */
const LIVE: State = { ...INITIAL, status: "live", started: STARTED };
const WATCHING = (url: string): State => ({ ...LIVE, address: url, open: true });
const SAVED = (url: string): State => ({
  ...WATCHING(url),
  value: "150",
  saved: "150",
  sent: "150",
  checkpoints: 1,
  files: 1,
  sentBytes: SAVE_BYTES,
  saves: 1,
  feed: [feedLine()],
});

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The chapters, in the words the step bar shows above the stage. */
const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Start",
    body: (
      <>
        Run <Code>biga start</Code> in your project. It uploads the folder and prints a link.
      </>
    ),
  },
  { title: "Share", body: "Send the link. Priya opens it in any browser, with no account." },
  { title: "Save", body: "Edit and save. Only the changed file travels, and her view updates." },
  { title: "Rejoin", body: "Stop, keep editing, start again. Same link, caught up." },
];

export function RunDemo({ host }: { host: string }) {
  const url = `${host}/session/${SESSION}`;
  const [state, setState] = useState<State>(INITIAL);
  const update = useCallback((patch: Partial<State> | ((current: State) => Partial<State>)) => {
    setState((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  }, []);

  /* ── terminal ─────────────────────────────────────────── */

  const start = useCallback(() => {
    update((s) => {
      const history = [...s.history, prompt("biga start")];
      if (s.status === "live") {
        return { history: [...history, line("biga: already broadcasting this folder", "muted")], shell: "" };
      }
      if (s.status === "stopped") {
        const changed = s.saved !== s.sent;
        return {
          history,
          shell: "",
          status: "live",
          copied: false,
          sent: s.saved,
          checkpoints: changed ? 1 : 0,
          files: changed ? 1 : 0,
          sentBytes: changed ? SAVE_BYTES : 0,
          saves: changed ? s.saves + 1 : s.saves,
          feed: changed ? [feedLine()] : [],
          packet: packet(changed ? `caught up · 1 file · ${humanBytes(SAVE_BYTES)}` : "rejoined · in sync"),
          started: changed
            ? `Rejoined ${NAME} — synced 1 changed file, ${humanBytes(SAVE_BYTES)}`
            : `Rejoined ${NAME} — already in sync`,
        };
      }
      return {
        history,
        shell: "",
        status: "live",
        started: STARTED,
        feed: [],
        checkpoints: 0,
        files: 0,
        sentBytes: 0,
        packet: packet(`snapshot · ${FILES} files · ${UPLOADED}`),
      };
    });
  }, [update]);

  const run = useCallback(
    (raw: string) => {
      const command = raw.trim().replace(/\s+/g, " ");
      if (command === "biga start") return start();
      update((s) => {
        if (!command) return { history: [...s.history, prompt("")], shell: "" };
        if (command === "clear") return { history: [], shell: "" };
        return {
          history: [...s.history, prompt(command), line("command not found. Try: biga start", "error")],
          shell: "",
        };
      });
    },
    [start, update]
  );

  const stop = useCallback(() => {
    update((s) => ({
      status: "stopped",
      copied: false,
      history: [
        ...s.history,
        line(
          <>
            <span className="text-brand-mark">◇</span>
            {"  "}Stopped {NAME} · {plural(s.checkpoints, "checkpoint", "checkpoints")}
          </>
        ),
        line("│", "muted"),
        line(<>└{"  "}Done</>, "muted"),
      ],
    }));
  }, [update]);

  const onShellKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      run(event.currentTarget.value);
    }
  };

  /* ── editor ───────────────────────────────────────────── */

  const save = useCallback(() => {
    update((s) => {
      if (s.status !== "live") return { saved: s.value };
      // Same bytes, same hash: nothing to send.
      if (s.value === s.sent) return { saved: s.value };
      return {
        saved: s.value,
        sent: s.value,
        checkpoints: s.checkpoints + 1,
        files: 1,
        sentBytes: s.sentBytes + SAVE_BYTES,
        saves: s.saves + 1,
        feed: [...s.feed, feedLine()].slice(-3),
        packet: packet(`checkpoint · ${FILE_NAME} · ${humanBytes(SAVE_BYTES)}`),
      };
    });
  }, [update]);

  const onEditorKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
    }
  };

  /* ── browser ──────────────────────────────────────────── */

  const go = useCallback(() => {
    update((s) => {
      const found = s.address.includes(SESSION) && s.status !== "idle";
      return { open: found, missing: !found && s.address.trim() !== "" };
    });
  }, [update]);

  /*
   * Each cursor's steps in a chapter run as their own track, alongside the
   * other cursor's, so Priya's waits are what line her up with your actions.
   * Her first step resets her label, which otherwise carries over a loop.
   */
  const chapters: AutopilotChapter[] = useMemo(
    () => [
      {
        title: STEPS[0]!.title,
        setup: () => setState(INITIAL),
        steps: [
          { cursor: "priya", say: null, wait: 0 },
          { move: "shell", say: "Opening a terminal" },
          { type: "biga start{Enter}", into: "shell", say: "One command" },
          { wait: 1800, say: "Live in a second" },
        ],
      },
      {
        title: STEPS[1]!.title,
        setup: () => setState(LIVE),
        steps: [
          { cursor: "priya", say: null, wait: 0 },
          { click: "key-c", say: "Copying the link" },
          { wait: 900, say: "Sending it to Priya" },
          { cursor: "priya", wait: 1500 },
          { cursor: "priya", click: "address", say: "Pasting the link" },
          { cursor: "priya", do: () => update({ address: url, missing: false }) },
          { cursor: "priya", type: "{Enter}", into: "address" },
          { cursor: "priya", wait: 1400, say: "Watching" },
        ],
      },
      {
        title: STEPS[2]!.title,
        setup: () => setState(WATCHING(url)),
        steps: [
          { cursor: "priya", say: "Watching", wait: 0 },
          { click: "idle", say: "Changing one number" },
          { type: "{Backspace}{Backspace}50", into: "idle" },
          { click: "save", say: "Saving" },
          { wait: 1400, say: "Checkpoint sent" },
          // Priya's steps run alongside yours: she looks once the save has landed.
          { cursor: "priya", wait: 3600 },
          { cursor: "priya", move: "viewer-change", say: "There it is" },
          { cursor: "priya", wait: 2200 },
        ],
      },
      {
        title: STEPS[3]!.title,
        setup: () => setState(SAVED(url)),
        steps: [
          { cursor: "priya", say: "Watching", wait: 0 },
          { click: "key-q", say: "Stopping for lunch" },
          { click: "idle", say: "Still editing offline" },
          { type: "{Backspace}{Backspace}80", into: "idle" },
          { click: "save" },
          { type: "biga start{Enter}", into: "shell", say: "Same command again" },
          { wait: 1600, say: "Same link, caught up" },
          { cursor: "priya", wait: 1400 },
          { cursor: "priya", move: "viewer-status", say: "Ended, link kept" },
          { cursor: "priya", wait: 4400 },
          { cursor: "priya", say: "Live again", wait: 1000 },
          { cursor: "priya", move: "viewer-change", say: "Back with the change" },
          { cursor: "priya", wait: 1600 },
        ],
      },
    ],
    [update, url]
  );

  const s = state;
  const showcase = useMemo(
    () => ({ status: s.status === "live" ? ("active" as const) : ("ended" as const), saves: s.saves }),
    [s.status, s.saves]
  );

  return (
    <ShowcaseProvider state={showcase}>
      <Autopilot
        cursors={[
          { id: "you", ...PEOPLE.you, home: [0.72, 0.2] },
          { id: "priya", ...PEOPLE.priya, home: [0.84, 0.84] },
        ]}
        chapters={chapters}
        park="bottom-right"
        yieldLabel="Your turn"
        className="text-foreground"
        renderChapters={(api) => <Steps {...api} />}
      >
        <div className="flex flex-col">
          <Window dark person="you" bar={<WindowTitle dark>~/code/biga</WindowTitle>}>
            <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <Editor
                value={s.value}
                dirty={s.value !== s.saved}
                onChange={(value) => update({ value })}
                onKeyDown={onEditorKey}
                onSave={save}
              />
              <Terminal>
                {s.history.slice(-6).map((entry) => (
                  <p
                    key={entry.id}
                    className={cn(
                      "truncate",
                      entry.tone === "muted" && "text-white/50",
                      entry.tone === "error" && "text-[oklch(0.78_0.14_45)]"
                    )}
                  >
                    {entry.text}
                  </p>
                ))}
                {s.status === "live" ? (
                  <LivePanel
                    url={url}
                    state={s}
                    onCopy={() => update({ copied: true })}
                    onOpen={() => update({ address: url, open: true, missing: false })}
                    onStop={stop}
                  />
                ) : (
                  <label className="-mx-1 flex items-center gap-2 rounded-sm px-1 has-focus-visible:ring-1 has-focus-visible:ring-white/40">
                    <span aria-hidden className="text-brand-mark">
                      $
                    </span>
                    <span className="sr-only">Terminal command</span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <Input
                        data-autopilot="shell"
                        value={s.shell}
                        onChange={(event) => update({ shell: event.target.value })}
                        onKeyDown={onShellKey}
                        placeholder={s.status === "idle" ? "biga start" : ""}
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className={cn(
                          BARE_INPUT,
                          "biga-apprink block text-[12.5px] text-white caret-[var(--brand-mark)] [--shrink:0.78] placeholder:text-white/40 md:text-[12.5px]"
                        )}
                      />
                    </span>
                  </label>
                )}
              </Terminal>
            </div>
          </Window>

          <Relay status={s.status} host={host} packet={s.packet} />

          <Window
            person="priya"
            bar={
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span aria-hidden className="text-muted-foreground/60 hidden items-center gap-1.5 sm:flex">
                  <ArrowLeftIcon className="size-3.5" strokeWidth={1.75} />
                  <ArrowRightIcon className="size-3.5" strokeWidth={1.75} />
                  <RotateCwIcon className="size-3.5" strokeWidth={1.75} />
                </span>
                <label className="bg-muted has-focus-visible:ring-ring/50 flex h-7 min-w-0 flex-1 items-center overflow-hidden rounded-full px-3 has-focus-visible:ring-[3px]">
                  <span className="sr-only">Address</span>
                  <Input
                    data-autopilot="address"
                    value={s.address}
                    onChange={(event) => update({ address: event.target.value, missing: false })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        go();
                      }
                    }}
                    placeholder="Paste a share link"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className={cn(
                      BARE_INPUT,
                      "biga-apprink placeholder:text-muted-foreground block font-mono text-xs [--shrink:0.75] md:text-xs"
                    )}
                  />
                </label>
              </div>
            }
          >
            <div className="h-[19rem]">
              {s.open ? <Viewer status={s.status} sent={s.sent} /> : <NewTab missing={s.missing} />}
            </div>
          </Window>
        </div>
      </Autopilot>
    </ShowcaseProvider>
  );
}

/* ── Steps ──────────────────────────────────────────────── */

/**
 * The four chapters as the section's own narrative, above the stage: each
 * fills like a story timer while it plays, and choosing one replays it. A
 * single-choice group, since exactly one chapter is ever playing.
 */
function Steps({ chapter, progress, seek, control }: AutopilotChaptersApi) {
  return (
    <div className="mb-6 flex items-start gap-4 sm:mb-8 sm:gap-6">
      <ToggleGroup
        type="single"
        value={String(chapter)}
        // Each step's own click seeks, so choosing the playing one replays it.
        onValueChange={() => {}}
        aria-label="Chapters"
        className="grid h-auto min-w-0 flex-1 grid-cols-2 items-start gap-x-5 gap-y-5 rounded-none bg-transparent p-0 md:grid-cols-4 md:gap-x-6 pointer-coarse:h-auto"
      >
        {STEPS.map((step, i) => (
          <ToggleGroupItem
            key={step.title}
            value={String(i)}
            aria-label={`${i + 1}. ${step.title}`}
            onClick={() => seek(i)}
            className="h-auto w-full flex-col items-stretch justify-start gap-0 rounded-md px-0 pt-1 pb-1.5 text-left whitespace-normal opacity-60 transition-opacity hover:opacity-90 data-[state=on]:bg-transparent data-[state=on]:opacity-100 data-[state=on]:shadow-none"
          >
            <span aria-hidden className="bg-foreground/10 block h-[3px] overflow-hidden rounded-full">
              <motion.span
                className="bg-brand block h-full origin-left rounded-full"
                style={{ scaleX: i < chapter ? 1 : i === chapter ? progress : 0 }}
              />
            </span>
            <span className="mt-3 flex items-baseline gap-2">
              <Typography variant="label" tone="brand" className="tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </Typography>
              <span className="font-display text-foreground text-base font-bold tracking-[-0.01em] sm:text-lg">
                {step.title}
              </span>
            </span>
            <span className="font-body text-muted-foreground mt-1.5 hidden text-[13px] leading-snug font-normal text-pretty sm:block">
              {step.body}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <PauseButton
        paused={control.state !== "pause"}
        playLabel={control.state === "resume" ? "Resume" : "Play"}
        onToggle={control.toggle}
        className="shrink-0"
      />
    </div>
  );
}

/* ── Windows ────────────────────────────────────────────── */

/**
 * A window on someone's machine: traffic lights, whatever the bar holds and,
 * at the end, whose machine it is. The window is a container, so what's
 * inside lays out against its width, not the page's.
 */
function Window({
  dark = false,
  person,
  bar,
  children,
}: {
  dark?: boolean;
  person: keyof typeof PEOPLE;
  bar: ReactNode;
  children: ReactNode;
}) {
  const who = PEOPLE[person];
  return (
    <div
      className={cn(
        "@container overflow-hidden rounded-xl border",
        dark
          ? "bg-terminal text-terminal-foreground border-white/10 shadow-[0_1px_1px_oklch(0_0_0_/_0.06),0_24px_56px_-28px_oklch(0_0_0_/_0.55)]"
          : "bg-background border-rail shadow-[0_1px_1px_oklch(0_0_0_/_0.04),0_24px_56px_-32px_oklch(0_0_0_/_0.3)] dark:shadow-[0_1px_1px_oklch(0_0_0_/_0.2),0_24px_56px_-28px_oklch(0_0_0_/_0.7)]"
      )}
    >
      <div className={cn("flex h-10 items-center gap-3 border-b px-3", dark ? "border-white/10" : "border-rail")}>
        <span aria-hidden className="flex shrink-0 gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("size-2.5 rounded-full", dark ? "bg-white/15" : "bg-foreground/15")} />
          ))}
        </span>
        <div className="flex min-w-0 flex-1 items-center">{bar}</div>
        <Badge
          variant="outline"
          className={cn("font-body shrink-0 gap-1.5 rounded-full", dark ? "border-white/15 text-white/80" : "border-rail text-muted-foreground")}
        >
          <span aria-hidden className="size-1.5 rounded-full" style={{ background: who.color }} />
          {who.label}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function WindowTitle({ dark = false, children }: { dark?: boolean; children: ReactNode }) {
  return (
    <span translate="no" className={cn("truncate font-mono text-xs", dark ? "text-white/55" : "text-muted-foreground")}>
      {children}
    </span>
  );
}

/**
 * The editor: lines of the real `internal/config/config.go`, highlighted with
 * the viewer's dark theme. Line 80 is the one the demo edits, so the default
 * idle time, `120`, is an input there. Long lines wrap rather than run under
 * the edge, so every line is readable at any width.
 */
function Editor({
  value,
  dirty,
  onChange,
  onKeyDown,
  onSave,
}: {
  value: string;
  dirty: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) {
  const fixture = useShowcase();
  const file = fixture?.shown.find((candidate) => candidate.path === DEMO_FILE);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex h-9 shrink-0 items-stretch justify-between border-b border-white/10">
        <span className="flex items-center gap-2 border-r border-white/10 bg-white/[0.04] px-3 font-mono text-xs text-white/85">
          <FileTypeIcon name={FILE_NAME} kind="file" className="size-3.5" />
          {FILE_NAME}
          <span
            aria-label={dirty ? "Unsaved changes" : undefined}
            className={cn("size-1.5 rounded-full bg-white/70 transition-opacity", dirty ? "opacity-100" : "opacity-0")}
          />
        </span>
        <div className="flex items-center pr-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            data-autopilot="save"
            onClick={onSave}
            className={cn(TERMINAL_BUTTON, "font-body")}
          >
            Save
            <Kbd className="h-auto min-w-0 border-0 bg-transparent px-0 font-mono text-white/60">⌘S</Kbd>
          </Button>
        </div>
      </div>

      <div
        translate="no"
        className="py-3 font-mono text-[12.5px]"
        style={{ lineHeight: `${CODE_LINE_PX}px`, minHeight: (LAST_LINE - FIRST_LINE + 1) * CODE_LINE_PX + 24 }}
      >
        {file?.tokens.slice(FIRST_LINE - 1, LAST_LINE).map((tokens, index) => {
          const number = FIRST_LINE + index;
          const current = number === DEMO_LINE;
          return (
            <div key={number} className={cn("flex", current && "bg-white/[0.045]")}>
              <span
                aria-hidden
                className={cn("w-12 shrink-0 pr-4 text-right tabular-nums select-none", current ? "text-white/60" : "text-white/25")}
              >
                {number}
              </span>
              <span className="tab-2 min-w-0 flex-1 pr-4 [padding-inline-start:4ch] [text-indent:-4ch] break-words whitespace-pre-wrap">
                {tokens.map(([text, , dark], i) =>
                  current && text === BASE ? (
                    <Input
                      key={i}
                      data-autopilot="idle"
                      aria-label="Idle time in milliseconds, on line 80"
                      value={value}
                      inputMode="numeric"
                      maxLength={4}
                      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      onKeyDown={onKeyDown}
                      style={{ width: `${Math.max(1, value.length) + 0.6}ch`, color: dark }}
                      className="-my-0.5 inline-block h-auto min-w-0 rounded-sm border-0 bg-white/10 px-[0.3ch] py-0 text-base shadow-none focus-visible:border-0 focus-visible:ring-1 focus-visible:ring-white/30 data-[autopilot-focus]:ring-1 data-[autopilot-focus]:ring-white/30 sm:text-[12.5px] md:text-[12.5px] dark:bg-white/10"
                    />
                  ) : (
                    <span key={i} style={{ color: dark }}>
                      {text}
                    </span>
                  )
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A terminal pane. Output starts at the top like a fresh shell and, once it
 * fills the pane, the oldest lines scroll off the top. Beside the editor it
 * takes the editor's height; stacked under it, a height of its own.
 */
function Terminal({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  });

  return (
    <div className="flex h-48 min-w-0 flex-col border-t border-white/10 @4xl:h-auto @4xl:border-t-0 @4xl:border-l">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3 font-mono text-xs text-white/55">
        <SquareTerminalIcon aria-hidden className="size-3.5" strokeWidth={1.75} />
        zsh
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          className="absolute inset-0 overflow-hidden px-3 py-3 font-mono text-[12.5px]"
          style={{ lineHeight: `${CODE_LINE_PX}px` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * The CLI's live panel, as `biga start` draws it (`cli/internal/ui/live.go`):
 * the frame, how the run began, one block per project, the change feed and the
 * key hints. Glyphs and wording are the CLI's.
 */
function LivePanel({
  url,
  state: s,
  onCopy,
  onOpen,
  onStop,
}: {
  url: string;
  state: State;
  onCopy: () => void;
  onOpen: () => void;
  onStop: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!s.copied) return;
    setNotice("Link copied");
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [s.copied]);

  const sentLine =
    s.checkpoints === 0
      ? "live · waiting for changes"
      : `live · ${plural(s.checkpoints, "checkpoint", "checkpoints")} · ${plural(s.files, "file", "files")} · ${humanBytes(s.sentBytes)} sent · last sync just now`;

  return (
    <div className="flex flex-col">
      <p className="text-white/50">┌{"  "}biga</p>
      {s.started ? (
        <p className="truncate">
          <span className="text-brand-mark">◇</span>
          {"  "}
          {s.started}
        </p>
      ) : null}
      <p className="text-white/50">│</p>
      <p translate="no" className="truncate">
        <span className="text-brand-mark">●</span>
        {"  "}
        <strong className="font-semibold">{TITLE}</strong>
        {"  "}
        <span className="text-[oklch(0.82_0.1_215)]">{url}</span>
      </p>
      <p className="truncate text-white/60">
        <span className="text-white/50">│</span>
        {"  "}
        {sentLine}
      </p>
      {s.feed.slice(-2).map((entry) => (
        <p key={entry.id} translate="no" className="truncate">
          <span className="text-white/50">│</span>
          {"  "}
          <span className="text-white/50 tabular-nums">{entry.time}</span>
          {"  "}
          <span className="text-[oklch(0.85_0.13_85)]">~</span> {entry.path}
        </p>
      ))}
      <p className="text-white/50">│</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-1.5">
        <TuiKey name="c" target="key-c" onClick={onCopy}>
          copy link
        </TuiKey>
        <TuiKey name="o" target="key-o" onClick={onOpen}>
          open in browser
        </TuiKey>
        <TuiKey name="q" target="key-q" onClick={onStop}>
          stop
        </TuiKey>
        {notice ? <span className="text-brand-mark ml-1">{notice}</span> : null}
      </div>
    </div>
  );
}

function TuiKey({
  name,
  target,
  onClick,
  children,
}: {
  name: string;
  target: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      data-autopilot={target}
      onClick={onClick}
      className={cn(TERMINAL_BUTTON, "h-6 gap-1.5 px-2 text-[12px] font-normal")}
    >
      <span className="text-brand-mark">{name}</span>
      <span className="text-white/70">{children}</span>
    </Button>
  );
}

/* ── The wire ───────────────────────────────────────────── */

const RELAY_LABEL: Record<Status, string> = {
  idle: "not broadcasting",
  live: "live",
  stopped: "stopped · link kept",
};

/**
 * biga, between the two machines: a wire that is dashed while nothing is
 * broadcasting and flows while it is, with a node that says what the wire is
 * doing. Each upload runs down it as a pulse, and the node shows what went
 * (the first snapshot, a checkpoint, the catch-up after a rejoin) for a moment.
 */
function Relay({ status, host, packet }: { status: Status; host: string; packet: Packet | null }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<Packet | null>(null);

  useEffect(() => {
    setShown(packet);
    if (!packet) return;
    const timer = setTimeout(() => setShown(null), 2600);
    return () => clearTimeout(timer);
  }, [packet]);

  const label = shown ? shown.label : status === "live" ? `live · ${host}` : RELAY_LABEL[status];

  return (
    <div className="relative grid h-24 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
      <span
        aria-hidden
        data-state={status}
        className="biga-wire absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
      />
      <AnimatePresence>
        {packet && !reduce ? (
          <motion.span
            key={packet.id}
            aria-hidden
            className="bg-brand absolute top-0 left-1/2 -ml-[5px] size-2.5 rounded-full shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_22%,transparent)]"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 88, opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
          />
        ) : null}
      </AnimatePresence>

      <div className="flex justify-end">
        <Annotation className="hidden sm:inline-flex">Only what changed travels</Annotation>
      </div>
      <div
        data-autopilot="relay"
        className={cn(
          "relative z-10 flex h-8 items-center gap-2 rounded-full border px-3.5 font-mono text-xs whitespace-nowrap transition-[background-color,border-color,color] duration-200",
          shown
            ? "bg-brand-mark text-brand-mark-foreground border-transparent"
            : "border-rail bg-background text-muted-foreground"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            shown ? "bg-brand-mark-foreground" : status === "live" ? "bg-brand" : "bg-muted-foreground/50"
          )}
        />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={label}
            translate="no"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
      <div />
    </div>
  );
}

/* ── Priya's browser ────────────────────────────────────── */

/** What a tab shows before the link is opened, or when it leads nowhere. */
function NewTab({ missing }: { missing: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <BigaMark cell={3} className="text-foreground/15" />
      <Typography variant="h4">{missing ? "Nothing broadcasting at that link" : "Waiting for a link"}</Typography>
      <Typography variant="small" tone="muted" className="max-w-[34ch]">
        {missing
          ? "Check the link, or start the broadcast first."
          : "Priya pastes your share link here. No sign-in, nothing to install."}
      </Typography>
    </div>
  );
}

/**
 * The real viewer at its own size: the header, the code pane on the same lines
 * the editor shows, and the timeline once the window is wide enough for it.
 * Each region is the viewer's component reading the seeded stores, so a save
 * lands as a new checkpoint and the changed value is drawn under the
 * highlighter. It is a picture of the product, so it takes no input.
 */
function Viewer({ status, sent }: { status: Status; sent: string }) {
  const root = useRef<HTMLDivElement>(null);

  // The header's live status is the viewer's own markup; name it for the cursor.
  useEffect(() => {
    root.current?.querySelector('[data-slot="live-status"]')?.setAttribute("data-autopilot", "viewer-status");
  });

  return (
    <div ref={root} inert className="flex h-full flex-col">
      <div className="h-12 shrink-0">
        <PanelHeader live={status === "live"} />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <PanelCode
            save={sent !== BASE ? { from: BASE, to: sent, target: "viewer-change" } : undefined}
            firstLine={FIRST_LINE}
            wrap
            tabSize={2}
          />
        </div>
        <div className="hidden w-72 shrink-0 @4xl:block">
          <PanelTimeline />
        </div>
      </div>
    </div>
  );
}
