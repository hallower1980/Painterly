import { useRef } from "react";
import type { Hsl } from "@/lib/color";
import { hslToCss } from "@/lib/color";
import { cn } from "@/lib/utils";

type Props = {
  side: "left" | "right";
  color: Hsl | null;
  onSave: () => void;
  onSwap: () => void;
  onClear: () => void;
};

const DOUBLE_MS = 320;
const HOLD_MS = 2000;

export function SwatchBox({ side, color, onSave, onSwap, onClear }: Props) {
  const tapTimer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const lastTap = useRef(0);
  const held = useRef(false);

  const clearTimers = () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    tapTimer.current = null;
    holdTimer.current = null;
  };

  return (
    <button
      type="button"
      className={cn("swatch", color && "is-filled")}
      data-testid={`swatch-${side}`}
      aria-label={side === "left" ? "Left color box" : "Right color box"}
      style={color ? { backgroundColor: hslToCss(color) } : undefined}
      onPointerDown={(e) => {
        e.stopPropagation();
        held.current = false;
        holdTimer.current = window.setTimeout(() => {
          held.current = true;
          onClear();
        }, HOLD_MS);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (holdTimer.current) window.clearTimeout(holdTimer.current);
        holdTimer.current = null;
        if (held.current) return;
        const now = e.timeStamp;
        if (now - lastTap.current < DOUBLE_MS) {
          lastTap.current = 0;
          if (tapTimer.current) window.clearTimeout(tapTimer.current);
          onSave();
        } else {
          lastTap.current = now;
          tapTimer.current = window.setTimeout(() => {
            onSwap();
            tapTimer.current = null;
          }, DOUBLE_MS);
        }
      }}
      onPointerCancel={clearTimers}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (tapTimer.current) window.clearTimeout(tapTimer.current);
        lastTap.current = 0;
        onSave();
      }}
    />
  );
}
