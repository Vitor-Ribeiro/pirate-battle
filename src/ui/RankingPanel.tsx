import { useState } from 'react';
import { useRankingQuery } from '../api/queries';
import { configKey, type UserOptions } from '../game/config/gameConfig';
import { Pager } from './Pager';

const PAGE_SIZE = 10;

export function RankingPanel({ options }: { options: UserOptions }) {
  const [page, setPage] = useState(1);
  const key = configKey(options);
  const q = useRankingQuery({ page, pageSize: PAGE_SIZE, configKey: key });

  return (
    <section aria-labelledby="ranking-title" data-testid="ranking-panel">
      <h2 id="ranking-title">Ranking</h2>
      <p className="muted">Matches with {options.sessionSec}s sessions and a {options.spawnIntervalSec}s spawn interval.</p>
      {q.isPending && <p role="status">Loading ranking…</p>}
      {q.isError && (
        <p role="alert">
          Could not load the ranking. <button onClick={() => void q.refetch()}>Try again</button>
        </p>
      )}
      {q.data && q.data.items.length === 0 && <p>No matches yet. Play one to enter the ranking.</p>}
      {q.data && q.data.items.length > 0 && (
        <>
          <table>
            <caption className="sr-only">Ranking by score</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Player</th><th scope="col">Score</th></tr></thead>
            <tbody>
              {q.data.items.map((r) => (
                <tr key={r.id}><td>{r.rank}</td><td>{r.playerName}</td><td>{r.score}</td></tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} total={q.data.total} pageSize={PAGE_SIZE} onPage={setPage} busy={q.isFetching} />
          {q.isFetching && <p role="status" className="muted">Updating…</p>}
          {q.isError && <p className="muted">Showing the last loaded data.</p>}
        </>
      )}
    </section>
  );
}
