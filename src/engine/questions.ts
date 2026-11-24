import { SEASON_PARAMS, WEIGHTS, type Season } from "./config";
import { gaussian, mulberry32, shuffle, subSeed } from "./rng";
import type { HiddenState, Question, QuestionType } from "./types";
import {
  LONG_SHOT, pAllDaySun, pAuroraNight, pDoubleRainbow, pFogAtDawn, pFrostAtDawn, pHighAbove, pHundredYearStorm, pRain,
  pRainBeforeNoon, pSnowToday, pWindAbove,
} from "./weather";

export const QUESTION_TYPES: QuestionType[] = [
  "rainToday", "rainBeforeNoon", "highAbove", "windAbove", "fogAtDawn", "frostAtDawn", "snowToday", "allDaySun",
  "doubleRainbow", "auroraNight", "hundredYearStorm",
];
export const LONG_SHOT_TYPES: QuestionType[] = ["doubleRainbow", "auroraNight", "hundredYearStorm"];
export const QUESTIONS_PER_DAY = 3;

/** Everyday questions by season. Each pool only holds questions that can go either way that season. */
export const QUESTION_POOLS: Record<Season, QuestionType[]> = {
  spring: ["rainToday", "rainBeforeNoon", "highAbove", "windAbove", "fogAtDawn", "frostAtDawn"],
  summer: ["rainToday", "rainBeforeNoon", "highAbove", "windAbove", "fogAtDawn", "allDaySun"],
  autumn: ["rainToday", "rainBeforeNoon", "highAbove", "windAbove", "fogAtDawn", "frostAtDawn"],
  winter: ["rainToday", "highAbove", "windAbove", "fogAtDawn", "frostAtDawn", "snowToday"],
};

const q = (type: QuestionType, text: string, p: number, threshold?: number): Question =>
  threshold === undefined ? { id: type, type, text, trueProbability: p } : { id: type, type, threshold, text, trueProbability: p };

export function makeQuestion(type: QuestionType, state: HiddenState, threshold?: number): Question {
  switch (type) {
    case "rainToday":
      return q(type, "Will it rain today?", pRain(state));
    case "rainBeforeNoon":
      return q(type, "Will rain start before noon?", pRainBeforeNoon(state));
    case "fogAtDawn":
      return q(type, "Will there be fog at dawn?", pFogAtDawn(state));
    case "highAbove": {
      const t = threshold ?? 0;
      return q(type, `Will the high top ${t}°F?`, pHighAbove(state, t), t);
    }
    case "windAbove": {
      const t = threshold ?? 0;
      return q(type, `Will winds top ${t} mph?`, pWindAbove(state, t), t);
    }
    case "frostAtDawn":
      return q(type, "Will there be frost at dawn?", pFrostAtDawn(state));
    case "snowToday":
      return q(type, "Will it snow today?", pSnowToday(state));
    case "allDaySun":
      return q(type, "Will it stay dry and clear all day?", pAllDaySun(state));
    case "doubleRainbow":
      return { ...q(type, "Will there be a double rainbow?", pDoubleRainbow(state)), longShot: true };
    case "auroraNight":
      return { ...q(type, "Will the northern lights show tonight?", pAuroraNight(state)), longShot: true };
    case "hundredYearStorm":
      return { ...q(type, `Will the big storm hit: rain and ${LONG_SHOT.stormWind}+ mph winds?`, pHundredYearStorm(state)), longShot: true };
  }
}

/** Seasonal normal high and peak wind, used to place thresholds without leaking the day's hidden state. */
export function seasonNorms(season: Season) {
  const sp = SEASON_PARAMS[season];
  return {
    high: sp.tempBaseline[0] - WEIGHTS.high.frontCooling * sp.frontStrength[0],
    wind: sp.windSpeed[0] + WEIGHTS.wind.upperCoupling * sp.upperWinds[0] + WEIGHTS.wind.frontBoost * sp.frontStrength[0],
  };
}

/** A question of `type` with a threshold drawn around the seasonal norm (offset lets clients ask about gales). */
export function questionFor(type: QuestionType, state: HiddenState, rng: () => number, windOffset = 0): Question {
  const norm = seasonNorms(state.season);
  if (type === "highAbove") return makeQuestion(type, state, Math.round(gaussian(rng, norm.high, WEIGHTS.high.thresholdJitterSd)));
  if (type === "windAbove") return makeQuestion(type, state, Math.max(3, Math.round(gaussian(rng, norm.wind + windOffset, WEIGHTS.wind.thresholdJitterSd))));
  return makeQuestion(type, state);
}

/**
 * Thresholds are drawn around the *seasonal* norm, not the day's hidden
 * expectation, so the threshold itself leaks nothing beyond the season.
 */
export function generateQuestions(seed: number, state: HiddenState): Question[] {
  const rng = mulberry32(subSeed(seed, "questions"));
  const types = shuffle(rng, QUESTION_POOLS[state.season]).slice(0, QUESTIONS_PER_DAY);
  return types.map((type) => questionFor(type, state, rng));
}
