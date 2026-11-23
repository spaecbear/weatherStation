# Weather Station

A cozy, turn-based forecasting game. See `Weather Station Design Doc.pdf` and `weather-station-build-plan.md`.

**Status: Phase 1 (core engine) complete.** Pure TypeScript in `src/engine`, no UI yet.

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
