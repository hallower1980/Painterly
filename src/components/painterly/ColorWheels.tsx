import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { complement, type Hsl } from "@/lib/color";
import { getHsWheelCanvas, pickFromWheel } from "@/lib/hs-wheel";

type Props = {
  color: Hsl;
  onChange: (c: Hsl) => void;
  onClose: () => void;
};

export function ColorWheels({ color, onChange, onClose }: Props) {
  const primaryRef = useRef<HTMLCanvasElement>(null);
  const complementRef = useRef<HTMLCanvasElement>(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const draw = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const size = canvas.clientWidth;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(getHsWheelCanvas(size), 0, 0, canvas.width, canvas.height);
    };
    draw(primaryRef.current);
    draw(complementRef.current);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pick = (canvas: HTMLCanvasElement, e: ReactPointerEvent | PointerEvent, asComplement: boolean) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { h, s } = pickFromWheel(x, y, rect.width);
    const current = colorRef.current;
    const next = asComplement
      ? { h: complement({ h, s, l: current.l }).h, s, l: current.l }
      : { h, s, l: current.l };
    onChange(next);
  };

  const bind = (canvas: HTMLCanvasElement | null, asComplement: boolean) => {
    if (!canvas) return;
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pick(canvas, e, asComplement);
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      pick(canvas, e, asComplement);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
    };
  };

  useEffect(() => {
    const a = bind(primaryRef.current, false);
    const b = bind(complementRef.current, true);
    return () => {
      a?.();
      b?.();
    };
  }, []);

  const comp = complement(color);
  const marker = (h: number, s: number) => {
    const rad = (h * Math.PI) / 180;
    const x = 50 + Math.cos(rad) * s * 46;
    const y = 50 + Math.sin(rad) * s * 46;
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div className="wheels-overlay" data-testid="color-wheels" role="dialog" aria-label="Color wheels">
      <div className="wheels-row">
        <div className="wheel-wrap">
          <canvas ref={primaryRef} className="wheel-canvas" />
          <span className="wheel-marker" style={marker(color.h, color.s)} />
          <p className="wheel-label">Hue</p>
        </div>
        <div className="wheel-wrap">
          <canvas ref={complementRef} className="wheel-canvas" />
          <span className="wheel-marker" style={marker(comp.h, color.s)} />
          <button
            type="button"
            className="wheel-label"
            onClick={() => onChange({ ...comp, s: color.s, l: color.l })}
          >
            Complement
          </button>
        </div>
      </div>
      <div
        className="lightness-rail"
        role="slider"
        aria-valuemin={8}
        aria-valuemax={92}
        aria-valuenow={Math.round(color.l * 100)}
        style={{
          background: `linear-gradient(90deg, hsl(${color.h} ${color.s * 100}% 8%), hsl(${color.h} ${color.s * 100}% 92%))`,
        }}
        onPointerDown={(e) => {
          const rail = e.currentTarget;
          const move = (ev: PointerEvent) => {
            const rect = rail.getBoundingClientRect();
            const t = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
            onChange({ ...colorRef.current, l: 0.08 + t * 0.84 });
          };
          rail.setPointerCapture(e.pointerId);
          move(e.nativeEvent);
          rail.onpointermove = move as never;
          rail.onpointerup = () => {
            rail.onpointermove = null;
            rail.onpointerup = null;
          };
        }}
      >
        <span className="lightness-thumb" style={{ left: `${((color.l - 0.08) / 0.84) * 100}%` }} />
      </div>
      <button type="button" className="wheels-close" onClick={onClose}>
        Done
      </button>
    </div>
  );
}
