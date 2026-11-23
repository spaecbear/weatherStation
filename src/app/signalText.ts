// Presentation only: how each signal reads on a card. No game logic.
import type { Signal, SourceId } from "../engine";

export const SIGNAL_ICONS: Record<SourceId, string> = {
  barometer: "🧭",
  hygrometer: "💧",
  skyReading: "☁️",
  farmersKnee: "🦵",
  cowsLyingDown: "🐄",
  upstreamRadio: "📻",
  weatherBalloon: "🎈",
};

export const SIGNAL_EXPLAIN: Record<SourceId, string> = {
  barometer: "Falling pressure usually means weather is coming. Rising means it's clearing.",
  hygrometer: "Measures moisture in the air. Damp air rains and fogs more easily.",
  skyReading: "How strong the incoming front looks on the horizon. Strong fronts bring rain, wind and cooler highs.",
  farmersKnee: "Old Hal swears his knee aches before rain. It does track humidity... roughly.",
  cowsLyingDown: "Folk wisdom says cows lie down before rain. Nobody has ever proven it.",
  upstreamRadio: "The station upriver radios when the front passes them, so you know when it'll reach town.",
  weatherBalloon: "Measures winds high above town, which get mixed down to the surface.",
};

const hour12 = (h: number) => {
  const r = Math.round(h);
  if (r <= 0 || r >= 24) return "overnight";
  return `${((r + 11) % 12) + 1} ${r < 12 ? "am" : "pm"}`;
};

export function formatSignal(s: Signal): string {
  const v = s.value;
  switch (s.source) {
    case "barometer": {
      const dir = v < -1.5 ? "Falling fast" : v < -0.3 ? "Falling" : v > 1.5 ? "Rising fast" : v > 0.3 ? "Rising" : "Steady";
      return `${dir} · ${v > 0 ? "+" : ""}${v.toFixed(1)} mb/3h`;
    }
    case "hygrometer":
      return `Humidity ${Math.round(v * 100)}%`;
    case "skyReading":
      return v < 0.2 ? "Clear horizon" : v < 0.45 ? "Thin high cloud" : v < 0.7 ? "Cloud building to the west" : "Dark wall of cloud";
    case "farmersKnee":
      return v < 0.45 ? "Not a twinge" : v < 0.65 ? "Aching some" : v < 0.8 ? "Aching bad" : "Throbbing";
    case "cowsLyingDown":
      return `About ${Math.round(v * 10) * 10}% lying down`;
    case "upstreamRadio":
      return `Front due around ${hour12(v)}`;
    case "weatherBalloon":
      return `Winds aloft ${Math.round(v)} mph`;
  }
}

export const formatHour = hour12;
export const pct = (p: number) => `${Math.round(p * 100)}%`;
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : "0"); // ASCII minus: the pixel font has no U+2212
