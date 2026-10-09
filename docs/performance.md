# Performance evidence

- Hardware / OS: AMD Ryzen 7 5700X3D, 2 x 16 GB DDR4-3200, NVIDIA GeForce RTX 5070 (overclocked), Windows 11
- Browser and version: Google Chrome 154.0.8037.99 (Official Build, 64-bit), WebGL hardware accelerated
- Resolution and device pixel ratio: screen 1920x1080; browser viewport 1276x945 (read after the match); DPR 1
- Display refresh rate: 240 Hz
- Match configuration: session 180 s, spawn interval 0.5 s, player shooting continuously; ended by time
- Build: `npm run build && npm run preview` (production build), opened with `?perf=1`

## Frame rate, p95 frame time and entities

| Metric (3-minute match) | Result |
|---|---|
| Average FPS | 240.0 (capped by the monitor refresh rate) |
| p95 frame time (ms) | 4.3 |
| Max frame time (ms) | 15.7 |
| Max entities (ships + projectiles; visual effects not counted) | 24 |
| Frames recorded / duration | 43,196 frames / 180.0 s |

Source: the in-game recorder (`?perf=1`), read from `localStorage` key `pirate-battle:perf:v1`.

Profiling screenshot: `docs/profiling-devtools.png` (Chrome DevTools Performance, production build at `localhost:4173`, taken in a separate session from the 3-minute measurement). It shows the Frames row expanded with enemies on screen and the Summary for a 24.2 s range:

| Summary category (0 to 24.22 s) | Time (ms) |
|---|---|
| Scripting | 1,319 |
| System | 592 |
| Painting | 291 |
| Rendering | 142 |
| Messaging / Loading | 0 |
| Range total | 24,219 |

Scripting, system, painting and rendering add up to 2,344 ms, about 10% of the range; the rest of the main thread was not busy. INP in the same recording: 13 ms; CLS: 0.

## Memory after 5 cycles (start, play, exit)

Chrome DevTools heap snapshot after forcing garbage collection at the end of each cycle (about 15 s of play per cycle). Measured in a separate session from the 3-minute match.

| Cycle | Heap (MB) |
|---|---|
| 1 | 9.9 |
| 2 | 10.1 |
| 3 | 10.4 |
| 4 | 10.5 |
| 5 | 10.8 |

## Observed limitations

- The JavaScript heap grew about 0.9 MB (9%) between cycles 1 and 5, roughly 0.2 MB per cycle. It was not investigated whether this is a leak or cache accumulation (ranking/history cache, stored matches).
- The measurement covers the JavaScript heap only, not GPU memory or textures.
- The average FPS is capped by the display refresh rate, so it shows headroom but not the maximum the game can reach.
- Measurements were taken on a single high-end desktop. No mobile device or throttled CPU was profiled.
