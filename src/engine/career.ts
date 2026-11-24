import { CAREER, CLIENTS, RATING, TOWN, type EquipmentId, type SpecialId } from "./config";
import { playDay, type PlayResult } from "./day";
import { applyDecay, applyRep, isRetired, missedDays } from "./rating";
import { mulberry32, pick, subSeed } from "./rng";
import { getSignals, loadoutFor, sourcesForDay, type Loadout } from "./signals";
import { addToCalibration, dayPay, emptyCalibration, radarBreaks, recordJournal, type Calibration, type Journal } from "./progression";
import type { ClientId, Day, Signal, SourceId, Step } from "./types";
import { isCorrectSide } from "./scoring";
import {
  buildCareerDay, calendar, chalkAdd, contractPay, freshChalk, freshTrust, resolveSeasonCall, rivalScore, seasonCallOffer,
  specialKeyQuestion, trustAfter, type Chalkboard, type SeasonCall, type Trust,
} from "./town";
import { clientSceneId, LONG_SHOT_HEADLINES, SCENES, specialHeadline, unlockedPages, type Headline } from "./story";
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
  /** Client trust 0..5 (reset to wary on succession). */
  trust: Trust;
  /** Story: scenes already shown and notebook pages found (kept through succession). */
  seenScenes: string[];
  notebook: number[];
  /** Diner chalkboard: this season, plus past seasons. */
  chalk: Chalkboard;
  chalkHistory: Chalkboard[];
  /** Long-range call for the current season (made in its first week). */
  seasonCall: SeasonCall | null;
  /** The Gazette: most recent headlines first. */
  newspaper: (Headline & { dayIndex: number })[];
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
    trust: freshTrust(),
    seenScenes: [],
    notebook: [],
    chalk: freshChalk(0),
    chalkHistory: [],
    seasonCall: null,
    newspaper: [],
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
    trust: { ...freshTrust(), ...(c.trust ?? {}) },
    seenScenes: c.seenScenes ?? [],
    notebook: c.notebook ?? [],
    chalk: c.chalk ?? freshChalk(Math.floor(c.forecaster.dayCount / CAREER.daysPerSeason)),
    chalkHistory: c.chalkHistory ?? [],
    seasonCall: c.seasonCall ?? null,
    newspaper: c.newspaper ?? [],
  };
}

// ---------- Long-range season call ----------

/** The season call on offer right now (first week of a season, not yet made), else null. */
export function seasonCallAvailable(c: CareerState): SeasonCall | null {
  const cal = calendar(c.forecaster.dayCount);
  if (cal.dayInSeason >= TOWN.seasonCallDays) return null;
  if (c.seasonCall && c.seasonCall.seasonIndex === cal.seasonIndex) return null;
  return seasonCallOffer((i) => careerDayAt(c, i), cal.seasonIndex, cal.dayInSeason);
}

export function makeSeasonCall(c: CareerState, call: Step): CareerState {
  const offer = seasonCallAvailable(c);
  if (!offer) throw new Error("No season call available");
  return { ...c, seasonCall: { ...offer, call } };
}

export const seasonCallText = (sc: SeasonCall) => `Will it rain on more than ${sc.threshold} of this season's ${CAREER.daysPerSeason} days?`;

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
  contracts: { questionId: string; client: ClientId; pay: number; trustBefore: number; trustAfter: number }[];
  rival: { calls: Record<string, Step>; rep: number };
  /** Your rep without the participation trickle, for a fair comparison with the rival. */
  yourRep: number;
  seasonCallResult: { call: SeasonCall; rainyDays: number; happened: boolean; rep: number } | null;
  /** In order: dialogue scenes, then notebook pages, then newspaper headlines. */
  story: { scenes: string[]; pages: number[]; headlines: Headline[] };
}

