import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

/*
 * The mark is a lowercase "b" drawn on a 5 × 7 pixel grid, the same grid the
 * Geist Pixel labels use, with its top-right cell lit green: the save that
 * just went out. Each cell is 3px at the default size so it renders crisp.
 */
export const MARK_CELLS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  [1, 2], [2, 2], [3, 2],
  [4, 3], [4, 4], [4, 5],
  [1, 6], [2, 6], [3, 6],
];

export function BigaMark({
  cell = 3,
  className,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Pixel size of one grid cell. */
  cell?: number;
}) {
  return (
    <svg
      viewBox="0 0 5 7"
      width={5 * cell}
      height={7 * cell}
      shapeRendering="crispEdges"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      {MARK_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
      <rect x={4} y={0} width={1} height={1} fill="var(--brand)" />
    </svg>
  );
}

/** Mark plus wordmark, as used in the header and footer. */
export function BigaLogo({ className, cell = 3 }: { className?: string; cell?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BigaMark cell={cell} />
      <span
        translate="no"
        className="text-[1.375rem] leading-none font-semibold tracking-[-0.05em]"
      >
        biga
      </span>
    </span>
  );
}
