import { useEffect, useRef } from "react";

type Props = {
  hue: number;
  precision: number;
  visible: boolean;
};

export function HueRibbon({ hue, precision, visible }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !visible) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const span = Math.max(24, precision * 18);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const hh = hue - span / 2 + span * t;
      grad.addColorStop(t, `hsl(${((hh % 360) + 360) % 360} 62% 52%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, [hue, precision, visible]);

  return <canvas ref={ref} className="hue-ribbon" aria-hidden="true" />;
}
