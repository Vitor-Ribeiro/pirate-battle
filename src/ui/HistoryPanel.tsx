import { useState } from 'react';
import { useHistoryQuery } from '../api/queries';
import { getPlayer } from '../state/player';
import { Pager } from './Pager';

const PAGE_SIZE = 10;
const REASON = { time_up: 'Time is up', player_destroyed: 'Ship destroyed' } as const;

export function HistoryPanel() {
  const [page, setPage] = useState(1);
  const q = useHistoryQuery({ page, pageSize: PAGE_SIZE, playerId: getPlayer().id });

  return (
    <section aria-labelledby="history-title" data-testid="history-panel">
      <h2 id="history-title">Match History</h2>
      {q.isPending && <p role="status">Loading history…</p>}
      {q.isError && (
        <p role="alert">
          Could not load your history. <button onClick={() => void q.refetch()}>Try again</button>
        </p>
      )}
      {q.data && q.data.items.length === 0 && <p>You have no recorded matches yet.</p>}
      {q.data && q.data.items.length > 0 && (
        <>
          <table>
            <caption className="sr-only">Your matches</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Duration</th><th scope="col">Ended by</th></tr></thead>
            <tbody>
              {q.data.items.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.playedAt).toLocaleString()}</td>
                  <td>{r.score}</td>
                  <td>{Math.round(r.durationMs / 1000)}s</td>
                  <td>{REASON[r.endReason]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} total={q.data.total} pageSize={PAGE_SIZE} onPage={setPage} busy={q.isFetching} />
          {q.isFetching && <p role="status" className="muted">Updating…</p>}
        </>
      )}
    </section>
  );
}