/** Score and commit a career day. Call at submit time so quitting mid-playback can't undo it. */
export function playCareerDay(c: CareerState, calls: Record<string, Step>, today: string): CareerDayOutcome {
  if (isCareerRetired(c, today)) throw new Error("This forecaster has retired");
  const f = c.forecaster;
  const cal = calendar(f.dayCount);
  const day = nextCareerDay(c);
  const loadout = careerLoadout(c);
  const signals = getSignals(day, sourcesForDay(day, loadout), loadout.noise);
  const result = playDay(day, calls, "career");
  const ev = result.resolution.events;
  const outcomes = Object.fromEntries(result.resolution.results.map((r) => [r.questionId, r.outcome]));
  const repOf = (id: string) => result.score.questions.find((q) => q.questionId === id)!.rep;
  const radarBroke = c.equipment.includes("radar") && !c.brokenEquipment.includes("radar") && radarBreaks(day, ev);

  // Clients
  let trust = { ...c.trust };
  const contracts: CareerDayOutcome["contracts"] = [];
  const scenes: string[] = [];
  const seen = new Set(c.seenScenes);
  for (const q of day.questions) {
    if (!q.client) continue;
    const rep = repOf(q.id);
    const before = trust[q.client];
    const after = trustAfter(q.client, before, rep);
    const bonus = CLIENTS[q.client].snowBonus && ev.snows ? CLIENTS[q.client].snowBonus! : 0;
    contracts.push({ questionId: q.id, client: q.client, pay: contractPay(q.fee!, before, rep) + bonus, trustBefore: before, trustAfter: after });
    trust = { ...trust, [q.client]: after };
    for (const level of TOWN.sceneAt) {
      const id = clientSceneId(q.client, level);
      if (after >= level && SCENES[id] && !seen.has(id)) { scenes.push(id); seen.add(id); }
    }
  }
  const pay = dayPay(result.score.total) + contracts.reduce((a, x) => a + x.pay, 0);

  // Rival + chalkboard
  const rival = rivalScore(day, outcomes);
  const yourRep = result.score.total - result.score.trickle;
  let chalkHistory = c.chalkHistory;
  let chalk = c.chalk.seasonIndex === cal.seasonIndex ? c.chalk : freshChalk(cal.seasonIndex);
  if (c.chalk.seasonIndex !== cal.seasonIndex) chalkHistory = [...chalkHistory, c.chalk];
  chalk = chalkAdd(chalk, yourRep, rival.score.total);

  // Headlines
  const headlines: Headline[] = [];
  if (day.special) {
    const sid = day.special as SpecialId;
    const key = day.questions.find((q) => q.type === specialKeyQuestion(sid))!;
    const right = sid === "countyFair"
      ? day.questions.reduce((a, q) => a + repOf(q.id), 0) > 0
      : isCorrectSide(calls[key.id]!, outcomes[key.id]!);
    headlines.push(specialHeadline(sid, outcomes[key.id]!, right, f.name));
  }
  for (const q of day.questions) {
    if (!q.longShot || !outcomes[q.id] || day.special) continue; // signature days get their own front page
    const called = calls[q.id]! >= TOWN.longShotBrag;
    headlines.push({
      kicker: called ? "CALLED IT!" : "LONG SHOT",
      title: LONG_SHOT_HEADLINES[q.type] ?? "A RARE SIGHT",
      body: called ? `${f.name} gave it ${Math.round(calls[q.id]! * 100)}% when nobody else would.` : "Nobody saw it coming. Not even the station.",
      celebrate: called,
    });
  }

  // Signature-day story scenes; the storm brings the finale (and Doris's confession).
  if (day.special) {
    if (day.special === "hundredYearStorm") {
      for (const id of ["skeptic-4", "finale"]) if (!seen.has(id)) { scenes.push(id); seen.add(id); }
    }
  }

  // Season end: long-range call and the chalkboard verdict
  let ratingDelta = result.score.total;
  let seasonCallResult: CareerDayOutcome["seasonCallResult"] = null;
  let seasonCall = c.seasonCall;
  if (cal.dayInSeason === CAREER.daysPerSeason - 1) {
    if (seasonCall && seasonCall.seasonIndex === cal.seasonIndex && seasonCall.call !== null) {
      const r = resolveSeasonCall((i) => careerDayAt(c, i), seasonCall);
      seasonCallResult = { call: seasonCall, ...r };
      ratingDelta += r.rep;
      headlines.push({
        kicker: "LONG-RANGE CALL",
        title: `${r.rainyDays} RAINY DAYS THIS ${cal.season.toUpperCase()}`,
        body: `${f.name} gave ${Math.round(seasonCall.call! * 100)}% to "more than ${seasonCall.threshold}". ${r.rep > 0 ? "Right side." : r.rep < 0 ? "Wrong side." : "A shrug, and an honest one."} (${r.rep > 0 ? "+" : ""}${r.rep} rep)`,
      });
      seasonCall = null;
    }
    headlines.push({
      kicker: "THE DINER CHALKBOARD",
      title: chalk.you >= chalk.rival ? `${f.name.toUpperCase()} TOPS CHET FOR THE ${cal.season.toUpperCase()}` : `CHET STORM TAKES THE ${cal.season.toUpperCase()}`,
      body: `Season totals: ${f.name} ${chalk.you}, Chet ${chalk.rival}. Day wins ${chalk.youWins}-${chalk.rivalWins}.`,
      celebrate: chalk.you > chalk.rival,
    });
  }

  const ratingBefore = currentRating(c, today);
  const ratingAfter = applyRep(ratingBefore, ratingDelta);
  const record: DayRecord = {
    dayIndex: f.dayCount,
    date: today,
    calls: { ...calls },
    outcomes,
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

  // Notebook pages unlock on total station days (all forecasters) and rating.
  const stationDays = c.historyWall.reduce((a, w) => a + w.days, 0) + forecaster.dayCount;
  const pages = unlockedPages(stationDays, ratingAfter).filter((p) => !c.notebook.includes(p));

  const career: CareerState = {
    ...c,
    forecaster,
    journal: recordJournal(c.journal, signals, ev.rains),
    calibration: addToCalibration(c.calibration, result.score.questions),
    money: c.money + pay,
    brokenEquipment: radarBroke ? [...c.brokenEquipment, "radar"] : c.brokenEquipment,
    trust,
    seenScenes: [...seen],
    notebook: [...c.notebook, ...pages],
    chalk,
    chalkHistory,
    seasonCall,
    newspaper: [...headlines.map((h) => ({ ...h, dayIndex: f.dayCount })), ...c.newspaper].slice(0, 40),
  };
  return {
    career, result, ratingBefore, ratingAfter, retired: isRetired(ratingAfter), pay, radarBroke, signals,
    contracts, rival: { calls: rival.calls, rep: rival.score.total }, yourRep, seasonCallResult,
    story: { scenes, pages, headlines },
  };
}

/** The scene to show on the station screen before a signature day, if any. */
export function preDayScene(day: Day): string | null {
  return day.special ?? null;
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
  return buildCareerDay(subSeed(c.seedBase, `career:${c.generation}:${dayIndex}`), dayIndex);
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
    trust: freshTrust(TOWN.apprenticeTrust), // the town is warier of the new forecaster
    chalk: freshChalk(0),
    seasonCall: null,
    // kept: journal, calibration, notebook, seenScenes, chalkHistory, newspaper, historyWall
  };
}
