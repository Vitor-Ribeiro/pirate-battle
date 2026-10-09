Legend: `[x]` done and covered by a test, a measurement or a manual check; `[~]` implemented but only partly verified; `[ ]` not done.

# Requirement checklist (challenge sections 2 to 11)

Mark each item when it is implemented AND covered by a test or evidence.

## Gameplay
- [x] Move forward and rotate; front shot; side shots (3 parallel projectiles per side); simultaneous movement and fire
- [x] Arena limits and at least one island blocking ships and projectiles
- [x] Chaser (chases, damages on collision, explodes) and Shooter (approaches, fires in range)
- [x] Spawn interval; safe spawn points far from player and islands
- [x] Projectiles: direction, speed, damage once, removed on hit/obstacle/expiry/out of arena; weapon cooldowns
- [x] Score: +1 per enemy destroyed by the player; Chaser self-destruct does not score
- [x] End by time or death; end stops everything; restart resets everything
- [x] Health bars above ships; HUD with score and time
- [x] Manual pause and auto pause (blur / hidden tab); resume needs player action; no accumulated input
- [x] Shot effects, explosions, visual damage by health

## Screens and settings
- [x] Main menu (Play, Options, controls, Ranking and Match History tabs)
- [x] Options with validation and persistence
- [x] Result screen (score, time, reason, submit status, Play Again, Main Menu) and persistence of last result
- [x] Abandoned match is not registered

## PixiJS and architecture
- [x] Rules / render / input / UI state separated
- [x] Time-based simulation (independent of frame rate)
- [x] No React render per frame
- [x] Asset loading with progress and failure/retry
- [x] Canvas fit + DPR, input coordinates, arena limits
- [x] Cleanup of listeners, ticker, timers, entities, resources; Strict Mode safe

## Ranking and history
- [x] Typed contracts; paginated ranking by score with deterministic tie-break (same configuration)
- [x] Record match once (idempotent); pending queue survives refresh; retry
- [x] TanStack Query: loading, empty, error, background refetch, cache, invalidation, retries
- [x] Late responses never overwrite newer data
- [x] API failures never block the game

## MSW
- [x] Scenarios: success, empty, many pages, slow, variable latency, timeout, 4xx/5xx, query failures, timeout after commit, unavailable on submit
- [x] Scenario selector and reset; works in the published build; persisted confirmed records

## UI, accessibility
- [x] Desktop and mobile; touch controls; supported orientation documented
- [~] Keyboard navigation, visible focus, dialog focus control, labels, contrast, accessible errors (implemented; not audited with a screen reader or a contrast tool)
- [x] Semantic score/time/state; keys captured only during gameplay

## Tests, performance, delivery
- [x] Playwright E2E (list in section 8), Chromium desktop and mobile, visual regression baselines
- [x] Seeded scenarios and controllable simulation clock
- [x] Profiling evidence (docs/performance.md)
- [x] README.md, ARCHITECTURE.md, lockfile, reports
- [x] Public deploy that matches the code and runs the mocks
