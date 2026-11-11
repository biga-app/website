"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type RefObject,
} from "react";

export type TreeItemMeta = {
    key: string;
    /** 1-based nesting level. */
    level: number;
    /** Text used for type-ahead. */
    label: string;
    expandable: boolean;
    expanded: boolean;
};

type Options = {
    items: readonly TreeItemMeta[];
    containerRef: RefObject<HTMLElement | null>;
    /** The selected item; keeps the tab stop on it when selection changes elsewhere. */
    selectedKey?: string | null;
    onToggle: (index: number, expand: boolean) => void;
    onActivate: (index: number) => void;
    /** For virtualized lists: bring an index into the rendered range before focusing it. */
    scrollToIndex?: (index: number) => void;
};

const TYPEAHEAD_RESET_MS = 600;

/**
 * Keyboard model for a flat-rendered tree, following the WAI-ARIA tree pattern:
 * one tab stop (roving tabindex), arrows to move, Right/Left to expand,
 * collapse or step to the parent, Home/End, Enter/Space to activate, and
 * type-ahead on item labels.
 *
 * The active item is tracked by key rather than index, so it stays put when
 * rows above it expand or collapse.
 */
export function useRovingTree({
    items,
    containerRef,
    selectedKey,
    onToggle,
    onActivate,
    scrollToIndex,
}: Options) {
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const focusPending = useRef(false);
    const typeahead = useRef({ buffer: "", at: 0 });

    const indexByKey = useMemo(() => {
        const map = new Map<string, number>();
        items.forEach((item, index) => map.set(item.key, index));
        return map;
    }, [items]);

    // Follow outside selection changes (a file opened from Go to file, say)
    // so Tab lands on the selected row.
    const appliedSelection = useRef<string | null>(null);
    useEffect(() => {
        if (selectedKey && selectedKey !== appliedSelection.current && indexByKey.has(selectedKey)) {
            appliedSelection.current = selectedKey;
            setActiveKey(selectedKey);
        }
    }, [selectedKey, indexByKey]);

    const resolvedKey =
        activeKey !== null && indexByKey.has(activeKey) ? activeKey : (items[0]?.key ?? null);
    const activeIndex = resolvedKey !== null ? (indexByKey.get(resolvedKey) ?? -1) : -1;

    const focusIndex = useCallback(
        (index: number) => {
            const item = items[index];
            if (!item) {
                return;
            }
            focusPending.current = true;
            setActiveKey(item.key);
            scrollToIndex?.(index);
        },
        [items, scrollToIndex]
    );

    // Move DOM focus after the target row has rendered (it may have just been
    // scrolled into a virtualized range).
    useEffect(() => {
        if (!focusPending.current || activeIndex < 0) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            const element = containerRef.current?.querySelector<HTMLElement>(
                `[data-tree-index="${activeIndex}"]`
            );
            if (element) {
                focusPending.current = false;
                element.focus({ preventScroll: Boolean(scrollToIndex) });
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [activeIndex, containerRef, scrollToIndex]);

    const parentIndex = useCallback(
        (index: number) => {
            const level = items[index]?.level ?? 1;
            for (let i = index - 1; i >= 0; i--) {
                if ((items[i]?.level ?? 1) < level) {
                    return i;
                }
            }
            return -1;
        },
        [items]
    );

    const onKeyDown = useCallback(
        (event: KeyboardEvent<HTMLElement>, index: number) => {
            const item = items[index];
            if (!item || event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            let handled = true;
            switch (event.key) {
                case "ArrowDown":
                    focusIndex(Math.min(items.length - 1, index + 1));
                    break;
                case "ArrowUp":
                    focusIndex(Math.max(0, index - 1));
                    break;
                case "Home":
                    focusIndex(0);
                    break;
                case "End":
                    focusIndex(items.length - 1);
                    break;
                case "ArrowRight":
                    if (item.expandable && !item.expanded) {
                        onToggle(index, true);
                    } else if (item.expandable && (items[index + 1]?.level ?? 0) > item.level) {
                        focusIndex(index + 1);
                    }
                    break;
                case "ArrowLeft": {
                    if (item.expandable && item.expanded) {
                        onToggle(index, false);
                    } else {
                        const parent = parentIndex(index);
                        if (parent >= 0) {
                            focusIndex(parent);
                        }
                    }
                    break;
                }
                case "Enter":
                case " ":
                    onActivate(index);
                    break;
                default: {
                    handled = false;
                    if (event.key.length === 1 && /\S/.test(event.key)) {
                        const now = Date.now();
                        const state = typeahead.current;
                        state.buffer =
                            now - state.at > TYPEAHEAD_RESET_MS
                                ? event.key.toLowerCase()
                                : state.buffer + event.key.toLowerCase();
                        state.at = now;
                        // A repeated single letter cycles through matches.
                        const start = state.buffer.length === 1 ? index + 1 : index;
                        for (let offset = 0; offset < items.length; offset++) {
                            const candidate = (start + offset) % items.length;
                            if (items[candidate]?.label.toLowerCase().startsWith(state.buffer)) {
                                focusIndex(candidate);
                                break;
                            }
                        }
                        handled = true;
                    }
                }
            }
            if (handled) {
                event.preventDefault();
                event.stopPropagation();
            }
        },
        [items, focusIndex, onToggle, onActivate, parentIndex]
    );

    const getItemProps = useCallback(
        (index: number) => ({
            tabIndex: index === activeIndex ? 0 : -1,
            "data-tree-index": index,
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => onKeyDown(event, index),
            onFocus: () => {
                const key = items[index]?.key;
                if (key !== undefined && key !== activeKey) {
                    setActiveKey(key);
                }
            },
        }),
        [activeIndex, activeKey, items, onKeyDown]
    );

    return { activeIndex, getItemProps };
}
