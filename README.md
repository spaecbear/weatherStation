# Weather Station

A cozy, turn-based forecasting game. See `Weather Station Design Doc.pdf` and `weather-station-build-plan.md`.

**Status: Phases 1–6 complete.** The engine is pure TypeScript in `src/engine`; the Expo app is in `src/app`.

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
- **Daily** (`engine/daily.ts`): the seed and the reset both use the player's **local calendar date** (#1 = 2026-01-01), so the day turns over at local midnight. There's one attempt per day: the calls are saved the moment you lock in, before playback, and the result is recomputed from the seed whenever it's needed. A streak survives until you miss a whole UTC day. The share card is spoiler-free: one square per call (🟩 right side, 🟥 wrong side, ⬜ a 50% pass), x/3, "Perfect Forecast" and the number of bold calls. It never shows the weather or the calls.
- **Career** (`engine/career.ts`): the save holds the forecaster, rating anchor, last played date, day history and history wall.
  - Decay is computed on open from `ratingAtLastPlay` + `lastPlayedDate`, so reopening the app never double-charges.
  - Decay appears as town talk, not numbers.
  - Retirement is checked after every scored day. On succession, the retiree goes up on the history wall and an apprentice starts at 500. The journal and the wall are kept; equipment, money and client trust are reset (stubs until Phase 4/5).
  - Hardcore wipes the whole save.
  - Career days are deterministic: `subSeed(seedBase, "career:<generation>:<day>")`. Seasons change every 28 career days.
- **Zen:** endless random days with nothing saved.
- **Storage** (`src/storage`): AsyncStorage holds two versioned JSON blobs, `ws.career.v1` and `ws.daily.v1`. A corrupt or old save loads as empty instead of crashing. I chose AsyncStorage over SQLite because the data is small, always read whole, and written once per day, so a relational store adds nothing.
- **Mocked clock:** the engine takes `today` as an argument everywhere, and the tests use fixed dates. In the app, `?today=YYYY-MM-DD` (web) or the menu's "Dev +1 day" button (dev builds only) shifts "today".

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

## Phase 4: progression

All numbers are in `config.ts` (`EQUIPMENT`, `RADAR`, `MONEY`, `FOLK`, `CAREER.calibrationMin`).

- **Money:** each career day pays `max(5, round(0.5 × day's rep))`. Bad days still pay $5. A good season buys the full kit in about 80–100 days.
- **Equipment** (shop in the office):

  | Item | Price | Effect |
  |---|---|---|
  | Rain gauge upgrade | $120 | Hygrometer noise drops from 0.08 to 0.025 |
  | Upstream radio | $220 | Unlocks the radio |
  | Weather balloon | $260 | Unlocks the balloon |
  | Radar | $450 | Front arrival with 0.4 h noise (radio: 1 h). 20% chance to break on a stormy day (rain + strong front); $60 to repair |

  An upgrade scales the *same* seeded noise draw, so a better instrument reads the same day more accurately.
- **Folk signs:**
  - The farmer's knee and the cows are always shown. Two of five rotating omens appear each day: swallows, morning sky, pine cones, spider webs, frogs.
  - Each reads a hidden variable (or nothing) with its own noise and shows as a yes/no "says rain".
  - Their true reliability is never stored; it emerges from the model (`trueFolkReliability`).
  - Pine cones and swallows sense the day's overall rain odds (`rainChance`), which is the only way an omen can be truly good.
- **Folklore journal:** every career day records whether each omen you saw agreed with "rain today".
  - Tiers, by agreement rate: **Nonsense** <52.5%, **Hunch** <58.5%, **Decent** <64.5%, **Trusty** above that.
  - Because the odds are honest, even a perfect yes/no rain call only agrees ~69% of the time, so Trusty doesn't mean 90%.
  - The journal shows "Unknown" below 20 samples and "early read" below 300.
  - It survives succession and is wiped only in hardcore.
- **Calibration chart:**
  - One bar per step, counting Career and Daily calls. A bar appears after 10 calls at that step.
  - A gold tick shows what you said. Tap a bar for "When you said 70%, it happened 62% of the time." A table row under the axis repeats the numbers.
  - It's kept through succession.

### Do upgrades help? (sim, 10,000 days, signal-reading bot)

`engine/estimate.ts` is a bot that sees only the station's signals. It blends them with the seasonal prior and calls the nearest step.

```
Signal-reading bot by equipment (avg rep/day; per-question avg by type)
loadout            rep/day    windAbove rainBefore  rainToday  highAbove  fogAtDawn
starting kit         13.69         1.18       7.71       4.28       1.18       3.87
+ rain gauge         14.19         1.18       7.81       4.40       1.18       4.29
+ upstream radio     15.23         1.18      10.10       4.28       1.18       3.87
+ weather balloon    14.56         2.22       7.71       4.28       1.18       3.87
+ radar              15.26         1.18      10.13       4.28       1.18       3.87
everything           16.56         2.22      10.14       4.40       1.18       4.29
(oracle ceiling, knows true odds: 27.72 on a different day set)

Folk signs: true agreement with 'rain today' (hidden from the player)
farmersKnee     55.3%  Hunch
cowsLyingDown   49.8%  Nonsense
swallowsLow     61.0%  Decent
redSkyMorning   55.6%  Hunch
pineCones       68.5%  Trusty
spiderWebs      55.6%  Hunch
frogsCroaking   49.9%  Nonsense
```

Each upgrade lifts the question types it should. Radar and radio overlap: radar's extra precision barely helps, because rain timing is already fuzzy at the hour scale. Phase 5's storm events could give radar a distinct job. No instrument reads the temperature baseline, so "high above" questions are stuck near guesswork.

