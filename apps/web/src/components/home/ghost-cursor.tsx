"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { MousePointer2Icon } from "lucide-react";
import { useImperativeHandle, useRef, type RefObject, type Ref } from "react";

export type CursorHandle = {
  glideTo: (target: Element) => Promise<void>;
  press: () => Promise<void>;
  rest: () => void;
};

const TRAVEL = { type: "spring", stiffness: 140, damping: 22, mass: 0.9 } as const;

function centerWithin(container: HTMLElement, target: Element): { x: number; y: number } {
  const box = container.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  return { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
}

export function GhostCursor({ container, ref }: { container: RefObject<HTMLElement | null>; ref: Ref<CursorHandle> }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(0);
  const pulse = useMotionValue(0);
  const ringScale = useTransform(pulse, [0, 1], [0.3, 1.9]);
  const ringOpacity = useTransform(pulse, [0, 0.15, 1], [0, 0.9, 0]);
  const placed = useRef(false);

  useImperativeHandle(ref, () => ({
    async glideTo(target) {
      const root = container.current;
      if (!root) return;
      const goal = centerWithin(root, target);
      if (!placed.current) {
        const box = root.getBoundingClientRect();
        x.set(box.width * 0.62);
        y.set(box.height * 0.92);
        placed.current = true;
      }
      animate(opacity, 1, { duration: 0.2 });
      await Promise.all([animate(x, goal.x, TRAVEL), animate(y, goal.y, TRAVEL)]);
    },
    async press() {
      pulse.set(0);
      await animate(pulse, 1, { duration: 0.5, ease: "easeOut" });
    },
    rest() {
      animate(opacity, 0, { duration: 0.5, delay: 1 });
    },
  }));

  return (
    <motion.div aria-hidden style={{ x, y, opacity }} className="pointer-events-none absolute top-0 left-0 z-50">
      <motion.span style={{ scale: ringScale, opacity: ringOpacity }} className="border-brand absolute -top-3 -left-3 size-6 rounded-full border-2" />
      <MousePointer2Icon className="fill-foreground text-background size-5 drop-shadow-md" strokeWidth={1.5} />
    </motion.div>
  );
}
