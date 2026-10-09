import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useFlushPending } from '../../api/useMatchSubmission';
import { loadOptions } from '../../state/optionsStore';
import { loadLastResult } from '../../state/lastResult';
import { HistoryPanel } from '../HistoryPanel';
import { RankingPanel } from '../RankingPanel';
import { ScenarioPicker } from '../ScenarioPicker';

interface Props { onPlay: () => void; onOptions: () => void }

const TABS = ['ranking', 'history'] as const;
type Tab = (typeof TABS)[number];
const LABEL: Record<Tab, string> = { ranking: 'Ranking', history: 'Match History' };

export function MainMenu({ onPlay, onOptions }: Props) {
  const [tab, setTab] = useState<Tab>('ranking');
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ ranking: null, history: null });
  const id = useId();
  const options = loadOptions();
  const last = loadLastResult();
  const { pendingCount, flush, isFlushing } = useFlushPending();

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = TABS[(TABS.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length] as Tab;
    setTab(next);
    refs.current[next]?.focus();
  };

  return (
    <main className="screen">
      <h1>Pirate Battle</h1>
      <div className="card">
        <button onClick={onPlay}>Play</button> <button onClick={onOptions}>Options</button>
        <h2>Controls</h2>
        <p>Keyboard: W / Up = forward, A / D = rotate, Space = front shot, Q / E = side shots, Esc or P = pause.</p>
        <p>Touch: left buttons turn and move, right buttons fire front and sides. You can move and fire at the same time.</p>
        <p className="muted">Mobile: landscape orientation is recommended.</p>
      </div>

      {last && (
        <div className="card" data-testid="last-result">
          <h2>Last match</h2>
          <p>Score {last.score}, {Math.round(last.durationMs / 1000)}s, {last.endReason === 'time_up' ? 'time is up' : 'ship destroyed'}.</p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="card" role="status" data-testid="pending-banner">
          <p>{pendingCount} match{pendingCount > 1 ? 'es' : ''} waiting to be saved.</p>
          <button onClick={flush} disabled={isFlushing}>Retry saving</button>
        </div>
      )}

      <div className="card">
        <div role="tablist" aria-label="Leaderboards" onKeyDown={onKey}>
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => { refs.current[t] = el; }}
              role="tab"
              id={`${id}-${t}`}
              aria-selected={tab === t}
              aria-controls={`${id}-panel`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
            >
              {LABEL[t]}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${tab}`}>
          {tab === 'ranking' ? <RankingPanel options={options} /> : <HistoryPanel />}
        </div>
      </div>

      <ScenarioPicker />
    </main>
  );
}
