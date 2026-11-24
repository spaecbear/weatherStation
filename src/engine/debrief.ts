import { SEASON_PARAMS, SOURCES, WEIGHTS, type HiddenVar, type SourceId } from "./config";
import type { Day, Question, QuestionResolution } from "./types";

type Var = Exclude<HiddenVar, "none"> | "tempBaseline" | "windSpeed";

/** Signed logit contribution of each hidden variable to a question (positive pushes toward "yes"). */
export function contributions(q: Question, day: Day): Partial<Record<Var, number>> {
  const s = day.state;
  const sp = SEASON_PARAMS[s.season];
  const r = WEIGHTS.rain;
  const rain = {
    humidity: r.humidity * (s.humidity - r.humidityCenter),
    frontStrength: r.front * (s.frontStrength - r.frontCenter),
    pressureTrend: -r.pressureTrend * s.pressureTrend,
  };
  switch (q.type) {
    case "rainToday":
      return rain;
    case "rainBeforeNoon":
      return { ...rain, frontArrivalHour: (WEIGHTS.rainBeforeNoon.noonHour - s.frontArrivalHour) / WEIGHTS.rainBeforeNoon.spread };
    case "highAbove": {
      const w = WEIGHTS.high;
      return {
        tempBaseline: (s.tempBaseline - sp.tempBaseline[0]) / w.spread,
        frontStrength: (-w.frontCooling * (s.frontStrength - sp.frontStrength[0])) / w.spread,
      };
    }
    case "windAbove": {
      const w = WEIGHTS.wind;
      return {
        windSpeed: (s.windSpeed - sp.windSpeed[0]) / w.spread,
        upperWinds: (w.upperCoupling * (s.upperWinds - sp.upperWinds[0])) / w.spread,
        frontStrength: (w.frontBoost * (s.frontStrength - sp.frontStrength[0])) / w.spread,
      };
    }
    case "fogAtDawn": {
      const f = WEIGHTS.fog;
      return {
        humidity: f.humidity * (s.humidity - f.humidityCenter),
        windSpeed: -f.wind * (s.windSpeed - f.windCenter),
        pressureTrend: f.pressureTrend * s.pressureTrend,
      };
    }
  }
}

const VAR_NAMES: Record<Var, string> = {
  humidity: "humidity",
  frontStrength: "the incoming front",
  pressureTrend: "the pressure trend",
  frontArrivalHour: "the front's timing",
  upperWinds: "winds aloft",
  tempBaseline: "the air mass warmth",
  windSpeed: "surface wind",
  rainChance: "the feel of the air",
};

export interface Debrief {
  questionId: string;
  variable: Var;
  /** Best source the player had for that variable, or null if none unlocked. */
  source: SourceId | null;
  /** Best source in the game for it, even if locked (upgrade tease). */
  bestSource: SourceId | null;
  pushedTowardYes: boolean;
  line: string;
}

function bestSourceFor(v: Var, among: readonly SourceId[]): SourceId | null {
  const c = among.filter((id) => SOURCES[id].reads === v && !SOURCES[id].folk).sort((a, b) => SOURCES[a].noiseSd - SOURCES[b].noiseSd);
  return c[0] ?? null;
}

export function debriefQuestion(q: Question, day: Day, res: QuestionResolution, unlocked: readonly SourceId[]): Debrief {
  const entries = Object.entries(contributions(q, day)) as [Var, number][];
  const [variable, value] = entries.reduce((best, e) => (Math.abs(e[1]) > Math.abs(best[1]) ? e : best));
  const source = bestSourceFor(variable, unlocked);
  const bestSource = bestSourceFor(variable, Object.keys(SOURCES) as SourceId[]);
  const pushedTowardYes = value > 0;
  const agreed = pushedTowardYes === res.outcome;
  const name = VAR_NAMES[variable];
  let line: string;
  if (source) {
    const toward = pushedTowardYes ? "yes" : "no";
    line = agreed
      ? `The ${SOURCES[source].label.toLowerCase()} told the story: ${name} pointed to ${toward}.`
      : `The ${SOURCES[source].label.toLowerCase()} showed ${name} pointing to ${toward}, but the sky had other ideas.`;
  } else if (bestSource) {
    line = `It came down to ${name}. The ${SOURCES[bestSource].label.toLowerCase()} would have shown it.`;
  } else {
    line = `It came down to ${name}, which no instrument at the station reads. Sometimes the sky just decides.`;
  }
  return { questionId: q.id, variable, source, bestSource, pushedTowardYes, line };
}
