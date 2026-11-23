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
    tempBaseline: [number, number]; // °C daily high expectation
    windSpeed: [number, number]; // km/h
    upperWinds: [number, number]; // km/h
  }
> = {
  spring: { pressureTrend: [-0.3, 1.5], humidity: [0.62, 0.17], frontStrength: [0.45, 0.25], tempBaseline: [15, 4], windSpeed: [18, 8], upperWinds: [60, 25] },
  summer: { pressureTrend: [0.2, 1.2], humidity: [0.52, 0.18], frontStrength: [0.3, 0.22], tempBaseline: [26, 4], windSpeed: [12, 6], upperWinds: [40, 20] },
  autumn: { pressureTrend: [-0.4, 1.6], humidity: [0.66, 0.16], frontStrength: [0.5, 0.25], tempBaseline: [14, 4], windSpeed: [20, 9], upperWinds: [70, 25] },
  winter: { pressureTrend: [0.0, 1.6], humidity: [0.7, 0.14], frontStrength: [0.45, 0.25], tempBaseline: [4, 4], windSpeed: [22, 9], upperWinds: [85, 30] },
};

/** Logistic weights. Features are centered so `bias` ≈ 0 means a coin flip at average conditions. */
export const WEIGHTS = {
  rain: { humidity: 7.0, humidityCenter: 0.6, front: 4.5, frontCenter: 0.4, pressureTrend: 1.0, bias: -0.2 },
  // P(rain before noon) = P(rain) * sigmoid((noonHour - frontArrival) / spread)
  rainBeforeNoon: { noonHour: 12, spread: 2.0 },
  high: { spread: 1.6, frontCooling: 3.0, thresholdJitterSd: 2.2 }, // °C
  wind: { upperCoupling: 0.15, frontBoost: 10, spread: 4.0, thresholdJitterSd: 7 }, // km/h
  fog: { humidity: 8.0, humidityCenter: 0.68, wind: 0.18, windCenter: 14, pressureTrend: 0.6, bias: -0.5, seasonBias: { spring: 0, summer: -0.8, autumn: 0.6, winter: 0.3 } as Record<Season, number> },
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
  weatherBalloon: { reads: "upperWinds", noiseSd: 5, unlockedAtStart: false, label: "Weather balloon" },
};

export const TIMELINE = { startHour: 6, endHour: 21, peakTempHour: 15, dawnLowOffset: 9 };

/** Probabilities are clamped so no question is ever certain. */
export const PROB_CLAMP: [number, number] = [0.02, 0.98];