## Phase 5: town and story

Code: `engine/town.ts` (rules), `engine/story.ts` (all story text), and the tunables in `config.ts` (`TOWN`, `CLIENTS`, `SPECIALS`, `RIVAL`).

- **Calendar:** a year is 112 career days: four 28-day seasons, starting in spring. Each season has its own weather ranges and question pool.
  - **Question types:** frost at dawn, snow, and "dry and clear all day" are new. Long shots are double rainbow, northern lights, and the hundred-year storm.
  - **Honest compound odds:** every compound event is built from the same independent rolls (e.g. snow = rain AND a high below 36°F), so its stated probability is exact. A test checks calibration for all 11 types.
- **Clients:**
  - **Who they are:** Farmer Bell, the fishing fleet, Marigold Weddings, the County Fair, Ridgetop Ski Lodge, and Doris at the diner.
  - **Contracts:** on about 40% of ordinary days, a client in season replaces one question with a contract.
  - **Contract pay:** `fee × (0.5 + 0.25 × trust) × (1 + rep/56)`. This is a straight-line function of the Brier score, so honest calls still maximise expected pay, and it never goes negative.
  - **Trust:** 0–5. It moves with the rep earned on the client's question; the fleet and the wedding planner lose more on a miss. Trust 2 and 4 unlock dialogue scenes. Apprentices start at 0.5 trust ("the town is warier").
- **Signature days:**

  | Season | Signature day(s) |
  |---|---|
  | Spring | Monsoon Onset |
  | Summer | Summer Festival; County Fair (3 fair contracts) |
  | Autumn | First Frost Watch |
  | Winter | First Snow Watch; the Hundred-Year Storm (year 1 climax) |

  Each nudges the hidden weather toward the event, but it's still uncertain. Each comes with a scene before the day and a Gazette front page after.
- **Long shots:** on about 5% of ordinary days, a long shot replaces a question. If it happens and you gave it ≥30%, the Gazette celebrates.
- **Long-range calls:** in the first week of each season you can answer "Will it rain on more than K of this season's 28 days?". K sits at the median. The probability is exact: it treats days already played as known and the rest by their true odds. It's scored like any call on the last day of the season.
- **Rival:** Chet Storm, Channel 6. He reads the starting instruments with the same estimator as the sim bot, then pushes his numbers bold for TV (logit × 1.5) and adds a small seeded hunch. Over 30 simulated years he trails a fully equipped signal reader by about 3 rep/day. Doris's chalkboard tracks you vs Chet each season, and every season ends with a chalkboard headline.
- **Story:** the Great Picnic Disaster. It's told through 10 client scenes, 8 pages of Wendell's notebook (unlocked by station days and rating, kept through succession), and the Hundred-Year Storm finale.
- **A test plays a full in-game year** (`tests/town.test.ts`). It checks that:
  - every client posts work and every signature day happens in its season
  - four season calls resolve
  - the chalkboard covers all four seasons
  - each season has at least one story beat
  - the finale lands
- **Weather art:** snow and snow cover, frost rime, a pixel double rainbow and the northern lights are drawn in the playback scene. The menu's title scene follows the real season.

## Phase 6: art, sound, polish

- **Thermometer upgrade** ($300): a max-min thermometer that reads the day's warmth (`tempBaseline`).
  - It's the strongest single instrument: "will the high top" calls rise from about 1.0 to 5.6 rep each, and frost and snow calls improve too.
  - Priced to be a mid-game buy, not the obvious first one.
- **Sound** (`scripts/gen-sounds.ts`, `npm run sounds` → `src/assets/sounds/*.wav`, about 1.3 MB):
  - Every sound is generated in code; there are no third-party assets.
  - What it makes: a calm chiptune theme, looping wind and rain-on-the-roof, distant thunder, a building cue for slowdowns, reveal stings (right side / wrong side / pass), a perfect-day fanfare, and a UI click.
  - `src/app/sound.ts` plays them with `expo-audio`. Wind and rain follow the playback weather. Thunder lands half a second after each lightning flash. The theme pauses while the weather plays.
  - Browsers only allow audio after a tap, so music starts on the first touch.
- **The reveal beat:** time now freezes for 1.2 s on each deciding moment (`PLAYBACK.revealHoldSeconds`). That's when the answer flips, the sting plays and the phone buzzes. Holds are never squeezed by the 30–60 s pacing, and a test checks every reveal gets its beat.
- **Haptics** (`expo-haptics`; does nothing on web): a light tap on each reveal, a heavy one on a miss, and a success buzz on a perfect day.
- **Onboarding:**
  - A new install opens straight into a guided practice day narrated by Wendell's notebook. It covers reading the station, what 10/30/50/70/90 mean and what's at stake, the slowdown, and the verdict.
  - It ends with "Start your career". The first seven office visits each show one more note: standing, money and the shop, folk signs, clients, long-range calls, Chet, and calibration.
  - The guide can be replayed from the menu or Settings.
- **Accessibility** (Settings, saved separately from game saves):
  - Text size: Normal, Large or Largest.
  - Reduced motion: no particles, flashes or bouncing banners; the day still plays.
  - Colour-blind palette: Okabe-Ito blue/orange for good/bad.
  - Sound, music and haptics toggles.
  - Every question has a distinct pixel icon, and good/bad numbers always carry a +/- sign, so nothing depends on colour alone.
- **Art:**
  - A pixel office scene; equipment you buy appears on its wall and desk.
  - Chet's Channel 6 broadcast on a pixel CRT on the career verdict.
  - Question icons throughout.
