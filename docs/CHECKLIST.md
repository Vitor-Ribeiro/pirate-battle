Legend: `[x]` done and verified, `[~]` implemented (unit-tested or written) but not yet verified in a browser, `[ ]` not done.

# Requirement checklist (challenge sections 2 to 11)

Mark each item when it is implemented AND covered by a test or evidence.

## Gameplay
- [~] Move forward and rotate; front shot; side shots (3 parallel projectiles per side); simultaneous movement and fire
- [~] Arena limits and at least one island blocking ships and projectiles
- [~] Chaser (chases, damages on collision, explodes) and Shooter (approaches, fires in range)
- [~] Spawn interval; safe spawn points far from player and islands
- [~] Projectiles: direction, speed, damage once, removed on hit/obstacle/expiry/out of arena; weapon cooldowns
- [~] Score: +1 per enemy destroyed by the player; Chaser self-destruct does not score
- [~] End by time or death; end stops everything; restart resets everything
- [~] Health bars above ships; HUD with score and time
- [~] Manual pause and auto pause (blur / hidden tab); resume needs player action; no accumulated input
- [~] Shot effects, explosions, visual damage by health

## Screens and settings
- [~] Main menu (Play, Options, controls, Ranking and Match History tabs)
- [~] Options with validation and persistence
- [~] Result screen (score, time, reason, submit status, Play Again, Main Menu) and persistence of last result
- [ ] Abandoned match is not registered

## PixiJS and architecture
- [~] Rules / render / input / UI state separated
- [~] Time-based simulation (independent of frame rate)
- [~] No React render per frame
- [~] Asset loading with progress and failure/retry
- [~] Canvas fit + DPR, input coordinates, arena limits
- [~] Cleanup of listeners, ticker, timers, entities, resources; Strict Mode safe

## Ranking and history
- [~] Typed contracts; paginated ranking by score with deterministic tie-break (same configuration)
- [~] Record match once (idempotent); pending queue survives refresh; retry
- [~] TanStack Query: loading, empty, error, background refetch, cache, invalidation, retries
- [~] Late responses never overwrite newer data
- [~] API failures never block the game

## MSW
- [~] Scenarios: success, empty, many pages, slow, variable latency, timeout, 4xx/5xx, query failures, timeout after commit, unavailable on submit
- [~] Scenario selector and reset; works in the published build; persisted confirmed records

## UI, accessibility
- [~] Desktop and mobile; touch controls; supported orientation documented
- [~] Keyboard navigation, visible focus, dialog focus control, labels, contrast, accessible errors
- [~] Semantic score/time/state; keys captured only during gameplay

## Tests, performance, delivery
- [ ] Playwright E2E (list in section 8), Chromium desktop and mobile, visual regression baselines
- [~] Seeded scenarios and controllable simulation clock
- [ ] Profiling evidence (docs/performance.md)
- [ ] README.md, ARCHITECTURE.md, lockfile, reports
- [ ] Public deploy that matches the code and runs the mocks
