import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Commands } from '../game/core/types';
import type { GameHost } from '../game/GameHost';

const ui = (path: string): string => `${import.meta.env.BASE_URL}assets/png/retina/ui/controls/${path}.png`;

const MOVE: [keyof Commands, string, string][] = [
  ['turnLeft', 'icon_turn_left', 'Turn left'],
  ['forward', 'icon_forward', 'Move forward'],
  ['turnRight', 'icon_turn_right', 'Turn right'],
];
const FIRE: [keyof Commands, string, string][] = [
  ['fireLeft', 'icon_fire_left', 'Fire left side'],
  ['fireFront', 'icon_fire_front', 'Fire front'],
  ['fireRight', 'icon_fire_right', 'Fire right side'],
];

interface ButtonProps { command: keyof Commands; icon: string; label: string; getHost: () => GameHost | null }

function TouchButton({ command, icon, label, getHost }: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: TouchEvent) => e.preventDefault();
    el.addEventListener('touchstart', stop, { passive: false });
    el.addEventListener('touchmove', stop, { passive: false });
    return () => {
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, []);
  const set = (value: boolean) => {
    getHost()?.touch.set(command, value);
    setPressed(value);
  };
  return (
    <button
      ref={ref}
      type="button"
      className="round-button touch-button"
      aria-label={label}
      style={{ backgroundImage: `url(${ui(pressed ? 'button_round_pressed' : 'button_round_normal')})` }}
      onPointerDown={(e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
        }
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <img src={ui(icon)} alt="" draggable={false} />
    </button>
  );
}

export function TouchControls({ getHost }: { getHost: () => GameHost | null }) {
  return (
    <div className="touch-controls">
      <div className="touch-group">
        {MOVE.map(([c, i, l]) => <TouchButton key={c} command={c} icon={i} label={l} getHost={getHost} />)}
      </div>
      <div className="touch-group">
        {FIRE.map(([c, i, l]) => <TouchButton key={c} command={c} icon={i} label={l} getHost={getHost} />)}
      </div>
    </div>
  );
}
