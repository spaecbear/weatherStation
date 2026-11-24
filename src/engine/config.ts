// All tunable numbers for the engine live here.

export const FORECAST_STEPS = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

export const SCORING = {
  repScale: 100,
  brierBaseline: 0.75, // a 0.5 call scores exactly 0
  perfectDayBase: 10,
  perfectDayPerBold: 10, // per 0.9 / 0.1 call
  participationTrickle: 2, // career only, per submitted forecast (day)
};

export const RATING = {
  min: 0,
  max: 1000,
  start: 500,
  decayFloor: 300,
  retirementAt: 150, // retired at or below
  graceDays: 1,
  decayPerMissedDay: 5,
};

/** Seasonal ranges for the hidden state (mean, sd). */
export type Season = "spring" | "summer" | "autumn" | "winter";
export const SEASONS: Season[] = ["spring", "summer", "autumn", "winter"];

export const SEASON_PARAMS: Record<
  Season,
  {
    pressureTrend: [number, number]; // hPa per 3h
    humidity: [number, number]; // 0..1
    frontStrength: [number, number]; // 0..1
    tempBaseline: [number, number]; // °F daily high expectation
    windSpeed: [number, number]; // mph
    upperWinds: [number, number]; // mph
  }
> = {
  spring: { pressureTrend: [-0.3, 1.5], humidity: [0.62, 0.17], frontStrength: [0.45, 0.25], tempBaseline: [60, 7], windSpeed: [11, 5], upperWinds: [37, 15] },
  summer: { pressureTrend: [0.2, 1.2], humidity: [0.52, 0.18], frontStrength: [0.3, 0.22], tempBaseline: [80, 7], windSpeed: [8, 4], upperWinds: [25, 12] },
  autumn: { pressureTrend: [-0.4, 1.6], humidity: [0.66, 0.16], frontStrength: [0.5, 0.25], tempBaseline: [58, 7], windSpeed: [12, 5], upperWinds: [43, 15] },
  winter: { pressureTrend: [0.0, 1.6], humidity: [0.7, 0.14], frontStrength: [0.45, 0.25], tempBaseline: [38, 7], windSpeed: [14, 6], upperWinds: [53, 18] },
};

/** Logistic weights. Features are centered so `bias` ≈ 0 means a coin flip at average conditions. */
export const WEIGHTS = {
  rain: { humidity: 3.5, humidityCenter: 0.6, front: 2.2, frontCenter: 0.4, pressureTrend: 0.45, bias: -0.1 },
  // P(rain before noon) = P(rain) * sigmoid((noonHour - frontArrival) / spread)
  rainBeforeNoon: { noonHour: 12, spread: 3.0 },
  high: { spread: 6.0, frontCooling: 5.0, thresholdJitterSd: 4.0 }, // °F
  wind: { upperCoupling: 0.15, frontBoost: 6, spread: 4.0, thresholdJitterSd: 3.5 }, // mph
  fog: { humidity: 4.5, humidityCenter: 0.66, wind: 0.15, windCenter: 9, pressureTrend: 0.3, bias: -0.1, seasonBias: { spring: 0, summer: -0.8, autumn: 0.6, winter: 0.3 } as Record<Season, number> },
};

export type SourceId =
  | "barometer"
  | "hygrometer"
  | "skyReading"
  | "farmersKnee"
  | "cowsLyingDown"
  | "upstreamRadio"
  | "weatherBalloon"
  | "radar"
  | "swallowsLow"
  | "redSkyMorning"
  | "pineCones"
  | "spiderWebs"
  | "frogsCroaking";

/** "rainChance" is the day's true P(rain): only nature (a folk sign) can sense it directly. */
export type HiddenVar = "pressureTrend" | "humidity" | "frontStrength" | "frontArrivalHour" | "upperWinds" | "rainChance" | "none";

/**
 * Folk signs are yes/no omens about rain today. `rainWhen` says which side of
 * `threshold` the noisy reading must fall on for the sign to "say rain".
 * Their real reliability is never stored: it emerges from `reads` + `noiseSd`
 * (see `trueFolkReliability`), and the folklore journal has to discover it.
 */
export interface FolkRule { rainWhen: "above" | "below"; threshold: number }

export interface SourceDef {
  reads: HiddenVar;
  noiseSd: number;
  unlockedAtStart: boolean;
  label: string;
  folk?: FolkRule;
}

