// Presentation only: how each signal reads on a card. No game logic.
import { folkSaysRain, isFolk, type Signal, type SourceId } from "../engine";

export const SIGNAL_EXPLAIN: Record<SourceId, string> = {
  barometer: "Falling pressure usually means weather is coming. Rising means it's clearing.",
  hygrometer: "Measures moisture in the air. Damp air rains and fogs more easily.",
  skyReading: "How strong the incoming front looks on the horizon. Strong fronts bring rain, wind and cooler highs.",
  farmersKnee: "Old Hal swears his knee aches before rain. Check the journal to see if it's true.",
  cowsLyingDown: "Folk wisdom says cows lie down before rain. Nobody has ever proven it.",
  upstreamRadio: "The station upriver radios when the front passes them, so you know when it'll reach town.",
  weatherBalloon: "Measures winds high above town, which get mixed down to the surface.",
  thermometer: "Last night's low and the morning's climb point to how warm the day will get. Big help on 'will the high top' calls.",
  radar: "Sweeps the sky for the front and times its arrival. Sharper than the radio. Storms can knock it out.",
  swallowsLow: "They say swallows fly low before rain, chasing bugs pushed down by damp air.",
  redSkyMorning: "Red sky at morning, sailors take warning. Is it true here?",
  pineCones: "Pine cones close up when rain is coming. Or so the old folks say.",
  spiderWebs: "Spiders are said to pull in their webs before a storm.",
  frogsCroaking: "Loud frogs mean rain, according to the kids by the pond.",
};

const hour12 = (h: number) => {
  const r = Math.round(h);
  if (r <= 0 || r >= 24) return "overnight";
  return `${((r + 11) % 12) + 1} ${r < 12 ? "am" : "pm"}`;
};

const arrival = (v: number, what: string) =>
  v > 21.5 ? `${what}: not due till tonight` : v < 5.5 ? `${what}: passed overnight` : `${what} due around ${hour12(v)}`;

const FOLK_TEXT: Partial<Record<SourceId, [rain: string, dry: string]>> = {
  farmersKnee: ["Aching something fierce", "Not a twinge"],
  cowsLyingDown: ["Most are lying down", "Mostly standing"],
  swallowsLow: ["Skimming low over the fields", "Flying high"],
  redSkyMorning: ["Red sky at dawn", "Pale, clear dawn"],
  pineCones: ["Closed up tight", "Wide open"],
  spiderWebs: ["Webs pulled in, spiders hiding", "Fresh webs strung out"],
  frogsCroaking: ["Croaking up a storm", "Quiet pond"],
};

export function formatSignal(s: Signal): string {
  const v = s.value;
  if (isFolk(s.source)) return FOLK_TEXT[s.source]![folkSaysRain(s) ? 0 : 1];
  switch (s.source) {
    case "barometer": {
      const dir = v < -1.5 ? "Falling fast" : v < -0.3 ? "Falling" : v > 1.5 ? "Rising fast" : v > 0.3 ? "Rising" : "Steady";
      return `${dir} · ${v > 0 ? "+" : ""}${v.toFixed(1)} mb/3h`;
    }
    case "hygrometer":
      return `Humidity ${Math.round(v * 100)}%`;
    case "skyReading":
      return v < 0.2 ? "Clear horizon" : v < 0.45 ? "Thin high cloud" : v < 0.7 ? "Cloud building to the west" : "Dark wall of cloud";
    case "upstreamRadio":
      return arrival(v, "Front");
    case "radar":
      return arrival(v, "Front on radar");
    case "thermometer":
      return `Warming toward ${Math.round(v)}°F`;
    case "weatherBalloon":
      return `Winds aloft ${Math.round(v)} mph`;
    default:
      return v.toFixed(2);
  }
}

export const formatHour = hour12;
export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : "0"); // ASCII minus: the pixel font has no U+2212
export const money = (n: number) => `$${n}`;
