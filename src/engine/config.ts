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
  | "weatherBalloon";

export type HiddenVar = "pressureTrend" | "humidity" | "frontStrength" | "frontArrivalHour" | "upperWinds" | "none";

export const SOURCES: Record<SourceId, { reads: HiddenVar; noiseSd: number; unlockedAtStart: boolean; label: string }> = {
  barometer: { reads: "pressureTrend", noiseSd: 0.3, unlockedAtStart: true, label: "Barometer" },
  hygrometer: { reads: "humidity", noiseSd: 0.04, unlockedAtStart: true, label: "Hygrometer" },
  skyReading: { reads: "frontStrength", noiseSd: 0.15, unlockedAtStart: true, label: "Sky reading" },
  farmersKnee: { reads: "humidity", noiseSd: 0.2, unlockedAtStart: true, label: "Farmer's knee" },
  cowsLyingDown: { reads: "none", noiseSd: 0.3, unlockedAtStart: true, label: "Cows lying down" },
  upstreamRadio: { reads: "frontArrivalHour", noiseSd: 1.0, unlockedAtStart: false, label: "Upstream radio" },
  weatherBalloon: { reads: "upperWinds", noiseSd: 3, unlockedAtStart: false, label: "Weather balloon" },
};

export const TIMELINE = { startHour: 6, endHour: 21, peakTempHour: 15, dawnLowOffset: 9 };

/** Probabilities are clamped so no question is ever certain. */
export const PROB_CLAMP: [number, number] = [0.02, 0.98];