export const SOURCES: Record<SourceId, SourceDef> = {
  barometer: { reads: "pressureTrend", noiseSd: 0.3, unlockedAtStart: true, label: "Barometer" },
  hygrometer: { reads: "humidity", noiseSd: 0.08, unlockedAtStart: true, label: "Hygrometer" },
  skyReading: { reads: "frontStrength", noiseSd: 0.15, unlockedAtStart: true, label: "Sky reading" },
  farmersKnee: { reads: "humidity", noiseSd: 0.3, unlockedAtStart: true, label: "Farmer's knee", folk: { rainWhen: "above", threshold: 0.62 } },
  cowsLyingDown: { reads: "none", noiseSd: 0.3, unlockedAtStart: true, label: "Cows lying down", folk: { rainWhen: "above", threshold: 0.5 } },
  upstreamRadio: { reads: "frontArrivalHour", noiseSd: 1.0, unlockedAtStart: false, label: "Upstream radio" },
  weatherBalloon: { reads: "upperWinds", noiseSd: 3, unlockedAtStart: false, label: "Weather balloon" },
  radar: { reads: "frontArrivalHour", noiseSd: 0.4, unlockedAtStart: false, label: "Radar" },
  // Rotating townsfolk omens (FOLK.perDay of these appear each day)
  swallowsLow: { reads: "rainChance", noiseSd: 0.3, unlockedAtStart: false, label: "Swallows", folk: { rainWhen: "above", threshold: 0.5 } },
  redSkyMorning: { reads: "frontStrength", noiseSd: 0.35, unlockedAtStart: false, label: "Morning sky", folk: { rainWhen: "above", threshold: 0.45 } },
  pineCones: { reads: "rainChance", noiseSd: 0.06, unlockedAtStart: false, label: "Pine cones", folk: { rainWhen: "above", threshold: 0.5 } },
  spiderWebs: { reads: "pressureTrend", noiseSd: 2.8, unlockedAtStart: false, label: "Spider webs", folk: { rainWhen: "below", threshold: -0.3 } },
  frogsCroaking: { reads: "none", noiseSd: 0.3, unlockedAtStart: false, label: "Frogs", folk: { rainWhen: "above", threshold: 0.5 } },
};

export const ROTATING_FOLK: SourceId[] = ["swallowsLow", "redSkyMorning", "pineCones", "spiderWebs", "frogsCroaking"];

export const FOLK = {
  perDay: 2, // rotating folk signs shown each day, on top of the knee and the cows
  minSamples: 20, // journal says "Unknown" until then
  settledSamples: 300, // below this the tier is shown as an early read (tiers are ~6 points apart; ±3 pts of noise at 300)
  // Agreement-rate cut-offs for journal tiers. Honest odds cap any yes/no
  // rain call at ~69% agreement, so "Trusty" starts well below 100%.
  tiers: { hunch: 0.525, decent: 0.585, trusty: 0.645 },
};

/** Equipment (Phase 4). Prices in money. */
export type EquipmentId = "rainGauge" | "upstreamRadio" | "weatherBalloon" | "radar";
export const EQUIPMENT: Record<EquipmentId, { price: number; label: string; unlocks?: SourceId; noise?: Partial<Record<SourceId, number>> }> = {
  rainGauge: { price: 120, label: "Rain gauge upgrade", noise: { hygrometer: 0.025 } },
  upstreamRadio: { price: 220, label: "Upstream radio", unlocks: "upstreamRadio" },
  weatherBalloon: { price: 260, label: "Weather balloon", unlocks: "weatherBalloon" },
  radar: { price: 450, label: "Radar", unlocks: "radar" },
};

export const RADAR = {
  repairCost: 60,
  breakChance: 0.2, // per stormy day
  stormyFront: 0.6, // a stormy day = it rains and frontStrength ≥ this
};

/** Career pay: rep gain scaled, with a floor so bad days still pay a little. */
export const MONEY = { perRep: 0.5, floor: 5 };

export const TIMELINE = { startHour: 6, endHour: 21, peakTempHour: 15, dawnLowOffset: 9 };

/** Probabilities are clamped so no question is ever certain. */
export const PROB_CLAMP: [number, number] = [0.02, 0.98];

/** Day playback pacing (Phase 2). Seconds of real time. */
export const PLAYBACK = {
  secondsPerHour: 1.6, // normal pace
  slowSecondsPerHour: 4.0, // pace within `slowWindowHours` of a deciding hour
  slowWindowHours: 1,
  lingerSeconds: 4.0, // extra time on the deciding hour, scaled by closeness
  minTotalSeconds: 30,
  maxTotalSeconds: 60,
};

/** Daily Forecast (Phase 3). The daily seed and reset use the UTC date. */
export const DAILY = {
  epoch: "2026-01-01", // Weather Station #1
};

export const CAREER = {
  daysPerSeason: 28,
  historyLimit: 1000, // day records kept per forecaster
  calibrationMin: 10, // samples per step before the calibration chart shows a bar
};
