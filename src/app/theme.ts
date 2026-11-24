// Slate storm-cloud palette + 16-bit type. Square corners, bevelled panels.
export const colors = {
  bg: "#22262d", // night slate
  bgAlt: "#2b3038",
  card: "#363d47", // storm cloud
  cardHi: "#4c5562", // bevel light edge
  cardLo: "#1a1d22", // bevel dark edge
  outline: "#101216",
  line: "#56606d",
  ink: "#e9edf2",
  muted: "#9aa4b1",
  accent: "#6f98c2", // rain blue
  accentHi: "#9cc0e2",
  accentLo: "#44678c",
  gold: "#f3cd55", // lightning
  goldLo: "#a8862a",
  good: "#8ccf78",
  bad: "#e8806a",
};

/** Okabe-Ito blue/orange: distinguishable with every common colour-vision deficiency. */
const PALETTES = {
  standard: { good: "#8ccf78", bad: "#e8806a" },
  colorBlind: { good: "#56b4e9", bad: "#e69f00" },
};

export const fonts = { pixel: "PressStart2P_400Regular", body: "VT323_400Regular" };

const BASE_TYPE = {
  title: { fontFamily: fonts.pixel, fontSize: 17, lineHeight: 26, color: colors.ink },
  h2: { fontFamily: fonts.pixel, fontSize: 11, lineHeight: 18, color: colors.ink },
  label: { fontFamily: fonts.pixel, fontSize: 8, lineHeight: 12, color: colors.muted },
  big: { fontFamily: fonts.pixel, fontSize: 15, lineHeight: 20, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 21, lineHeight: 22, color: colors.ink },
};

/** Current text styles. Mutated in place by applyTheme; the app remounts after a change. */
export const type = structuredClone(BASE_TYPE);

/** Motion preference, read by animated components. */
export const motion = { reduced: false };

export function applyTheme(opts: { textScale: number; colorBlind: boolean; reducedMotion: boolean }) {
  for (const k of Object.keys(BASE_TYPE) as (keyof typeof BASE_TYPE)[]) {
    type[k].fontSize = Math.round(BASE_TYPE[k].fontSize * opts.textScale);
    type[k].lineHeight = Math.round(BASE_TYPE[k].lineHeight * opts.textScale);
  }
  Object.assign(colors, opts.colorBlind ? PALETTES.colorBlind : PALETTES.standard);
  motion.reduced = opts.reducedMotion;
}
