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

export type QuestionType = "rainToday" | "rainBeforeNoon" | "highAbove" | "windAbove" | "fogAtDawn";

export interface Question {
  id: string;
  type: QuestionType;
  threshold?: number; // °F for highAbove, mph for windAbove
  text: string;
  /** Hidden from the player. */
  trueProbability: number;
}

export interface Day {
  date?: string;
  seed: number;
  state: HiddenState;
  questions: Question[];
}

export interface Signal {
  source: SourceId;
  label: string;
  reads: HiddenVar;
  value: number;
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
}

export interface Resolution {
  results: QuestionResolution[];
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
