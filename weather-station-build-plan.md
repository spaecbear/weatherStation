# Weather Station: Build Plan (All Phases)

You are building **Weather Station**, a cozy turn-based mobile forecasting game. Each day the player answers 3 yes/no forecast questions at fixed confidence steps, watches the day play out, and gets scored. The goal is the hit of winning a sports bet (commit, sweat, reveal) with no money or gambling.

This file covers every phase. **Work one phase at a time.** When asked to start a phase:
1. Read this whole file first so earlier work fits later phases.
2. Build only that phase.
3. Run tests, show results, and stop. Summarize what was built and any decisions made.
4. Do not start the next phase until asked.

If anything here conflicts with what already exists in the repo, stop and ask.

---

## Project-Wide Rules

### Stack
- TypeScript, strict mode
- Expo (React Native) app, portrait, mobile first
- Engine lives in `/src/engine` as pure TypeScript with no React or Expo imports
- Vitest for engine tests
- Seedable PRNG written in-house (mulberry32 or sfc32)
- Local storage via `expo-sqlite` or `AsyncStorage` (choose in Phase 3 and explain)

### Principles
- **Honest odds.** Scoring must reward stating true belief. Never fake near-misses or tilt outcomes.
- **Deterministic.** Same seed always produces the same day, signals, and outcomes.
- **Engine first.** UI only reads engine output. No game logic in components.
- **Config, not magic numbers.** All tunable values live in `/src/engine/config.ts`.
- **Cozy.** No timers pressuring the player. Idle players can never be pushed into retirement.

### Folder Layout (target by the end)
```
/src
  /engine
    config.ts       all tunable numbers
    rng.ts          seedable PRNG + helpers
    types.ts
    weather.ts      hidden daily state + true probabilities
    signals.ts      noisy readings of hidden state
    questions.ts    3 questions per day
    scoring.ts      Brier rep, bonuses, trickle
    rating.ts       rating, decay, retirement
    day.ts          generate -> forecast -> resolve -> score
    career.ts       career state, succession     (Phase 3+)
    progression.ts  equipment, journal, calibration (Phase 4)
    town.ts         clients, rival, seasons, events (Phase 5)
  /app              Expo screens
  /components
  /storage          save/load
  /assets
/tests
/scripts
  sim.ts
```

---

## Phase 1: Core Engine

Pure logic. No UI.

### 1.1 Seeded RNG
- `dailySeed(dateUtc: "YYYY-MM-DD")` returns a seed.
- Helpers: uniform, gaussian, pick, shuffle.

### 1.2 Hidden Weather State
Per day: pressure trend, humidity, front strength, front arrival hour, temperature baseline, wind speed, upper winds, season.
- Values vary by season within sensible ranges.
- True probabilities come from logistic functions of the state, for example:
  `P(rain) = 1 / (1 + exp(-(w1*humidity + w2*front - w3*pressureTrend + b)))`
- Weights live in `config.ts`.
- True probabilities should spread across roughly 5% to 95%, not cluster at 50%.

### 1.3 Signals
Each source reads one hidden variable plus Gaussian noise.

| Source | Reads | Noise | Unlocked at start |
|---|---|---|---|
| barometer | pressure trend | low | yes |
| hygrometer | humidity | low | yes |
| skyReading | front strength | medium | yes |
| farmersKnee | humidity | high | yes |
| cowsLyingDown | nothing (pure noise) | very high | yes |
| upstreamRadio | front arrival | low | no |
| weatherBalloon | upper winds | low | no |

`getSignals(day, unlockedSources)` returns only unlocked readings.

### 1.4 Questions
- Exactly 3 yes/no questions per day.
- Types: `rainToday`, `rainBeforeNoon`, `highAbove(threshold)`, `windAbove(threshold)`, `fogAtDawn`.
- No duplicate types in one day.
- Each carries its true probability (hidden from the player).

### 1.5 Forecast Input
Allowed steps: `0.1, 0.3, 0.5, 0.7, 0.9`. Reject anything else.

