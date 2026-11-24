// Phase 5: the town. Career-day assembly (signature days, contracts, long shots),
// the rival, client trust and pay, the diner chalkboard, long-range season calls.
import { CAREER, CLIENTS, RIVAL, SPECIALS, TOWN, type Season, type SpecialId } from "./config";
import { generateDay, resolveDay } from "./day";
import { estimateState, nearestStep } from "./estimate";
import { makeQuestion, QUESTION_POOLS, questionFor } from "./questions";
import { gaussian, mulberry32, pick, subSeed, type Rng } from "./rng";
import { repForCall, scoreDay } from "./scoring";
import { BASE_LOADOUT, getSignals } from "./signals";
import type { ClientId, Day, DayScore, HiddenState, Question, QuestionType, Step } from "./types";
import { logit, pRain, seasonForIndex, sigmoid } from "./weather";

// ---------- Calendar ----------

export interface CalendarDay {
  index: number; // career day index
  year: number; // 1-based
  season: Season;
  seasonIndex: number; // absolute season number from career start
  dayInSeason: number; // 0..27
}

export function calendar(dayIndex: number): CalendarDay {
  const seasonIndex = Math.floor(dayIndex / CAREER.daysPerSeason);
  return {
    index: dayIndex,
    year: Math.floor(dayIndex / TOWN.daysPerYear) + 1,
    season: seasonForIndex(seasonIndex),
    seasonIndex,
    dayInSeason: dayIndex % CAREER.daysPerSeason,
  };
}

