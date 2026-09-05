import { create } from "zustand";
import {
  DEFAULT_HSL,
  DEFAULT_PRECISION,
  type Hsl,
  clamp,
  MAX_PRECISION,
  MIN_PRECISION,
} from "@/lib/color";

const STORAGE_KEY = "painterly.v1";

export type Slot = Hsl | null;
type Side = "left" | "right";

type Persisted = {
  hsl: Hsl;
  left: Slot;
  right: Slot;
  precision: number;
};

type PaintState = {
  hsl: Hsl;
  left: Slot;
  right: Slot;
  precision: number;
  wheelOpen: boolean;
  welcomed: boolean;
  hydrated: boolean;
  toast: string | null;
  setHsl: (hsl: Hsl) => void;
  setPrecision: (n: number) => void;
  setWheelOpen: (open: boolean) => void;
  dismissWelcome: () => void;
  hydrate: () => void;
  flash: (message: string) => void;
  saveSlot: (side: Side) => void;
  swapSlot: (side: Side) => void;
  clearSlot: (side: Side) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function persistSlice(state: PaintState) {
  const body: Persisted = {
    hsl: state.hsl,
    left: state.left,
    right: state.right,
    precision: state.precision,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(body));
  } catch {
    /* private mode */
  }
}

function readPersisted(): Partial<Persisted> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Persisted;
  } catch {
    return null;
  }
}

function isHsl(v: unknown): v is Hsl {
  if (!v || typeof v !== "object") return false;
  const o = v as Hsl;
  return typeof o.h === "number" && typeof o.s === "number" && typeof o.l === "number";
}

export const usePaintStore = create<PaintState>((set, get) => ({
  hsl: DEFAULT_HSL,
  left: null,
  right: null,
  precision: DEFAULT_PRECISION,
  wheelOpen: false,
  welcomed: false,
  hydrated: false,
  toast: null,

  setHsl: (hsl) => {
    set({ hsl });
    persistSlice(get());
  },
  setPrecision: (n) => {
    set({ precision: clamp(n, MIN_PRECISION, MAX_PRECISION) });
    persistSlice(get());
  },
  setWheelOpen: (open) => set({ wheelOpen: open }),
  dismissWelcome: () => {
    set({ welcomed: true });
  },
  hydrate: () => {
    if (get().hydrated) return;
    const saved = readPersisted();
    if (!saved) {
      set({ hydrated: true, welcomed: false });
      return;
    }
    set({
      hsl: isHsl(saved.hsl) ? saved.hsl : DEFAULT_HSL,
      left: isHsl(saved.left) ? saved.left : null,
      right: isHsl(saved.right) ? saved.right : null,
      precision:
        typeof saved.precision === "number"
          ? clamp(saved.precision, MIN_PRECISION, MAX_PRECISION)
          : DEFAULT_PRECISION,
      welcomed: false,
      hydrated: true,
    });
  },
  flash: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: message });
    toastTimer = setTimeout(() => {
      set({ toast: null });
      toastTimer = null;
    }, 1600);
  },
  saveSlot: (side) => {
    const hsl = get().hsl;
    set({ [side]: { ...hsl } });
    persistSlice(get());
    get().flash(side === "left" ? "Kept on the left" : "Kept on the right");
  },
  swapSlot: (side) => {
    const slot = get()[side];
    if (!slot) {
      get().flash("Double-tap to keep this color");
      return;
    }
    const current = get().hsl;
    set({ hsl: slot, [side]: { ...current } });
    persistSlice(get());
  },
  clearSlot: (side) => {
    set({ [side]: null });
    persistSlice(get());
    get().flash("Cleared");
  },
}));
