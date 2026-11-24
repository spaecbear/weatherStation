import { CAREER, RATING, type EquipmentId } from "./config";
import { generateDay, playDay, type PlayResult } from "./day";
import { applyDecay, applyRep, isRetired, missedDays } from "./rating";
import { mulberry32, pick, subSeed } from "./rng";
import { getSignals, loadoutFor, sourcesForDay, type Loadout } from "./signals";
import { addToCalibration, dayPay, emptyCalibration, radarBreaks, recordJournal, type Calibration, type Journal } from "./progression";
import type { Day, Signal, SourceId, Step } from "./types";
import { seasonForIndex } from "./weather";

export interface DayRecord {
  dayIndex: number;
  date: string;
  calls: Record<string, Step>;
  outcomes: Record<string, boolean>;
  rep: number;
  perfect: boolean;
  ratingAfter: number;
}

export interface Forecaster {
  name: string;
  startedDate: string;
  /** Rating right after the last played day. Decay is always recomputed from this. */
  ratingAtLastPlay: number;
  lastPlayedDate: string;
  dayCount: number;
  peakRating: number;
  perfectDays: number;
  history: DayRecord[];
}

export interface WallEntry {
  name: string;
  generation: number;
  startedDate: string;
  retiredDate: string;
  days: number;
  peakRating: number;
  perfectDays: number;
  howWentOut: string;
}

export interface CareerState {
  version: 1;
  seedBase: number;
  generation: number; // 1 = first forecaster, 2 = their apprentice, ...
  hardcore: boolean;
  forecaster: Forecaster;
  /** Kept through succession (wiped in hardcore). */
  journal: Journal;
  calibration: Calibration;
  historyWall: WallEntry[];
  /** Lost on succession. */
  equipment: EquipmentId[];
  brokenEquipment: EquipmentId[];
  money: number;
  clientTrust: Record<string, number>;
}

const APPRENTICE_NAMES = [
  "Ada", "Bram", "Clem", "Dot", "Eli", "Fern", "Gus", "Hattie", "Ivo", "June",
  "Kit", "Lou", "Mabel", "Ned", "Olive", "Pip", "Quinn", "Rosa", "Sully", "Tess",
];

export function suggestName(seedBase: number, generation: number): string {
  return pick(mulberry32(subSeed(seedBase, `name:${generation}`)), APPRENTICE_NAMES);
}

function newForecaster(name: string, today: string): Forecaster {
  return {
    name: name.trim() || "The Forecaster",
    startedDate: today,
    ratingAtLastPlay: RATING.start,
    lastPlayedDate: today,
    dayCount: 0,
    peakRating: RATING.start,
    perfectDays: 0,
    history: [],
  };
}

export function newCareer(opts: { name: string; hardcore: boolean; today: string; seedBase: number }): CareerState {
  return {
    version: 1,
    seedBase: opts.seedBase >>> 0,
    generation: 1,
    hardcore: opts.hardcore,
    forecaster: newForecaster(opts.name, opts.today),
    journal: {},
    calibration: emptyCalibration(),
    historyWall: [],
    equipment: [],
    brokenEquipment: [],
    money: 0,
    clientTrust: {},
  };
}

/** Rating as of `today`, after idle decay. Pure and idempotent: opening the app twice never double-charges. */
export function currentRating(c: CareerState, today: string): number {
  const f = c.forecaster;
  return applyDecay(f.ratingAtLastPlay, f.lastPlayedDate, today);
}

export const isCareerRetired = (c: CareerState, today: string): boolean => isRetired(currentRating(c, today));

/** Town talk about idle decay. Never shows numbers. Null when there's nothing to say. */
export function townTalk(c: CareerState, today: string): string | null {
  const f = c.forecaster;
  const missed = missedDays(f.lastPlayedDate, today);
  const lost = f.ratingAtLastPlay - currentRating(c, today);
  if (missed === 0) return null;
  if (lost === 0) {
    return f.ratingAtLastPlay <= RATING.decayFloor
      ? "The town has mostly stopped asking. Only good calls will win them back."
      : "Good to see the station lights on again. Folks noticed it was quiet.";
  }
  if (currentRating(c, today) === RATING.decayFloor) return "Half the town has switched to the city forecast. Only your calls can bring them back.";
  if (lost <= 25) return "Folks are starting to listen to the TV guy.";
  if (lost <= 75) return "Down at the diner they say you've gone soft. The TV guy's been on a roll.";
  return "Your chair at the diner's gone cold. Plenty of folks have turned to the city forecast.";
}

export const careerSeason = (c: CareerState) => seasonForIndex(Math.floor(c.forecaster.dayCount / CAREER.daysPerSeason));

/** The next career day. Deterministic from the career seed, generation and day count. */
export function nextCareerDay(c: CareerState): Day {
  return careerDayAt(c, c.forecaster.dayCount);
}

export const careerLoadout = (c: CareerState): Loadout => loadoutFor(c.equipment, c.brokenEquipment);

/** Sources visible on a career day: working equipment plus that day's folk signs. */
export function careerDaySources(c: CareerState, day: Day): SourceId[] {
  return sourcesForDay(day, careerLoadout(c));
}

