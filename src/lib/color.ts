export type Hsl = { h: number; s: number; l: number };

export const DEFAULT_HSL: Hsl = { h: 18, s: 0.44, l: 0.42 };
export const DEFAULT_PRECISION = 4;
export const MIN_PRECISION = 0.2;
export const MAX_PRECISION = 18;

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function wrapHue(h: number) {
  return ((h % 360) + 360) % 360;
}

export function hslToCss({ h, s, l }: Hsl) {
  return `hsl(${h.toFixed(1)} ${s * 100}% ${l * 100}%)`;
}

export function hslToRgb({ h, s, l }: Hsl): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = wrapHue(h) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function hslToHex(c: Hsl) {
  const [r, g, b] = hslToRgb(c);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function relativeLuminance(c: Hsl) {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hslToRgb(c);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isLight(c: Hsl) {
  return relativeLuminance(c) > 0.55;
}

export function rybComplementHue(h: number) {
  const x = wrapHue(h);
  if (x < 60) return 180 + x * 0.5;
  if (x < 120) return 210 + (x - 60) * 0.5;
  if (x < 180) return 240 + (x - 120);
  if (x < 240) return 0 + (x - 180) * 0.5;
  if (x < 300) return 30 + (x - 240) * 0.5;
  return 60 + (x - 300);
}

export function complement(c: Hsl): Hsl {
  return { h: wrapHue(rybComplementHue(c.h)), s: clamp(c.s * 0.92, 0.18, 0.86), l: clamp(1 - c.l, 0.22, 0.78) };
}

const FAMILIES: { name: string; start: number; end: number }[] = [
  { name: "Rose", start: 345, end: 15 },
  { name: "Terra", start: 18, end: 32 },
  { name: "Coral", start: 15, end: 35 },
  { name: "Amber", start: 35, end: 50 },
  { name: "Gold", start: 50, end: 68 },
  { name: "Lime", start: 68, end: 95 },
  { name: "Moss", start: 95, end: 125 },
  { name: "Sage", start: 125, end: 155 },
  { name: "Teal", start: 155, end: 185 },
  { name: "Sky", start: 185, end: 215 },
  { name: "Indigo", start: 215, end: 250 },
  { name: "Violet", start: 250, end: 285 },
  { name: "Plum", start: 285, end: 320 },
  { name: "Berry", start: 320, end: 345 },
];

function hueFamily(h: number) {
  const x = wrapHue(h);
  const hit = FAMILIES.find((f) => (f.start > f.end ? x >= f.start || x < f.end : x >= f.start && x < f.end));
  return hit?.name ?? "Clay";
}

export function nameColor(c: Hsl) {
  const family = hueFamily(c.h);
  if (c.s < 0.08) {
    if (c.l < 0.18) return "Ink";
    if (c.l < 0.4) return "Charcoal";
    if (c.l < 0.62) return "Stone";
    if (c.l < 0.82) return "Linen";
    return "Chalk";
  }
  const tone =
    c.l < 0.28 ? "Deep " : c.l > 0.72 ? "Pale " : c.s < 0.28 ? "Dusty " : c.s > 0.7 && c.l < 0.55 ? "Rich " : "";
  return `${tone}${family}`.trim();
}

const FAN: Hsl[] = [
  { h: 18, s: 0.44, l: 0.42 },
  { h: 8, s: 0.52, l: 0.46 },
  { h: 28, s: 0.48, l: 0.5 },
  { h: 38, s: 0.4, l: 0.56 },
  { h: 48, s: 0.36, l: 0.62 },
  { h: 72, s: 0.32, l: 0.48 },
  { h: 98, s: 0.28, l: 0.42 },
  { h: 132, s: 0.3, l: 0.4 },
  { h: 162, s: 0.34, l: 0.38 },
  { h: 188, s: 0.36, l: 0.44 },
  { h: 208, s: 0.32, l: 0.4 },
  { h: 228, s: 0.28, l: 0.36 },
  { h: 262, s: 0.26, l: 0.42 },
  { h: 292, s: 0.24, l: 0.4 },
  { h: 328, s: 0.34, l: 0.44 },
  { h: 350, s: 0.4, l: 0.4 },
  { h: 22, s: 0.18, l: 0.62 },
  { h: 200, s: 0.12, l: 0.7 },
  { h: 30, s: 0.55, l: 0.32 },
  { h: 150, s: 0.22, l: 0.28 },
];

export function randomPaint(): Hsl {
  const base = FAN[Math.floor(Math.random() * FAN.length)];
  return {
    h: wrapHue(base.h + (Math.random() - 0.5) * 14),
    s: clamp(base.s + (Math.random() - 0.5) * 0.12, 0.1, 0.78),
    l: clamp(base.l + (Math.random() - 0.5) * 0.1, 0.18, 0.82),
  };
}

export function pickSuggestion(current: Hsl): Hsl {
  let next = randomPaint();
  let n = 0;
  while (Math.abs(wrapHue(next.h - current.h)) < 18 && n < 8) {
    next = randomPaint();
    n += 1;
  }
  return next;
}

export function precisionLabel(p: number) {
  if (p < 1.2) return "Fine";
  if (p < 6) return "Even";
  return "Broad";
}
