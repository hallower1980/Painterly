import { useEffect, useRef, type SyntheticEvent } from "react";
import { CircleDot, Maximize2, MoveHorizontal, Square, Zap } from "lucide-react";

type Props = {
  onBegin: () => void;
};

export function Welcome({ onBegin }: Props) {
  const beginRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    beginRef.current?.focus();
  }, []);

  const trap = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="welcome"
      data-testid="welcome"
      role="dialog"
      aria-modal="true"
      aria-labelledby="painterly-title"
      onPointerDown={trap}
      onPointerMove={trap}
      onPointerUp={trap}
      onClick={trap}
      onWheel={trap}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") e.preventDefault();
      }}
    >
      <div className="welcome-inner">
        <p className="welcome-kicker stagger-item">Offline color studio</p>
        <h1 id="painterly-title" className="welcome-title stagger-item">
          Painterly
        </h1>
        <p className="welcome-lede stagger-item">
          Hold the screen to a wall or a chair. The color fills the glass so you can see it in the room,
          not in a menu.
        </p>
        <ul className="welcome-list stagger-item">
          <li className="welcome-item">
            <MoveHorizontal aria-hidden="true" strokeWidth={1.6} />
            <div>
              <strong>Slow swipe</strong>
              <span> — walk hue left and right, lightness up and down.</span>
            </div>
          </li>
          <li className="welcome-item">
            <Zap aria-hidden="true" strokeWidth={1.6} />
            <div>
              <strong>Flick</strong>
              <span> — a new paint suggestion.</span>
            </div>
          </li>
          <li className="welcome-item">
            <CircleDot aria-hidden="true" strokeWidth={1.6} />
            <div>
              <strong>Hold</strong>
              <span> — open the color wheels, including the complement.</span>
            </div>
          </li>
          <li className="welcome-item">
            <Maximize2 aria-hidden="true" strokeWidth={1.6} />
            <div>
              <strong>Pinch</strong>
              <span> — zoom the spectrum for finer hue steps.</span>
            </div>
          </li>
          <li className="welcome-item">
            <Square aria-hidden="true" strokeWidth={1.6} />
            <div>
              <strong>The squares</strong>
              <span> — double-tap to keep a color, tap to swap, hold two seconds to clear.</span>
            </div>
          </li>
        </ul>
        <button
          ref={beginRef}
          type="button"
          className="welcome-begin stagger-item"
          data-testid="welcome-begin"
          onClick={(e) => {
            e.stopPropagation();
            onBegin();
          }}
        >
          Begin
        </button>
        <p className="welcome-note stagger-item">
          The camera saves a paint chip to this device. Everything stays with you.
        </p>
      </div>
    </div>
  );
}