### 1.6 Resolution
- Roll each question against its true probability with the day's seed.
- Return the outcome plus a `closeness` value (0 to 1, how near the state was to flipping) for near-miss animations later.
- Also return a simple hourly timeline (6am to 9pm) of cloud cover, rain, temperature, and wind consistent with the outcomes. Phase 2 animates this.

### 1.7 Scoring
Per question:
```
brier = 1 - (p - o)^2
rep   = round(100 * (brier - 0.75))
```

| Call | Right | Wrong |
|---|---|---|
| 0.5 | 0 | 0 |
| 0.7 / 0.3 | +16 | -24 |
| 0.9 / 0.1 | +24 | -56 |

- **Perfect day bonus:** all 3 calls on the correct side, none at 0.5. +10 base, +10 per 0.9 or 0.1 call.
- **Participation trickle:** +2 per submitted forecast, career mode only.
- **Max day:** +114.

### 1.8 Rating
- Range 0 to 1000, start 500, clamp to range.
- Decay floor 300. Retirement at 150 or below.
- Decay: 1 grace day free, then -5 per missed day.
- Decay applies only above 300 and never takes rating below 300. Below 300, no decay.
- `applyDecay(rating, lastPlayedDate, today)` computes decay on return. No background timers.
- `isRetired(rating)`.

### 1.9 Modes
`mode: "daily" | "career" | "zen"`
- daily: scored, no rating change, no trickle
- career: rating, trickle, decay, retirement
- zen: scored, nothing persisted

### 1.10 Simulation
`npm run sim` plays 10,000 days with three bots and prints average rep per day:
- **oracle:** step closest to true probability
- **coward:** always 0.5
- **gambler:** always 0.9/0.1 on the more likely side

Expected: oracle > coward > gambler. If not, report it and suggest weight changes. Do not silently change scoring.
Also print a histogram of true probabilities.

### Phase 1 Tests
- Same seed gives identical days.
- Scoring table exact for every step.
- Perfect day bonus correct for 0 to 3 bold calls, blocked by any 0.5.
- Max day = 114 in career.
- Decay: grace day, floor at 300, no decay below 300, never causes retirement.
- Retirement at exactly 150.
- Invalid steps rejected.

### Phase 1 Done When
Tests pass, sim output shown, README explains tuning weights.

---

## Phase 2: Playable Prototype

One full day, playable on a phone, placeholder art.

### Screens
1. **Station screen:** today's signals as simple cards (icon, label, reading). Tap a card for a one-line explanation.
2. **Forecast screen:** 3 question cards. Each has a 5-step selector (10/30/50/70/90). Under each, a live stake preview: "If yes: +16. If no: -24." A total best-case/worst-case line at the bottom. Submit button locks the forecast.
3. **Day playback:** animate the hourly timeline from 1.6 over 30 to 60 seconds. Simple shapes are fine: sky color, cloud blobs, rain particles, a thermometer, a wind sock. When a question's deciding hour approaches, slow time down and highlight that question. Use `closeness` to linger longer on near-misses.
4. **Verdict screen:** each question shows call, outcome, rep change. Perfect day bonus gets a celebration moment. Show a debrief line per question naming the signal that mattered most.

### Rules
- No back button once the forecast is submitted.
- Playback can be skipped after the first full watch of that day.
- Use a fixed dev seed plus a "new random day" button for testing.

### Phase 2 Done When
A full day plays start to finish on a phone simulator, and the stake preview matches engine scoring exactly.

---

## Phase 3: Modes and Saving

### Daily Forecast
- Seed from the date. Pick and document UTC or local reset (default: UTC, flag in summary).
- One attempt per day. Locked after submit.
- Streak counter.
- **Share card:** text output for the clipboard, for example:
  ```
  Weather Station #142
  ☁️🌧️☀️ 3/3 Perfect Forecast
  Bold calls: 2
  ```
  No spoilers of the calls themselves.

