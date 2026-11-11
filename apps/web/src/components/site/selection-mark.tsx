"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const HANDLES = ["-start-[3px] -top-[3px]", "-end-[3px] -top-[3px]", "-start-[3px] -bottom-[3px]", "-end-[3px] -bottom-[3px]"];

export function SelectionMark({ children }: { children: ReactNode }) {
    const reduce = useReducedMotion();
    return (
        <span className="relative inline-block px-[0.12em]">
            {children}
            <motion.span
                aria-hidden
                className="border-brand pointer-events-none absolute -inset-x-0.5 inset-y-[0.06em] border"
                initial={reduce ? false : { opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
                {HANDLES.map((position) => (
                    <span key={position} className={`bg-background border-brand absolute size-[7px] border ${position}`} />
                ))}
            </motion.span>
        </span>
    );
}