export function specialFor(cal: CalendarDay): (typeof SPECIALS)[number] | null {
  return SPECIALS.find((s) => s.season === cal.season && s.day === cal.dayInSeason && (!("firstYearOnly" in s) || cal.year === 1)) ?? null;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Nudge the hidden state toward the signature event's weather (still uncertain). */
function specialState(id: SpecialId, s: HiddenState, rng: Rng): HiddenState {
  switch (id) {
    case "monsoon":
      return { ...s, humidity: clamp01(s.humidity + 0.15), frontStrength: clamp01(s.frontStrength + 0.25), pressureTrend: s.pressureTrend - 1 };
    case "festival":
      return s;
    case "countyFair":
      return s;
    case "firstFrost":
      return { ...s, tempBaseline: gaussian(rng, 45, 3) };
    case "firstSnow":
      return { ...s, tempBaseline: gaussian(rng, 35, 3), humidity: clamp01(s.humidity + 0.12), frontStrength: clamp01(s.frontStrength + 0.2) };
    case "hundredYearStorm":
      return {
        ...s,
        humidity: clamp01(gaussian(rng, 0.8, 0.06)),
        frontStrength: clamp01(gaussian(rng, 0.88, 0.06)),
        pressureTrend: gaussian(rng, -2.6, 0.6),
        windSpeed: Math.max(0, gaussian(rng, 24, 4)),
        upperWinds: Math.max(0, gaussian(rng, 75, 12)),
        frontArrivalHour: gaussian(rng, 13, 2.5),
      };
  }
}

const SPECIAL_QUESTIONS: Record<SpecialId, { type: QuestionType; client?: ClientId; windOffset?: number }[]> = {
  monsoon: [{ type: "rainToday", client: "farmer" }, { type: "rainBeforeNoon" }, { type: "windAbove" }],
  festival: [{ type: "allDaySun", client: "wedding" }, { type: "highAbove" }, { type: "windAbove" }],
  countyFair: [{ type: "rainBeforeNoon", client: "fair" }, { type: "highAbove", client: "fair" }, { type: "windAbove", client: "fair" }],
  firstFrost: [{ type: "frostAtDawn", client: "farmer" }, { type: "fogAtDawn" }, { type: "highAbove" }],
  firstSnow: [{ type: "snowToday", client: "ski" }, { type: "frostAtDawn" }, { type: "windAbove" }],
  hundredYearStorm: [{ type: "hundredYearStorm" }, { type: "windAbove", client: "fleet", windOffset: 14 }, { type: "rainBeforeNoon" }],
};

/** The question that headlines a signature day (decides its newspaper story). */
export const specialKeyQuestion = (id: SpecialId): QuestionType => SPECIAL_QUESTIONS[id][0]!.type;

function contract(q: Question, client: ClientId): Question {
  return { ...q, client, fee: CLIENTS[client].fee };
}

/** Types that make sense to ask this season (pool + all-day sun outside winter). */
const askable = (season: Season): QuestionType[] => [...QUESTION_POOLS[season], ...(season === "winter" ? [] : (["allDaySun"] as QuestionType[]))];

/**
 * Build career day `dayIndex`. Deterministic from (seed, dayIndex): never depends on
 * trust or money, so replays and the rival see exactly the same day.
 */
export function buildCareerDay(seed: number, dayIndex: number): Day {
  const cal = calendar(dayIndex);
  const base = generateDay(seed, cal.season);
  const rng = mulberry32(subSeed(seed, "town"));
  const special = specialFor(cal);

  if (special) {
    const state = specialState(special.id, base.state, rng);
    const questions = SPECIAL_QUESTIONS[special.id].map(({ type, client, windOffset }) => {
      const q = questionFor(type, state, rng, windOffset ?? 0);
      return client ? contract(q, client) : q;
    });
    return { ...base, state, questions, special: special.id };
  }

  const roll = rng();
  if (roll < TOWN.contractChance) {
    const keep = base.questions.slice(0, 2);
    const taken = new Set(keep.map((q) => q.type));
    const clients = (Object.keys(CLIENTS) as ClientId[]).filter((id) => CLIENTS[id].posts && CLIENTS[id].seasons.includes(cal.season));
    const client = pick(rng, clients);
    const options = CLIENTS[client].interests.filter((t) => askable(cal.season).includes(t) && !taken.has(t));
    if (options.length) {
      const q = questionFor(pick(rng, options), base.state, rng, CLIENTS[client].windOffset ?? 0);
      return { ...base, questions: [...keep, contract(q, client)] };
    }
  } else if (roll < TOWN.contractChance + TOWN.longShotChance) {
    const type: QuestionType = cal.season === "winter" ? "auroraNight" : cal.season === "autumn" ? pick(rng, ["auroraNight", "doubleRainbow"] as QuestionType[]) : "doubleRainbow";
    return { ...base, questions: [...base.questions.slice(0, 2), makeQuestion(type, base.state)] };
  }
  return base;
}

// ---------- Rival ----------

/** Chet Storm's calls: a decent read of the starting instruments, pushed bold for TV. */
export function rivalCalls(day: Day): Record<string, Step> {
  const lo = BASE_LOADOUT;
  const est = estimateState(day, getSignals(day, lo.sources, lo.noise));
  const rng = mulberry32(subSeed(day.seed, "rival"));
  return Object.fromEntries(day.questions.map((q) => {
    const p = makeQuestion(q.type, est, q.threshold).trueProbability;
    const bold = sigmoid(RIVAL.boldness * logit(Math.min(0.98, Math.max(0.02, p))));
    return [q.id, nearestStep(clamp01(bold + gaussian(rng, 0, RIVAL.hunchSd)))];
  }));
}

export function rivalScore(day: Day, outcomes: Record<string, boolean>): { calls: Record<string, Step>; score: DayScore } {
  const calls = rivalCalls(day);
  return { calls, score: scoreDay(day.questions, calls, outcomes, "daily") };
}

// ---------- Clients: pay and trust ----------

export type Trust = Record<ClientId, number>;
export const freshTrust = (level: number = TOWN.trustStart): Trust =>
  Object.fromEntries((Object.keys(CLIENTS) as ClientId[]).map((c) => [c, level])) as Trust;

const trustMult = (trust: number) => 0.5 + 0.25 * trust;

/**
 * Contract pay is an affine function of the question's Brier rep, so it keeps the
 * scoring proper: stating your true belief still maximises expected pay. Never negative.
 */
export function contractPay(fee: number, trust: number, rep: number): number {
  return Math.round(fee * trustMult(trust) * (1 + rep / 56));
}

/** Trust moves with the rep you earned on their question; misses hurt more for high-stakes clients. */
export function trustAfter(client: ClientId, trust: number, rep: number): number {
  const delta = (rep / 24) * (rep < 0 ? CLIENTS[client].missMult : 1);
  return Math.min(TOWN.trustMax, Math.max(0, trust + delta));
}

// ---------- Diner chalkboard ----------

export interface Chalkboard { seasonIndex: number; you: number; rival: number; youWins: number; rivalWins: number; ties: number }
export const freshChalk = (seasonIndex: number): Chalkboard => ({ seasonIndex, you: 0, rival: 0, youWins: 0, rivalWins: 0, ties: 0 });

export function chalkAdd(b: Chalkboard, youRep: number, rivalRep: number): Chalkboard {
  return {
    ...b,
    you: b.you + youRep,
    rival: b.rival + rivalRep,
    youWins: b.youWins + (youRep > rivalRep ? 1 : 0),
    rivalWins: b.rivalWins + (rivalRep > youRep ? 1 : 0),
    ties: b.ties + (youRep === rivalRep ? 1 : 0),
  };
}

// ---------- Long-range season call ----------

export interface SeasonCall {
  seasonIndex: number;
  threshold: number; // "more than K rainy days"
  trueProbability: number;
  call: Step | null;
}

/** Exact P(count > k) for independent events with probabilities ps (Poisson binomial). */
export function pMoreThan(ps: number[], k: number): number {
  let dist = [1];
  for (const p of ps) {
    const next = new Array(dist.length + 1).fill(0) as number[];
    dist.forEach((v, i) => { next[i]! += v * (1 - p); next[i + 1]! += v * p; });
    dist = next;
  }
  return dist.slice(k + 1).reduce((a, b) => a + b, 0);
}

/**
 * Offer: "Will it rain on more than K of this season's days?", made on day
 * `fromDay` of the season. Days already played are known outcomes; the rest
 * are uncertain. K is placed at the median, and the probability is exact.
 */
export function seasonCallOffer(dayAt: (i: number) => Day, seasonIndex: number, fromDay: number): SeasonCall {
  const start = seasonIndex * CAREER.daysPerSeason;
  let known = 0;
  for (let i = 0; i < fromDay; i++) known += resolveDay(dayAt(start + i)).events.rains ? 1 : 0;
  const ps = Array.from({ length: CAREER.daysPerSeason - fromDay }, (_, i) => pRain(dayAt(start + fromDay + i).state));
  const pTotalMoreThan = (k: number) => (k < known ? 1 : pMoreThan(ps, k - known));
  let k = 0;
  while (k < CAREER.daysPerSeason && pTotalMoreThan(k) > 0.5) k++;
  const a = Math.max(0, k - 1);
  const threshold = Math.abs(pTotalMoreThan(a) - 0.5) < Math.abs(pTotalMoreThan(k) - 0.5) ? a : k;
  return { seasonIndex, threshold, trueProbability: pTotalMoreThan(threshold), call: null };
}

export function rainyDaysInSeason(dayAt: (i: number) => Day, seasonIndex: number): number {
  const start = seasonIndex * CAREER.daysPerSeason;
  let n = 0;
  for (let i = 0; i < CAREER.daysPerSeason; i++) n += resolveDay(dayAt(start + i)).events.rains ? 1 : 0;
  return n;
}

export function resolveSeasonCall(dayAt: (i: number) => Day, sc: SeasonCall): { rainyDays: number; happened: boolean; rep: number } {
  const rainyDays = rainyDaysInSeason(dayAt, sc.seasonIndex);
  const happened = rainyDays > sc.threshold;
  return { rainyDays, happened, rep: sc.call === null ? 0 : repForCall(sc.call, happened) };
}
