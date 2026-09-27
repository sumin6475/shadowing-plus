"use client";

import { useRef, type MouseEvent, type PointerEvent } from "react";

const DRAG_PX = 6;

/** True when this click finished a drag-select inside `container`. */
export function clickWasTextSelection(container: EventTarget | null): boolean {
  if (!(container instanceof Node)) return false;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return false;
  if (!sel.toString().replace(/\s+/g, " ").trim()) return false;
  const node = sel.anchorNode;
  return !!node && container.contains(node);
}

/**
 * Line tap vs drag-select. A tap jumps the player (and starts it); a drag
 * that creates a text selection — or any pointer movement past a few pixels —
 * must not call play(). Shared across every line because only one pointer
 * is down at a time.
 */
export function useLineTap(onTap: (index: number) => void) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      origin.current = { x: e.clientX, y: e.clientY };
      dragged.current = false;
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!origin.current || e.buttons === 0) return;
      const dx = e.clientX - origin.current.x;
      const dy = e.clientY - origin.current.y;
      if (dx * dx + dy * dy > DRAG_PX * DRAG_PX) dragged.current = true;
    },
    onClick: (e: MouseEvent<HTMLElement>, index: number) => {
      const skip = dragged.current || clickWasTextSelection(e.currentTarget);
      dragged.current = false;
      origin.current = null;
      if (skip) {
        e.currentTarget.blur();
        return;
      }
      onTap(index);
      e.currentTarget.blur();
    },
  };
}
