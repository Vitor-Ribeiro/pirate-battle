# Pirate Battle

Top-down naval shooter built with React, TypeScript (strict), PixiJS, TanStack Query, Axios, MSW and Playwright.

**Live demo:** https://pirate-battle-green.vercel.app (ranking and match history use mocked APIs, MSW runs in the published build)

> AI usage: this project was built with AI assistance (allowed by the challenge); the author reviews and owns the code.

Documentation: [`ARCHITECTURE.md`](ARCHITECTURE.md) (design decisions), [`docs/performance.md`](docs/performance.md) (profiling evidence), [`docs/CHECKLIST.md`](docs/CHECKLIST.md) (requirements), [`LICENSES.md`](LICENSES.md) (assets).

## Setup

Requirements: Node.js 18 or newer (Vite 5) and npm. Tested on Windows 11 with Chrome.

```bash
git clone https://github.com/Vitor-Ribeiro/pirate-battle.git
cd pirate-battle
npm install                       # also generates public/mockServiceWorker.js (postinstall)
npm run dev                       # http://localhost:5173
```

Production build, as published:

```bash
npm run build
npm run preview                   # http://localhost:4173
```

Tests (first time only: `npx playwright install chromium`):

```bash
npm run typecheck && npm run lint && npm test    # types, lint, unit tests
npm run test:e2e                                 # Playwright, desktop and mobile Chromium
npm run test:e2e:report                          # open the HTML report
```

Copy `.env.example` to `.env` if you need to change the defaults.

| Variable | Default | Meaning |
|---|---|---|
| `VITE_BASE` | `/` | Base path of the deploy |
| `VITE_ENABLE_MSW` | `true` | Mocks also run in the published build |
| `VITE_API_BASE_URL` | `/api` | Axios base URL |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type check and production build |
| `npm run preview` | Serves the build at http://localhost:4173 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright (builds and previews first) |
| `npm run test:e2e:update` | Update visual baselines |
| `npm run test:e2e:report` | Open the HTML report |

The first Playwright run builds the app in e2e mode and takes a few minutes (software WebGL).

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Forward | W / Up | Hold the forward button |
| Rotate | A, D / Left, Right | Left / right buttons |
| Front shot | Space | Front fire button |
| Left / right side shots | Q / E | Side fire buttons |
| Pause | Esc / P (also on blur or tab hidden) | Pause button |

## Gameplay configuration

All balance values are in `src/game/config/gameConfig.ts`. Options screen limits:
session 60 to 180 s, enemy spawn interval 0.5 to 10 s. Each match uses a snapshot of the options taken at start.

## Network scenarios (MSW)

Pick a scenario with `?scenario=<name>` in the URL (for example `/?scenario=slow`) or with `setScenario()`.
Reset the mocks with `resetMocks()` (clears the scenario and the stored mock data).

`success`, `empty` (ranking and history always empty, even if you have played), `many-pages` (60 entries), `slow`, `variable-latency` (60 entries, answers arrive out of order), `timeout`, `server-error` (500), `client-error` (400), `network-error` (connection failure), `ranking-error`,
`history-error`, `submit-timeout-after-commit`, `submit-unavailable`.

The main menu has a scenario selector. To reproduce a failure: pick `ranking-error` (ranking fails, history works),
`history-error` (the opposite), `submit-timeout-after-commit` (server saves the match but the client times out; the retry
reuses the same id and no duplicate appears), `submit-unavailable` (the match stays in the pending queue and is retried).

## E2E, visual baselines and performance

- `npm run test:e2e` builds with `--mode e2e` (`.env.e2e`), which exposes a deterministic test API (`window.__pb`) and a fixed seed.
- Generate baselines once with `npm run test:e2e:update`, review the images, and commit them. Baselines depend on the OS: generate and run on the same one.
- Performance: open the game with `?perf`; samples go to `localStorage` (`pirate-battle:perf:v1`). `PERF=1 npm run test:e2e` runs the perf specs. Record results in `docs/performance.md`.

## Deploy

Vercel/Netlify: build `npm run build`, output `dist`. Set `VITE_BASE` if not served from `/`. Commit `public/mockServiceWorker.js`
(mocks run in the published build with `VITE_ENABLE_MSW=true`).

## Project structure

```
src/
  app/            providers (TanStack Query)
  api/            contracts, Axios client, queries, pending-match queue
  game/
    config/       typed gameplay configuration
    core/         pure simulation (no PixiJS, no React)
    input/        keyboard and touch
    render/       asset loading, Pixi scene
    audio/        Web Audio sound effects
    GameHost.ts   glue: Pixi app, ticker, simulation, lifecycle
  mocks/          MSW handlers, scenarios, fixtures, local db
  state/          options, HUD store, player identity
  ui/             React screens and HUD
e2e/              Playwright tests
docs/             checklist and performance evidence
```

See `ARCHITECTURE.md` for design decisions.
