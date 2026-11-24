import type { Season, SourceId, HiddenVar } from "./config";
export type { Season, SourceId, HiddenVar };

export type Mode = "daily" | "career" | "zen";
export type Step = 0.1 | 0.3 | 0.5 | 0.7 | 0.9;

export interface HiddenState {
  season: Season;
  pressureTrend: number; // hPa / 3h, negative = falling
  humidity: number; // 0..1
  frontStrength: number; // 0..1
  frontArrivalHour: number; // hour of day (may be outside 6–21 = not today)
  tempBaseline: number; // °F expected high
  windSpeed: number; // mph surface
  upperWinds: number; // mph aloft
}

export type QuestionType =
  | "rainToday"
  | "rainBeforeNoon"
  | "highAbove"
  | "windAbove"
  | "fogAtDawn"
  | "frostAtDawn"
  | "snowToday"
  | "allDaySun"
  // long shots: rare outcomes that only appear occasionally
  | "doubleRainbow"
  | "auroraNight"
  | "hundredYearStorm";

export type ClientId = "farmer" | "fleet" | "wedding" | "fair" | "ski" | "skeptic";

export interface Question {
  id: string;
  type: QuestionType;
  threshold?: number; // °F for highAbove, mph for windAbove
  text: string;
  /** Hidden from the player. */
  trueProbability: number;
  /** Set when a client posted this question as a contract. */
  client?: ClientId;
  /** Contract fee before trust scaling. */
  fee?: number;
  longShot?: boolean;
}

export interface Day {
  date?: string;
  /** Career calendar event, e.g. "countyFair" (Phase 5). */
  special?: string;
  seed: number;
  state: HiddenState;
  questions: Question[];
}

export interface Signal {
  source: SourceId;
  label: string;
  reads: HiddenVar;
  value: number;
  /** Noise the reading was taken with (after upgrades). */
  noiseSd: number;
}

export interface QuestionResolution {
  questionId: string;
  outcome: boolean;
  /** 0..1, 1 = the roll was right at the flip point. */
  closeness: number;
}

export interface HourSnapshot {
  hour: number;
  cloudCover: number; // 0..1
  rain: number; // mm/h
  temperature: number; // °F
  wind: number; // mph
  fog: boolean;
  snow?: boolean; // precipitation is snow
  rainbow?: boolean;
  aurora?: boolean;
}

/** What the weather actually did, whether or not a question asked about it. */
export interface DayEvents {
  rains: boolean;
  rainsBeforeNoon: boolean;
  foggy: boolean;
  high: number;
  peakWind: number;
  snows: boolean;
  frost: boolean;
  rainbow: boolean;
  aurora: boolean;
}

export interface Resolution {
  results: QuestionResolution[];
  events: DayEvents;
  timeline: HourSnapshot[];
}

export interface QuestionScore {
  questionId: string;
  forecast: Step;
  outcome: boolean;
  rep: number;
}

export interface DayScore {
  questions: QuestionScore[];
  perfectBonus: number;
  trickle: number;
  total: number;
}
