import { useSyncExternalStore } from 'react';
import { hudStore } from '../state/hudStore';

const ui = (path: string): string => `${import.meta.env.BASE_URL}assets/png/retina/ui/${path}.png`;

export function Hud({ onPause }: { onPause: () => void }) {
  const hud = useSyncExternalStore(hudStore.subscribe, hudStore.getSnapshot);
  const pct = hud.maxHealth > 0 ? Math.max(0, Math.round((hud.health / hud.maxHealth) * 100)) : 0;
  const fill = pct > 50 ? 'green' : pct > 25 ? 'amber' : 'red';
  const time = `${Math.floor(hud.timeLeftSec / 60)}:${String(hud.timeLeftSec % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="hud">
        <div className="hud-health" role="img" aria-label={`Health ${Math.ceil(hud.health)} of ${hud.maxHealth}`} style={{ backgroundImage: `url(${ui('hud/health_frame')})` }}>
          <div className="hud-health-fill">
            <i style={{ width: `${pct}%`, backgroundImage: `url(${ui(`hud/health_fill_${fill}`)})` }} />
          </div>
        </div>
        <div className="hud-right">
          <div className="hud-counter" style={{ backgroundImage: `url(${ui('hud/counter_panel')})` }}>
            <img src={ui('hud/icon_score')} alt="" />
            <span className="sr-only">Score</span>
            <b data-testid="score">{hud.score}</b>
          </div>
          <div className="hud-counter" style={{ backgroundImage: `url(${ui('hud/counter_panel')})` }}>
            <img src={ui('hud/icon_time')} alt="" />
            <span className="sr-only">Time left</span>
            <b data-testid="time">{time}</b>
          </div>
          <button className="round-button hud-pause" aria-label="Pause" onClick={onPause} style={{ backgroundImage: `url(${ui('controls/button_round_normal')})` }}>
            <img src={ui('controls/icon_pause')} alt="" />
          </button>
        </div>
      </div>
      <p className="sr-only" role="status">
        {hud.status === 'paused' ? 'Match paused.' : hud.status === 'ended' ? 'Match ended.' : ''}
      </p>
    </>
  );
}
