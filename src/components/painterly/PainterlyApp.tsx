import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Camera } from "lucide-react";
import { capturePaintChip } from "@/lib/capture";
import {
  DEFAULT_HSL,
  type Hsl,
  hslToCss,
  hslToHex,
  isLight,
  nameColor,
  pickSuggestion,
  precisionLabel,
} from "@/lib/color";
import { usePaintStore } from "@/lib/paint-store";
import { useStageGestures } from "@/hooks/use-stage-gestures";
import { ColorWheels } from "@/components/painterly/ColorWheels";
import { HueRibbon } from "@/components/painterly/HueRibbon";
import { SaveSheet, type ChipDraft } from "@/components/painterly/SaveSheet";
import { SwatchBox } from "@/components/painterly/SwatchBox";
import { Welcome } from "@/components/painterly/Welcome";
import { cn } from "@/lib/utils";

function applyChrome(stage: HTMLElement, color: Hsl) {
  const light = isLight(color);
  const chrome = light ? "#1c1916" : "#f4efe6";
  const muted = light ? "rgba(28,25,22,0.62)" : "rgba(244,239,230,0.62)";
  const border = light ? "rgba(28,25,22,0.72)" : "rgba(244,239,230,0.78)";
  const fill = light ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.10)";
  stage.style.setProperty("--color-stage", hslToCss(color));
  stage.style.setProperty("--color-chrome", chrome);
  stage.style.setProperty("--color-chrome-muted", muted);
  stage.style.setProperty("--color-glass-border", border);
  stage.style.setProperty("--color-glass-fill", fill);
  stage.style.backgroundColor = hslToCss(color);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", hslToHex(color));
}

