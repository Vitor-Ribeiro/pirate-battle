import { delay, http, HttpResponse } from 'msw';
import { compareRanking, type MatchRecord, type Page } from '../api/contracts';
import { createRng } from '../game/core/rng';
import { loadConfirmed, saveConfirmed } from './db';
import { buildFixtures } from './fixtures';
import { getScenario } from './scenarios';

type Route = 'ranking' | 'history' | 'submit';
const rng = createRng(7); // seeded: latency is reproducible

/** Returns a response when the scenario short-circuits the request, or null to continue normally. */
async function applyScenario(route: Route): Promise<Response | null> {
  switch (getScenario()) {
    case 'slow':
      await delay(2500);
      return null;
    case 'variable-latency':
      await delay(100 + Math.floor(rng() * 2500)); // later requests may answer first
      return null;
    case 'timeout':
      await delay('infinite');
      return null;
    case 'client-error':
      return HttpResponse.json({ message: 'Bad request' }, { status: 400 });
    case 'network-error':
      return HttpResponse.error(); // connection failure (no HTTP response)
    case 'server-error':
      return HttpResponse.json({ message: 'Internal error' }, { status: 500 });
    case 'ranking-error':
      return route === 'ranking' ? HttpResponse.json({ message: 'Ranking unavailable' }, { status: 503 }) : null;
    case 'history-error':
      return route === 'history' ? HttpResponse.json({ message: 'History unavailable' }, { status: 503 }) : null;
    case 'submit-unavailable':
      return route === 'submit' ? HttpResponse.json({ message: 'Unavailable' }, { status: 503 }) : null;
    default:
      return null;
  }
}

function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

function numberParam(url: URL, name: string, fallback: number): number {
  const n = Number(url.searchParams.get(name));
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const handlers = [
  http.get('/api/ranking', async ({ request }) => {
    const early = await applyScenario('ranking');
    if (early) return early;
    const url = new URL(request.url);
    const [sessionSec = 120, spawnIntervalSec = 2] = (url.searchParams.get('configKey') ?? '').split('-').map(Number);
    const config = { sessionSec, spawnIntervalSec };
    const scenario = getScenario();
    const fixtures = scenario === 'empty' ? [] : buildFixtures(scenario === 'many-pages' || scenario === 'variable-latency' ? 60 : 12, config);
    const mine = loadConfirmed().filter((r) => r.config.sessionSec === sessionSec && r.config.spawnIntervalSec === spawnIntervalSec);
    const sorted = [...fixtures, ...mine].sort(compareRanking).map((r, i) => ({ ...r, rank: i + 1 }));
    return HttpResponse.json(paginate(sorted, numberParam(url, 'page', 1), numberParam(url, 'pageSize', 10)));
  }),

  http.get('/api/history', async ({ request }) => {
    const early = await applyScenario('history');
    if (early) return early;
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');
    const mine = loadConfirmed()
      .filter((r) => r.playerId === playerId)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt));
    return HttpResponse.json(paginate(mine, numberParam(url, 'page', 1), numberParam(url, 'pageSize', 10)));
  }),

  http.put('/api/matches/:id', async ({ request, params }) => {
    const early = await applyScenario('submit');
    if (early) return early;
    const body = (await request.json()) as MatchRecord;
    const all = loadConfirmed();
    const existing = all.find((r) => r.id === params.id);
    if (existing) return HttpResponse.json(existing, { status: 200 }); // idempotent: no duplicate
    saveConfirmed([...all, body]);
    if (getScenario() === 'submit-timeout-after-commit') await delay('infinite'); // saved, but the client never hears back
    return HttpResponse.json(body, { status: 201 });
  }),
];
