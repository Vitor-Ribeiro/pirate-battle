import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createSessionConfig, type UserOptions } from '../../game/config/gameConfig';
import type { MatchResult } from '../../game/core/types';
import { GameHost } from '../../game/GameHost';
import { hudStore } from '../../state/hudStore';
import { Hud } from '../Hud';
import { PauseDialog } from '../PauseDialog';
import { TouchControls } from '../TouchControls';

interface Props {
  options: UserOptions;
  onFinish: (result: MatchResult) => void;
  onExit: () => void;
}

export function MatchScreen({ options, onFinish, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<GameHost | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const [session] = useState(() => createSessionConfig(options));
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const status = useSyncExternalStore(hudStore.subscribe, () => hudStore.getSnapshot().status);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setError(null);
    setProgress(0);
    const host = new GameHost(el, session, { onEnd: (r) => onFinishRef.current(r), onLoadProgress: setProgress });
    hostRef.current = host;
    host.start().catch((e: unknown) => {
      if (!host.isDisposed) setError(e instanceof Error ? e.message : 'Unknown error');
    });
    return () => {
      host.dispose();
      if (hostRef.current === host) hostRef.current = null;
    };
  }, [session, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        hostRef.current?.togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loading = !error && progress < 1;
  return (
    <>
      <div ref={containerRef} className="arena" data-testid="arena" />
      {!loading && !error && <Hud onPause={() => hostRef.current?.pause()} />}
      {!loading && !error && <TouchControls getHost={() => hostRef.current} />}
      {loading && (
        <div className="overlay" role="status">
          <div className="card">
            <p>Loading assets…</p>
            <progress value={progress} max={1} aria-label="Loading progress" />
          </div>
        </div>
      )}
      {error && (
        <div className="overlay" role="alert">
          <div className="card">
            <p>{error}</p>
            <button onClick={() => setAttempt((n) => n + 1)}>Retry</button> <button onClick={onExit}>Main Menu</button>
          </div>
        </div>
      )}
      {status === 'paused' && <PauseDialog onResume={() => hostRef.current?.resume()} onExit={onExit} />}
    </>
  );
}