export function PainterlyApp() {
  const stageRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<Hsl>(DEFAULT_HSL);
  const nameRef = useRef<HTMLSpanElement>(null);
  const hexRef = useRef<HTMLSpanElement>(null);
  const flipTimer = useRef<number | null>(null);

  const left = usePaintStore((s) => s.left);
  const right = usePaintStore((s) => s.right);
  const precision = usePaintStore((s) => s.precision);
  const wheelOpen = usePaintStore((s) => s.wheelOpen);
  const welcomed = usePaintStore((s) => s.welcomed);
  const hydrated = usePaintStore((s) => s.hydrated);
  const toast = usePaintStore((s) => s.toast);

  const [view, setView] = useState<Hsl>(DEFAULT_HSL);
  const [ribbon, setRibbon] = useState(false);
  const [shutter, setShutter] = useState(false);
  const [readoutDim, setReadoutDim] = useState(false);
  const [draft, setDraft] = useState<ChipDraft | null>(null);

  const paintLive = useCallback((color: Hsl) => {
    liveRef.current = color;
    const stage = stageRef.current;
    if (stage) applyChrome(stage, color);
    if (nameRef.current) nameRef.current.textContent = nameColor(color);
    if (hexRef.current) hexRef.current.textContent = hslToHex(color);
    setView(color);
    setReadoutDim(false);
  }, []);

  const commitHsl = useCallback(
    (color: Hsl) => {
      paintLive(color);
      usePaintStore.getState().setHsl(color);
    },
    [paintLive],
  );

  useEffect(() => {
    usePaintStore.getState().hydrate();
    paintLive(usePaintStore.getState().hsl);
  }, [paintLive]);

  useEffect(() => {
    if (readoutDim) return;
    const id = window.setTimeout(() => setReadoutDim(true), 2200);
    return () => window.clearTimeout(id);
  }, [view, readoutDim]);

  const onFlick = useCallback(() => {
    const next = pickSuggestion(liveRef.current);
    const stage = stageRef.current;
    if (stage) {
      stage.classList.add("is-flipping");
      if (flipTimer.current) window.clearTimeout(flipTimer.current);
      flipTimer.current = window.setTimeout(() => {
        stage.classList.remove("is-flipping");
      }, 300);
    }
    commitHsl(next);
    if (navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {
        /* ignore */
      }
    }
  }, [commitHsl]);

  const gesturesOn = hydrated && welcomed && !wheelOpen && !draft;

  useStageGestures({
    stageRef,
    enabled: gesturesOn,
    getHsl: () => liveRef.current,
    setHslLive: paintLive,
    commitHsl,
    getPrecision: () => usePaintStore.getState().precision,
    setPrecision: (n) => usePaintStore.getState().setPrecision(n),
    onFlick,
    onHold: () => usePaintStore.getState().setWheelOpen(true),
    onRibbon: setRibbon,
  });

  const onCapture = async (e: PointerEvent<HTMLButtonElement> | MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!welcomed) return;
    setShutter(true);
    window.setTimeout(() => setShutter(false), 90);
    try {
      const current = liveRef.current;
      const file = await capturePaintChip({
        current,
        left: usePaintStore.getState().left,
        right: usePaintStore.getState().right,
      });
      const url = URL.createObjectURL(file);
      setDraft({
        file,
        url,
        name: nameColor(current),
        hex: hslToHex(current),
      });
    } catch {
      usePaintStore.getState().flash("Could not save chip");
    }
  };

  const closeDraft = () => {
    setDraft((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(hslToHex(liveRef.current));
      usePaintStore.getState().flash("Hex copied");
    } catch {
      usePaintStore.getState().flash(hslToHex(liveRef.current));
    }
  };

  return (
    <div
      ref={stageRef}
      className="stage"
      data-testid="painterly-stage"
      tabIndex={welcomed ? 0 : -1}
      role="application"
      aria-label="Painterly color stage"
    >
      <h1 className="sr-only">Painterly</h1>

      <div {...(!welcomed || draft ? { inert: true } : {})}>
        <div className="chrome-top">
          <SwatchBox
            side="left"
            color={left}
            onSave={() => usePaintStore.getState().saveSlot("left")}
            onSwap={() => {
              usePaintStore.getState().swapSlot("left");
              paintLive(usePaintStore.getState().hsl);
            }}
            onClear={() => usePaintStore.getState().clearSlot("left")}
          />
          <button
            type="button"
            className="camera-btn"
            data-testid="camera-btn"
            aria-label="Save a paint chip of this color"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onCapture}
          >
            <Camera className="camera-icon" strokeWidth={1.6} />
          </button>
          <SwatchBox
            side="right"
            color={right}
            onSave={() => usePaintStore.getState().saveSlot("right")}
            onSwap={() => {
              usePaintStore.getState().swapSlot("right");
              paintLive(usePaintStore.getState().hsl);
            }}
            onClear={() => usePaintStore.getState().clearSlot("right")}
          />
        </div>

        {ribbon && !wheelOpen ? (
          <>
            <HueRibbon hue={view.h} precision={precision} visible />
            <p className="precision-label is-on">{precisionLabel(precision)}</p>
          </>
        ) : null}

        <div className={cn("readout", readoutDim && "is-dim")}>
          <button type="button" className="readout-hit" onClick={copyHex} aria-label="Copy hex value">
            <span ref={nameRef} className="readout-name" data-testid="color-name">
              {nameColor(view)}
            </span>
            <span ref={hexRef} className="readout-hex" data-testid="color-hex">
              {hslToHex(view)}
            </span>
          </button>
        </div>
      </div>

      <div className={cn("toast", toast && "is-on")} role="status">
        {toast}
      </div>

      <div className={cn("shutter", shutter && "is-on")} />

      {wheelOpen ? (
        <ColorWheels
          color={view}
          onChange={(c) => paintLive(c)}
          onClose={() => {
            commitHsl(liveRef.current);
            usePaintStore.getState().setWheelOpen(false);
          }}
        />
      ) : null}

      {draft ? <SaveSheet draft={draft} onClose={closeDraft} /> : null}

      {!welcomed ? (
        <Welcome onBegin={() => usePaintStore.getState().dismissWelcome()} />
      ) : null}
    </div>
  );
}
