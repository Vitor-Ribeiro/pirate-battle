import { useMatchSubmission } from '../../api/useMatchSubmission';
import type { MatchResult } from '../../game/core/types';

interface Props { result: MatchResult; onPlayAgain: () => void; onMainMenu: () => void }

const MESSAGE = {
  saving: 'Saving your match…',
  saved: 'Match saved to the ranking and history.',
  pending: 'Could not save the match yet. It is stored on this device and will be retried.',
} as const;

export function ResultScreen({ result, onPlayAgain, onMainMenu }: Props) {
  const { status, retry } = useMatchSubmission(result);
  return (
    <main className="screen">
      <h1>Result</h1>
      <div className="card">
        <p data-testid="result-score">Score: {result.score}</p>
        <p>Time played: {Math.round(result.durationMs / 1000)}s</p>
        <p>Ended by: {result.endReason === 'time_up' ? 'Time is up' : 'Ship destroyed'}</p>
        <p role="status" data-testid="submit-status">{MESSAGE[status]}</p>
        {status === 'pending' && <button onClick={retry}>Retry saving</button>}{' '}
        {/* Starting another match never waits for the request: the record is already in the pending queue. */}
        <button onClick={onPlayAgain}>Play Again</button> <button onClick={onMainMenu}>Main Menu</button>
      </div>
    </main>
  );
}
