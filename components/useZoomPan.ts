"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface View {
  k: number;
  tx: number;
  ty: number;
}

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_K = 0.08;
const MAX_K = 3;
/** Movement below this is a click, not a pan. */
const DRAG_THRESHOLD = 4;

/**
 * Minimal wheel-zoom + drag-pan. Hand-rolled rather than pulling in d3-zoom —
 * it is ~80 lines and keeps the dependency list at one package.
 *
 * Deliberately does NOT use setPointerCapture. Capturing the pointer on the
 * <svg> makes the browser retarget the following `click` event to the <svg>
 * itself, so clicks never reach the leaves or the fold controls inside it —
 * every node interaction silently dies. Dragging is driven from window-level
 * listeners instead, which keeps drag-outside-the-element working without
 * stealing click targeting.
 */
export function useZoomPan(bounds: Bounds) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);

  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null);
  /** Set when a gesture turned out to be a pan, so it doesn't also read as a click. */
  const draggedRef = useRef(false);
  /** Mirrors `view` so pointerdown can read the current translation without
      reaching into a state updater (which Strict Mode may run twice). */
  const viewRef = useRef(view);
  viewRef.current = view;

  const fit = useCallback(
    (padding = 0.9) => {
      const el = svgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const k = Math.min(r.width / bounds.w, r.height / bounds.h) * padding;
      setView({
        k,
        tx: r.width / 2 - (bounds.x + bounds.w / 2) * k,
        ty: r.height / 2 - (bounds.y + bounds.h / 2) * k,
      });
    },
    [bounds.x, bounds.y, bounds.w, bounds.h],
  );

  // Fit once the element has a real size, and re-fit on resize.
  useEffect(() => {
    fit();
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const zoomBy = useCallback((factor: number, cx?: number, cy?: number) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setView((v) => {
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor));
      const s = k / v.k;
      return { k, tx: px - (px - v.tx) * s, ty: py - (py - v.ty) * s };
    });
  }, []);

  // Wheel must be non-passive to cancel page scroll, so it is bound manually.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Pan is tracked on window so the gesture survives leaving the element,
  // which is what pointer capture would otherwise have given us.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        d.moved = true;
        setDragging(true);
      }
      setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
    };
    const onUp = () => {
      const d = drag.current;
      if (!d) return;
      draggedRef.current = d.moved;
      drag.current = null;
      setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      tx: viewRef.current.tx,
      ty: viewRef.current.ty,
      moved: false,
    };
  }, []);

  /**
   * True when the gesture that just ended was a pan, so click handlers can
   * ignore it. Reading it clears it.
   */
  const consumeDrag = useCallback(() => {
    const was = draggedRef.current;
    draggedRef.current = false;
    return was;
  }, []);

  /** Centre the view on a world-space point without shrinking the zoom. */
  const centerOn = useCallback((x: number, y: number, k?: number) => {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setView((v) => {
      const nk = k ?? Math.max(v.k, 0.55);
      return { k: nk, tx: r.width / 2 - x * nk, ty: r.height / 2 - y * nk };
    });
  }, []);

  return {
    svgRef,
    view,
    dragging,
    fit,
    zoomBy,
    centerOn,
    consumeDrag,
    handlers: { onPointerDown },
  };
}