/** Fill fields added after a save was written (Phase 4). */
export function normalizeCareer(raw: CareerState): CareerState {
  const c = raw as Partial<CareerState> & CareerState;
  return {
    ...c,
    journal: (c.journal ?? {}) as Journal,
    calibration: c.calibration ?? emptyCalibration(),
    equipment: (c.equipment ?? []).filter((e) => ["rainGauge", "upstreamRadio", "weatherBalloon", "radar"].includes(e)),
    brokenEquipment: c.brokenEquipment ?? [],
    money: c.money ?? 0,
  };
}

export interface CareerDayOutcome {
  career: CareerState;
  result: PlayResult;
  ratingBefore: number;
  ratingAfter: number;
  retired: boolean;
  pay: number;
  radarBroke: boolean;
  /** The signals the player saw (for the debrief and journal). */
  signals: Signal[];
}

/** Score and commit a career day. Call at submit time so quitting mid-playback can't undo it. */
export function playCareerDay(c: CareerState, calls: Record<string, Step>, today: string): CareerDayOutcome {
  if (isCareerRetired(c, today)) throw new Error("This forecaster has retired");
  const day = nextCareerDay(c);
  const loadout = careerLoadout(c);
  const signals = getSignals(day, sourcesForDay(day, loadout), loadout.noise);
  const result = playDay(day, calls, "career");
  const ev = result.resolution.events;
  const radarBroke = c.equipment.includes("radar") && !c.brokenEquipment.includes("radar") && radarBreaks(day, ev);
  const pay = dayPay(result.score.total);
  const ratingBefore = currentRating(c, today);
  const ratingAfter = applyRep(ratingBefore, result.score.total);
  const f = c.forecaster;
  const record: DayRecord = {
    dayIndex: f.dayCount,
    date: today,
    calls: { ...calls },
    outcomes: Object.fromEntries(result.resolution.results.map((r) => [r.questionId, r.outcome])),
    rep: result.score.total,
    perfect: result.score.perfectBonus > 0,
    ratingAfter,
  };
  const forecaster: Forecaster = {
    ...f,
    ratingAtLastPlay: ratingAfter,
    lastPlayedDate: today,
    dayCount: f.dayCount + 1,
    peakRating: Math.max(f.peakRating, ratingAfter),
    perfectDays: f.perfectDays + (record.perfect ? 1 : 0),
    history: [...f.history, record].slice(-CAREER.historyLimit),
  };
  const career: CareerState = {
    ...c,
    forecaster,
    journal: recordJournal(c.journal, signals, ev.rains),
    calibration: addToCalibration(c.calibration, result.score.questions),
    money: c.money + pay,
    brokenEquipment: radarBroke ? [...c.brokenEquipment, "radar"] : c.brokenEquipment,
  };
  return { career, result, ratingBefore, ratingAfter, retired: isRetired(ratingAfter), pay, radarBroke, signals };
}

function howWentOut(c: CareerState): string {
  const f = c.forecaster;
  const last = f.history[f.history.length - 1];
  let worst: { text: string; rep: number } | null = null;
  if (last) {
    const day = careerDayAt(c, last.dayIndex);
    const res = playDay(day, last.calls, "career");
    for (const q of res.score.questions) {
      if (!worst || q.rep < worst.rep) worst = { text: day.questions.find((x) => x.id === q.questionId)!.text, rep: q.rep };
    }
  }
  const tail = worst && worst.rep < 0 ? ` The last straw: "${worst.text}"` : "";
  return `Retired by the council after ${f.dayCount} day${f.dayCount === 1 ? "" : "s"}.${tail}`;
}

export function careerDayAt(c: CareerState, dayIndex: number): Day {
  const seed = subSeed(c.seedBase, `career:${c.generation}:${dayIndex}`);
  return generateDay(seed, seasonForIndex(Math.floor(dayIndex / CAREER.daysPerSeason)));
}

export function wallEntryFor(c: CareerState, today: string): WallEntry {
  const f = c.forecaster;
  return {
    name: f.name,
    generation: c.generation,
    startedDate: f.startedDate,
    retiredDate: today,
    days: f.dayCount,
    peakRating: f.peakRating,
    perfectDays: f.perfectDays,
    howWentOut: howWentOut(c),
  };
}

/**
 * Succession. Normal: the retiree joins the history wall, an apprentice starts
 * at 500; journal and wall are kept, equipment/money/trust reset.
 * Hardcore: full wipe (returns null; the player starts a brand-new career).
 */
export function succeed(c: CareerState, apprenticeName: string, today: string): CareerState | null {
  if (!isCareerRetired(c, today)) throw new Error("Succession only happens on retirement");
  if (c.hardcore) return null;
  return {
    ...c,
    generation: c.generation + 1,
    forecaster: newForecaster(apprenticeName, today),
    historyWall: [...c.historyWall, wallEntryFor(c, today)],
    journal: c.journal,
    calibration: c.calibration,
    equipment: [],
    brokenEquipment: [],
    money: 0,
    clientTrust: {},
  };
}
