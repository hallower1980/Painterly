import { useEffect, useRef, type RefObject } from "react";
import { clamp, type Hsl, wrapHue } from "@/lib/color";

type Point = { x: number; y: number; t: number };

type Opts = {
  stageRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  getHsl: () => Hsl;
  setHslLive: (c: Hsl) => void;
  commitHsl: (c: Hsl) => void;
  getPrecision: () => number;
  setPrecision: (n: number) => void;
  onFlick: () => void;
  onHold: () => void;
  onRibbon: (on: boolean) => void;
};

const FAST_VELOCITY = 1.1;
const HOLD_MS = 480;
const MOVE_SLOP = 10;

export function useStageGestures(opts: Opts) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = opts.stageRef.current;
    if (!el || !opts.enabled) return;

    const pointers = new Map<number, Point>();
    let start: Point | null = null;
    let last: Point | null = null;
    let mode: "idle" | "scrub" | "pinch" | "hold" = "idle";
    let axis: "x" | "y" | null = null;
    let live: Hsl = optsRef.current.getHsl();
    let holdTimer: number | null = null;
    let pinchStartDist = 0;
    let pinchStartPrecision = optsRef.current.getPrecision();
    let ribbonTimer: number | null = null;

    const clearHold = () => {
      if (holdTimer != null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    const showRibbon = () => {
      optsRef.current.onRibbon(true);
      if (ribbonTimer) window.clearTimeout(ribbonTimer);
      ribbonTimer = window.setTimeout(() => optsRef.current.onRibbon(false), 900);
    };

    const applyLive = (next: Hsl) => {
      live = next;
      optsRef.current.setHslLive(next);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (
        e.target instanceof Element &&
        e.target.closest("button, a, input, textarea, [role='dialog'], [role='slider']")
      ) {
        return;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (pointers.size === 2) {
        clearHold();
        mode = "pinch";
        const [a, b] = [...pointers.values()];
        pinchStartDist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        pinchStartPrecision = optsRef.current.getPrecision();
        showRibbon();
        return;
      }

      if (pointers.size !== 1) return;

      start = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      last = start;
      mode = "idle";
      axis = null;
      live = optsRef.current.getHsl();
      clearHold();
      holdTimer = window.setTimeout(() => {
        if (mode === "idle") {
          mode = "hold";
          optsRef.current.onHold();
        }
      }, HOLD_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp });

      if (mode === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.max(8, Math.hypot(a.x - b.x, a.y - b.y));
        const next = clamp(pinchStartPrecision * (pinchStartDist / dist), 0.2, 18);
        optsRef.current.setPrecision(next);
        showRibbon();
        return;
      }

      if (!start || !last) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MOVE_SLOP) {
        clearHold();
        if (mode === "idle") mode = "scrub";
      }
      if (mode !== "scrub") return;

      if (!axis) axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      const step = axis === "x" ? e.clientX - last.x : last.y - e.clientY;
      last = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      const precision = optsRef.current.getPrecision();
      const hueStep = step * (precision * 0.12);
      const lightStep = step * 0.0018;
      if (axis === "x") {
        applyLive({ ...live, h: wrapHue(live.h + hueStep) });
      } else {
        applyLive({ ...live, l: clamp(live.l + lightStep, 0.08, 0.92) });
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      clearHold();

      if (mode === "pinch") {
        if (pointers.size < 2) mode = "idle";
        return;
      }

      if (!start || !last) {
        mode = "idle";
        return;
      }

      const dt = Math.max(16, e.timeStamp - start.t);
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dist = Math.hypot(dx, dy);
      const vel = dist / dt;

      if (mode === "idle" && dist < MOVE_SLOP) {
        mode = "idle";
        start = null;
        return;
      }

      if (mode === "scrub" && vel >= FAST_VELOCITY && dist > 48) {
        optsRef.current.onFlick();
      } else {
        optsRef.current.commitHsl(live);
      }

      mode = "idle";
      start = null;
      last = null;
      axis = null;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const color = optsRef.current.getHsl();
      const p = optsRef.current.getPrecision();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        optsRef.current.commitHsl({ ...color, h: wrapHue(color.h - p) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        optsRef.current.commitHsl({ ...color, h: wrapHue(color.h + p) });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        optsRef.current.commitHsl({ ...color, l: clamp(color.l + 0.03, 0.08, 0.92) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        optsRef.current.commitHsl({ ...color, l: clamp(color.l - 0.03, 0.08, 0.92) });
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        optsRef.current.onFlick();
      } else if (e.key === "h" || e.key === "H") {
        optsRef.current.onHold();
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      clearHold();
      if (ribbonTimer) window.clearTimeout(ribbonTimer);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [opts.enabled, opts.stageRef]);
}
