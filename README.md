# Weather Station

A cozy, turn-based forecasting game. See `Weather Station Design Doc.pdf` and `weather-station-build-plan.md`.

**Status: Phases 1–3 complete, plus an early 16-bit art pass.** The engine is pure TypeScript in `src/engine`; the Expo app is in `src/app`.

```bash
npm install
npm test          # vitest
npm run typecheck
npm run sim       # 10,000-day bot simulation (optional: npm run sim -- 50000)
```

## Engine layout

| File | Purpose |
|---|---|
| `config.ts` | Every tunable number (scoring, rating, season ranges, logistic weights, signal noise) |
| `rng.ts` | mulberry32 PRNG, `dailySeed(date)`, `subSeed`, uniform/gaussian/pick/shuffle |
| `weather.ts` | Hidden daily state + true probability per event |
| `signals.ts` | Noisy readings, `getSignals(day, unlockedSources)` |
| `questions.ts` | 3 distinct yes/no questions per day |
| `scoring.ts` | Brier rep, stake preview, perfect-day bonus, trickle |
| `rating.ts` | Clamp, decay on return, retirement |
| `day.ts` | `generateDay` / `generateDailyDay` → `resolveDay` → `playDay`, mode rules |

Determinism: every random draw comes from a sub-seed of the day seed (`subSeed(seed, "signal:barometer")`, `"roll:rain"`, …), so a signal never shifts when another source is unlocked, and a replayed day resolves the same way.

Units are imperial (°F, mph) to match the design doc's "Will the high top 60°F?".

## Tuning weights (`src/engine/config.ts`)

True probabilities are logistic functions of the hidden state. In `WEIGHTS`, features are centered (e.g. `humidity - humidityCenter`), so with `bias = 0` an average day sits near 50%.

- **Bigger weights → more extreme probabilities.** The days are easier to read and bold calls are safer. Smaller weights pull everything toward 50%.
- **`spread`** (for `high`, `wind` and `rainBeforeNoon`) is the logistic scale in °F, mph or hours. A bigger spread gives fuzzier, more uncertain days.
- **`thresholdJitterSd`** sets how far question thresholds wander from the seasonal norm. Thresholds are centered on the *season*, not the day's hidden value, so the question text leaks nothing about the day.
- **`bias` / `seasonBias`** shift the base rate (e.g. fog is more common in autumn).
- **`SEASON_PARAMS`** holds the (mean, sd) of each hidden variable per season.
- **`SOURCES[*].noiseSd`** is each signal's reliability. Lower means more trustworthy.

Workflow: change a weight, run `npm run sim`, and check:
1. The histogram is spread across ~5–95% rather than piled at the ends or the middle.
2. The per-type means and in-range shares look sensible.
3. The bot ranking (see below).

The resolution is calibrated by construction (`u < p` with a seeded uniform), and a test checks that outcome frequency matches the mean true probability.

### Current sim result (10,000 days)

| Bot | Avg rep/day | From calls | From perfect bonus |
|---|---|---|---|
| oracle (nearest step) | 27.7 | 21.5 | 6.2 |
| coward (always 50%) | 0.0 | 0.0 | 0.0 |
| gambler (always 90/10) | 24.7 | 8.5 | 16.2 |

Oracle > gambler holds: honest play wins. **Coward > gambler does not hold.** The per-question Brier rule is proper, but the perfect-day bonus is not. It pays the gambler 16 rep/day because it gets all three sides right on ~41% of days. Once true probabilities are genuinely spread out (as 1.2 requires), plain bold calls on the likely side are also mildly positive (+8.5/day). Scoring was **not** changed. Options for the designer:
- Shrink the bonus (e.g. +5 base, +5 per bold call). This roughly halves the gambler's bonus income.
- Pay the per-bold bonus only when that bold call was also the oracle step, i.e. the true odds were ≥ 80% (not observable to the player, so probably not).
- Accept it: the gambler still loses to honest play, and coward > gambler may only be achievable with probabilities clustered near 50%, which conflicts with the 5–95% spread goal.

## Phase 2: playable prototype

```bash
npm run web       # Expo in the browser (use phone-size devtools)
npm start         # Expo dev server (scan with Expo Go / open a simulator)
```

The flow is: Station (signal cards, tap for an explanation) → Forecast (5-step selectors with live stakes and best/worst line) → Day playback → Verdict (rep per question, perfect-day celebration, debrief line).

- The screens live in `src/app` and only render engine output. Pacing (`playbackSchedule`, `decidingHour`), stake numbers (`stakePreview`, `forecastBounds`) and the debrief (`debriefQuestion`) are engine functions with tests.
- Playback runs 30–60 s. Hours near a question's deciding moment slow down, and the deciding hour lingers longer the closer the roll was to flipping (`PLAYBACK` in `config.ts`).
- You can't go back once you submit; Android's hardware back button is blocked too. Skip appears only after you've watched that day once ("Watch again").
- The app starts on the fixed dev seed `20261123`; "New random day (dev)" rolls a fresh one. The prototype scores in career mode, so the +2 trickle shows.

## Phase 3: modes and saving

- **Menu:** Daily, Career, Zen, History Wall.
- **Daily** (`engine/daily.ts`): the seed and the reset both use the **UTC date** (#1 = 2026-01-01). There's one attempt per day: the calls are saved the moment you lock in, before playback, and the result is recomputed from the seed whenever it's needed. A streak survives until you miss a whole UTC day. The share card shows the weather emoji grid, x/3, "Perfect Forecast" and the number of bold calls, never the calls themselves.
- **Career** (`engine/career.ts`): the save holds the forecaster, rating anchor, last played date, day history and history wall.
  - Decay is computed on open from `ratingAtLastPlay` + `lastPlayedDate`, so reopening the app never double-charges.
  - Decay appears as town talk, not numbers.
  - Retirement is checked after every scored day. On succession, the retiree goes up on the history wall and an apprentice starts at 500. The journal and the wall are kept; equipment, money and client trust are reset (stubs until Phase 4/5).
  - Hardcore wipes the whole save.
  - Career days are deterministic: `subSeed(seedBase, "career:<generation>:<day>")`. Seasons change every 28 career days.
- **Zen:** endless random days with nothing saved.
- **Storage** (`src/storage`): AsyncStorage holds two versioned JSON blobs, `ws.career.v1` and `ws.daily.v1`. A corrupt or old save loads as empty instead of crashing. I chose AsyncStorage over SQLite because the data is small, always read whole, and written once per day, so a relational store adds nothing.
- **Mocked clock:** the engine takes `today` as an argument everywhere, and the tests use fixed dates. In the app, `?today=YYYY-MM-DD` (web) or the menu's "Dev +1 day" button shifts "today".

## Art: 16-bit, slate storm theme

- **Palette and type:** a slate storm-cloud palette (`src/app/theme.ts`). Press Start 2P for headings and buttons; VT323 for body text.
- **UI chrome:** square, bevelled panels with hard drop shadows (`Panel` in `components/ui.tsx`).
- **Pixel art:** all of it is ASCII in `components/pixelArt.ts` (signal and menu icons, clouds, sun, bolt, houses, the station and the windsock). `Sprite` draws it as run-length-encoded Views, so no image assets or SVG library are needed.
- **The weather scene** (`components/Sky.tsx`) is drawn on a logical pixel grid:
  - a banded sky that shifts with dawn, midday, dusk and storms
  - drifting clouds, slanted rain, and lightning flashes on heavy-rain days
  - fog bands
  - a ridge and the town, with windows that light up at dusk or in a storm
  - the station windsock, which goes limp, half or full with the wind
  - a pixel thermometer
