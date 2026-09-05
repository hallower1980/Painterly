import { useEffect } from "react";
import { Download, Share2 } from "lucide-react";
import { canShareFile, saveToDevice, shareChip } from "@/lib/capture";
import { usePaintStore } from "@/lib/paint-store";

export type ChipDraft = {
  file: File;
  url: string;
  name: string;
  hex: string;
};

type Props = {
  draft: ChipDraft;
  onClose: () => void;
};

export function SaveSheet({ draft, onClose }: Props) {
  const flash = usePaintStore((s) => s.flash);
  const shareable = (() => {
    try {
      return canShareFile(draft.file);
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSave = async () => {
    try {
      await saveToDevice(draft.file);
      flash("Saved to device");
      onClose();
    } catch {
      flash("Could not save chip");
    }
  };

  const onShare = async () => {
    const result = await shareChip(draft.file, draft.name, draft.hex);
    if (result === "shared") {
      flash("Chip shared");
      onClose();
    } else if (result === "downloaded") {
      flash("Saved to device");
      onClose();
    }
  };

  return (
    <div
      className="save-sheet"
      data-testid="save-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-sheet-title"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="save-card">
        <img className="save-preview" src={draft.url} alt={`${draft.name} ${draft.hex}`} />
        <h2 id="save-sheet-title" className="save-title">
          {draft.name}
        </h2>
        <p className="save-hex">{draft.hex}</p>
        <div className="save-actions">
          <button type="button" className="save-primary" data-testid="save-to-device" onClick={onSave}>
            <Download strokeWidth={1.75} aria-hidden="true" />
            Save to device
          </button>
          {shareable ? (
            <button type="button" className="save-secondary" data-testid="share-chip" onClick={onShare}>
              <Share2 strokeWidth={1.75} aria-hidden="true" />
              Share
            </button>
          ) : null}
          <button type="button" className="save-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