### Career Mode
- Persistent save: rating, last played date, forecaster name, day count, history of results.
- Apply decay on app open.
- Retirement check after every scored day.
- **Succession:** on retirement, show a farewell screen, add the forecaster to the history wall, start a new apprentice at 500. Keep the folklore journal and history wall. Reset equipment, money, and client trust (stub these until Phase 4/5).
- Hardcore toggle at career start: full wipe on retirement, journal included.
- Decay messaging through town talk, not numbers.

### Zen Mode
- Unlimited random days, scoring shown, nothing saved.

### Main Menu
Daily, Career, Zen, History Wall.

### Phase 3 Done When
All three modes work, saves survive app restart, and decay plus succession are tested with a mocked clock.

---

## Phase 4: Progression

### Money
A separate currency from rep, earned per day in career mode (rep gain scaled, with a floor so bad days still pay a little). Values in `config.ts`.

### Equipment
| Item | Effect |
|---|---|
| Rain gauge upgrade | Lowers hygrometer noise |
| Upstream radio | Unlocks upstreamRadio signal |
| Weather balloon | Unlocks weatherBalloon signal |
| Radar | New signal for front arrival; small chance to break on stormy days, repair costs money |

Shop screen in the office.

### Folklore Journal
- Every folk signal (farmersKnee, cowsLyingDown, plus 4 to 6 new ones like swallows flying low, red sky at morning) has a hidden true reliability.
- Each day the journal records whether the sign agreed with the outcome.
- After enough samples, show a reliability rating: Unknown, Nonsense, Hunch, Decent, Trusty.
- Persists through succession.

### Calibration Chart
For each step (10/30/50/70/90), show how often the event actually happened when you picked it. Simple bar chart. Needs at least 10 samples per step before showing a bar.

### Phase 4 Done When
Upgrades change signals measurably in the sim, the journal converges on the true reliabilities in tests, and the calibration chart renders.

---

## Phase 5: Town and Story

### Clients
| Client | Question bias | Twist |
|---|---|---|
| Farmer | Frost, rain timing | Steady pay |
| Fishing fleet | Wind, storms | Higher stakes, misses cost more trust |
| Wedding planner | All-day sun, precision | Big payout, big drama on a miss |
| County fair | Once a year, 3 hard questions | Season climax |
| Ski lodge | Snow, powder days | Winter only, bonuses |
| Diner skeptic | Any | Public chalkboard of your record |

- Each client has a trust level. Clients occasionally post a contract that replaces one of the day's questions.
- Trust affects pay and unlocks short dialogue scenes.

### Seasons
Four seasons with different weather distributions and a signature event each (first frost, summer festival, monsoon onset, first snow). Long-range seasonal calls made in the first week resolve at season's end.

### Long-Shot Events
Rare outcomes (first snow to the day, double rainbow, aurora night, the hundred-year storm). Calling one correctly triggers a celebration and a newspaper headline screen.

### Rival
A TV meteorologist from the city makes his own calls each day (a decent but imperfect bot). The diner chalkboard tracks you vs him for the season.

### Story Threads
- The old forecaster's notebook: pages unlock at rating and day milestones.
- The Great Picnic Disaster: pieced together through townsfolk dialogue.
- Climax: the hundred-year storm, forecast against the rival.

### Phase 5 Done When
A full in-game year is playable with clients, seasons, rival, and at least one story beat per season.

---

## Phase 6: Art, Sound, Polish

- 16-bit pixel art: town view with weather rolling over the ridge, office, TV broadcast segment, diner chalkboard.
- Replace placeholder playback with pixel-art weather.
- Sound: wind rising, distant thunder, rain on the roof, a calm daily theme, a building cue during slowdowns.
- Tune slow-reveal timing so the deciding moment always lands.
- Haptics on the reveal and the perfect day.
- Onboarding: a short first day with the old forecaster's notebook explaining signals and steps.
- Accessibility: text size, color-blind-safe weather icons, reduced motion option.

### Phase 6 Done When
A new player can install, get through onboarding, and finish a week in career mode without needing outside explanation.

---

## Open Questions (ask before deciding)
- Daily reset: UTC or local midnight?
- Does the trickle apply when all 3 calls are 50%?
- How many signals to show per day before upgrades?
- Final game name (Weather Station is a working title).
