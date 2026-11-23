import { SEASON_PARAMS, WEIGHTS } from "./config";
import { gaussian, mulberry32, shuffle, subSeed } from "./rng";
import type { HiddenState, Question, QuestionType } from "./types";
import { pFogAtDawn, pHighAbove, pRain, pRainBeforeNoon, pWindAbove } from "./weather";

export const QUESTION_TYPES: QuestionType[] = ["rainToday", "rainBeforeNoon", "highAbove", "windAbove", "fogAtDawn"];
export const QUESTIONS_PER_DAY = 3;

export function makeQuestion(type: QuestionType, state: HiddenState, threshold?: number): Question {
  switch (type) {
    case "rainToday":
      return { id: type, type, text: "Will it rain today?", trueProbability: pRain(state) };
    case "rainBeforeNoon":
      return { id: type, type, text: "Will rain start before noon?", trueProbability: pRainBeforeNoon(state) };
    case "fogAtDawn":
      return { id: type, type, text: "Will there be fog at dawn?", trueProbability: pFogAtDawn(state) };
    case "highAbove": {
      const t = threshold ?? 0;
      return { id: type, type, threshold: t, text: `Will the high top ${t}°F?`, trueProbability: pHighAbove(state, t) };
    }
    case "windAbove": {
      const t = threshold ?? 0;
      return { id: type, type, threshold: t, text: `Will winds top ${t} mph?`, trueProbability: pWindAbove(state, t) };
    }
  }
}

/**
 * Thresholds are drawn around the *seasonal* norm, not the day's hidden
 * expectation, so the threshold itself leaks nothing beyond the season.
 */
export function generateQuestions(seed: number, state: HiddenState): Question[] {
  const rng = mulberry32(subSeed(seed, "questions"));
  const types = shuffle(rng, QUESTION_TYPES).slice(0, QUESTIONS_PER_DAY);
  const sp = SEASON_PARAMS[state.season];
  return types.map((type) => {
    if (type === "highAbove") {
      const norm = sp.tempBaseline[0] - WEIGHTS.high.frontCooling * sp.frontStrength[0];
      return makeQuestion(type, state, Math.round(gaussian(rng, norm, WEIGHTS.high.thresholdJitterSd)));
    }
    if (type === "windAbove") {
      const norm = sp.windSpeed[0] + WEIGHTS.wind.upperCoupling * sp.upperWinds[0] + WEIGHTS.wind.frontBoost * sp.frontStrength[0];
      return makeQuestion(type, state, Math.max(3, Math.round(gaussian(rng, norm, WEIGHTS.wind.thresholdJitterSd))));
    }
    return makeQuestion(type, state);
  });
}
