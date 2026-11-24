import { PROB_CLAMP, SEASONS, SEASON_PARAMS, WEIGHTS, type Season } from "./config";
import { gaussian, type Rng } from "./rng";
import type { HiddenState } from "./types";

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const logit = (p: number): number => Math.log(p / (1 - p));
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const clampProb = (p: number): number => clamp(p, PROB_CLAMP[0], PROB_CLAMP[1]);

/** Northern-hemisphere meteorological seasons from a YYYY-MM-DD date. */
export function seasonForDate(dateUtc: string): Season {
  const month = Number(dateUtc.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function seasonForIndex(i: number): Season {
  return SEASONS[((i % 4) + 4) % 4]!;
}

export function generateState(rng: Rng, season: Season): HiddenState {
  const sp = SEASON_PARAMS[season];
  const g = (r: [number, number]) => gaussian(rng, r[0], r[1]);
  return {
    season,
    pressureTrend: clamp(g(sp.pressureTrend), -4, 4),
    humidity: clamp(g(sp.humidity), 0.1, 1),
    frontStrength: clamp(g(sp.frontStrength), 0, 1),
    frontArrivalHour: clamp(gaussian(rng, 13, 5), 0, 30),
    tempBaseline: g(sp.tempBaseline),
    windSpeed: Math.max(0, g(sp.windSpeed)),
    upperWinds: Math.max(0, g(sp.upperWinds)),
  };
}

export function pRain(s: HiddenState): number {
  const w = WEIGHTS.rain;
  return clampProb(
    sigmoid(
      w.humidity * (s.humidity - w.humidityCenter) +
        w.front * (s.frontStrength - w.frontCenter) -
        w.pressureTrend * s.pressureTrend +
        w.bias,
    ),
  );
}

/** Always ≤ P(rain today), so the two questions can never contradict. */
export function pRainBeforeNoon(s: HiddenState): number {
  const w = WEIGHTS.rainBeforeNoon;
  return clampProb(pRain(s) * sigmoid((w.noonHour - s.frontArrivalHour) / w.spread));
}

export function expectedHigh(s: HiddenState): number {
  return s.tempBaseline - WEIGHTS.high.frontCooling * s.frontStrength;
}

export function pHighAbove(s: HiddenState, threshold: number): number {
  return clampProb(sigmoid((expectedHigh(s) - threshold) / WEIGHTS.high.spread));
}

export function expectedPeakWind(s: HiddenState): number {
  const w = WEIGHTS.wind;
  return s.windSpeed + w.upperCoupling * s.upperWinds + w.frontBoost * s.frontStrength;
}

export function pWindAbove(s: HiddenState, threshold: number): number {
  return clampProb(sigmoid((expectedPeakWind(s) - threshold) / WEIGHTS.wind.spread));
}

export function pFogAtDawn(s: HiddenState): number {
  const w = WEIGHTS.fog;
  return clampProb(
    sigmoid(
      w.humidity * (s.humidity - w.humidityCenter) -
        w.wind * (s.windSpeed - w.windCenter) +
        w.pressureTrend * s.pressureTrend +
        w.bias +
        w.seasonBias[s.season],
    ),
  );
}

// ---- Phase 5 question types. Compound events are products of independent rolls,
// so the stated probability is exactly the chance the resolution produces. ----

/** Frost at dawn ⇔ the dawn low (high − dawnLowOffset) is at or below freezing. */
export const FROST_HIGH = 32 + 9; // °F high that gives a 32°F dawn (TIMELINE.dawnLowOffset = 9)
export const SNOW_HIGH = 36; // precipitation falls as snow when the high stays below this

export const pFrostAtDawn = (s: HiddenState) => clampProb(1 - pHighAbove(s, FROST_HIGH));
export const pSnowToday = (s: HiddenState) => clampProb(pRain(s) * (1 - pHighAbove(s, SNOW_HIGH)));
export const pAllDaySun = (s: HiddenState) => clampProb((1 - pRain(s)) * (1 - pFogAtDawn(s)));

export const LONG_SHOT = {
  rainbowMax: 0.25, // chance of a double rainbow after rain on a broken-cloud day
  auroraBase: 0.02,
  auroraClear: 0.12, // extra chance on a dry, clear winter night
  stormWind: 40, // mph peak wind that, with rain, makes it "the hundred-year storm"
};

/** Chance of a double rainbow given that it rains. */
export const rainbowGivenRain = (s: HiddenState) => LONG_SHOT.rainbowMax * (1 - s.frontStrength);
export const pDoubleRainbow = (s: HiddenState) => pRain(s) * rainbowGivenRain(s);
export const pAuroraNight = (s: HiddenState) =>
  s.season === "winter" || s.season === "autumn" ? LONG_SHOT.auroraBase + LONG_SHOT.auroraClear * (1 - s.humidity) : 0.01;
export const pHundredYearStorm = (s: HiddenState) => pRain(s) * pWindAbove(s, LONG_SHOT.stormWind);
