import { type Hsl, hslToCss, hslToHex, isLight, nameColor } from "@/lib/color";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function paintChip(
  ctx: CanvasRenderingContext2D,
  color: Hsl,
  x: number,
  y: number,
  size: number,
  border: string,
) {
  ctx.save();
  roundRect(ctx, x, y, size, size, 14);
  ctx.fillStyle = hslToCss(color);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

export async function capturePaintChip(opts: {
  current: Hsl;
  left: Hsl | null;
  right: Hsl | null;
}): Promise<File> {
  const width = 1080;
  const height = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  await Promise.race([
    document.fonts.ready.catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
  ]);

  const ink = "#1C1916";
  const linen = "#F4EFE6";
  const fg = isLight(opts.current) ? ink : linen;
  const glass = isLight(opts.current) ? "rgba(28,25,22,0.55)" : "rgba(244,239,230,0.7)";

  ctx.fillStyle = hslToCss(opts.current);
  ctx.fillRect(0, 0, width, height);

  if (opts.left) paintChip(ctx, opts.left, 72, 96, 96, glass);
  if (opts.right) paintChip(ctx, opts.right, width - 168, 96, 96, glass);

  const name = nameColor(opts.current);
  const hex = hslToHex(opts.current);

  ctx.fillStyle = fg;
  ctx.shadowColor = isLight(opts.current) ? "rgba(244,239,230,0.35)" : "rgba(28,25,22,0.35)";
  ctx.shadowBlur = 18;
  ctx.textAlign = "center";

  ctx.font = "500 72px 'Fraunces Variable', 'Times New Roman', serif";
  ctx.fillText(name, width / 2, height - 260);

  ctx.shadowBlur = 0;
  ctx.font = "500 28px 'Outfit Variable', 'Segoe UI', sans-serif";
  ctx.fillText(hex, width / 2, height - 196);

  ctx.globalAlpha = 0.62;
  ctx.font = "500 24px 'Fraunces Variable', 'Times New Roman', serif";
  ctx.fillText("PAINTERLY", width / 2, height - 120);
  ctx.globalAlpha = 1;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode chip"))), "image/png");
  });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "color";
  return new File([blob], `painterly-${slug}-${hex.slice(1)}.png`, { type: "image/png" });
}

export function canShareFile(file: File) {
  const payload = { files: [file] };
  return typeof navigator.canShare === "function" && navigator.canShare(payload);
}

function downloadAnchor(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function saveToDevice(file: File): Promise<"downloaded"> {
  downloadAnchor(file);
  return "downloaded";
}

export async function shareChip(file: File, title: string, text: string) {
  const payload = { files: [file], title, text };
  if (typeof navigator.share !== "function") return "unavailable" as const;
  try {
    await navigator.share(payload);
    return "shared" as const;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
    downloadAnchor(file);
    return "downloaded" as const;
  }
}
