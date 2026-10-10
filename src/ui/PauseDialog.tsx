import { useEffect, useRef, type KeyboardEvent } from 'react';

interface Props { onResume: () => void; onExit: () => void }

export function PauseDialog({ onResume, onExit }: Props) {
  const resumeRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    resumeRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const trapTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const first = resumeRef.current;
    const last = exitRef.current;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  };

  return (
    <div className="overlay" onKeyDown={trapTab}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <h2 id="pause-title">Paused</h2>
        <p>The simulation is suspended. Press Resume to continue.</p>
        <button ref={resumeRef} onClick={onResume}>Resume</button>{' '}
        <button ref={exitRef} onClick={onExit}>Main Menu</button>
      </div>
    </div>
  );
}
