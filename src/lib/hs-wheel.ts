let cache: HTMLCanvasElement | null = null;

export function getHsWheelCanvas(size: number) {
  const dpr = Math.min(2, typeof window === "undefined" ? 1 : window.devicePixelRatio || 1);
  const px = Math.round(size * dpr);
  if (cache && cache.width === px) return cache;

  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const r = px / 2;
  const image = ctx.createImageData(px, px);
  const data = image.data;
  for (let y = 0; y < px; y += 1) {
    for (let x = 0; x < px; x += 1) {
      const dx = x - r;
      const dy = y - r;
      const dist = Math.hypot(dx, dy) / r;
      const i = (y * px + x) * 4;
      if (dist > 1) {
        data[i + 3] = 0;
        continue;
      }
      const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      const h = ((hue % 360) + 360) % 360;
      const s = dist;
      const l = 0.5;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hp = h / 60;
      const x2 = c * (1 - Math.abs((hp % 2) - 1));
      let rr = 0,
        gg = 0,
        bb = 0;
      if (hp < 1) [rr, gg, bb] = [c, x2, 0];
      else if (hp < 2) [rr, gg, bb] = [x2, c, 0];
      else if (hp < 3) [rr, gg, bb] = [0, c, x2];
      else if (hp < 4) [rr, gg, bb] = [0, x2, c];
      else if (hp < 5) [rr, gg, bb] = [x2, 0, c];
      else [rr, gg, bb] = [c, 0, x2];
      const m = l - c / 2;
      data[i] = Math.round((rr + m) * 255);
      data[i + 1] = Math.round((gg + m) * 255);
      data[i + 2] = Math.round((bb + m) * 255);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  cache = canvas;
  return canvas;
}

export function pickFromWheel(x: number, y: number, size: number) {
  const r = size / 2;
  const dx = x - r;
  const dy = y - r;
  const dist = Math.min(1, Math.hypot(dx, dy) / r);
  const hue = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { h: ((hue % 360) + 360) % 360, s: dist };
}
