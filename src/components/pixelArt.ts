// All pixel art lives here as ASCII. k = outline; other letters map via palettes.
import type { SourceId } from "../engine";
import type { Palette } from "./Sprite";

export const ICON_PALETTE: Palette = {
  k: "#101216", w: "#e9edf2", g: "#9aa4b1", s: "#56606d", b: "#6f98c2", B: "#9cc0e2",
  r: "#d65a4a", y: "#f3cd55", p: "#e7a6a0", n: "#7a5a3a", G: "#6aa95a",
};

export const SOURCE_ICONS: Record<SourceId, string[]> = {
  barometer: [
    "...kkkk...",
    "..kwwwwk..",
    ".kwgwwgwk.",
    "kwwwwwrwwk",
    "kwgwwrwwgk",
    "kwwwkwwwwk",
    "kwwwwwwwwk",
    ".kwgwwgwk.",
    "..kwwwwk..",
    "...kkkk...",
  ],
  hygrometer: [
    "....kk....",
    "...kbbk...",
    "...kbbk...",
    "..kbbbbk..",
    ".kbBbbbbk.",
    ".kbBbbbbk.",
    "kbBbbbbbbk",
    "kbbbbbbbbk",
    ".kbbbbbbk.",
    "..kkkkkk..",
  ],
  skyReading: [
    "..........",
    "....kkk...",
    "...kwwwk..",
    "..kwwwwwkk",
    ".kkwwwwwwwk",
    "kwwwwwwwwwk",
    "kwwwwwwwwwk",
    "kgggggggggk",
    ".kkkkkkkkk.",
    "..........",
  ],
  farmersKnee: [
    "..kkkk....",
    "..knnk....",
    "..knnk....",
    "..knnk....",
    "..knnk....",
    "..knnkkk..",
    "..knnnnnk.",
    "..knnnnnnk",
    "..kkkkkkkk",
    "..........",
  ],
  cowsLyingDown: [
    "k........k",
    "kk.kkkk.kk",
    ".kkwwwwkk.",
    "..kwkwkk..",
    "..kwwwwk..",
    "..kwwkwk..",
    ".kppppppk.",
    ".kpkppkpk.",
    "..kkkkkk..",
    "..........",
  ],
  upstreamRadio: [
    ".......k..",
    "......k...",
    ".....k....",
    "kkkkkkkkkk",
    "krrrrrrrrk",
    "kwkwkrrkrk",
    "kkwkkrkykk",
    "kwkwkrrkrk",
    "kkkkkkkkkk",
    ".k......k.",
  ],
  weatherBalloon: [
    "...kkkk...",
    "..krrrrk..",
    ".krwrrrrk.",
    ".krwrrrrk.",
    ".krrrrrrk.",
    "..krrrrk..",
    "...kkkk...",
    "....kk....",
    "....k.....",
    "...kkk....",
  ],
};

export const MENU_ICONS = {
  daily: [
    ".k....k.",
    "kkkkkkkk",
    "krrrrrrk",
    "kwwwwwwk",
    "kwkwkwwk",
    "kwwwkwkk",
    "kwkwwwwk",
    "kkkkkkkk",
  ],
  career: [
    "....kk....",
    "...krrk...",
    "..krrrrk..",
    ".krrrrrrk.",
    "kkkkkkkkkk",
    ".kwwwwwwk.",
    ".kwBkwnnk.",
    ".kwBkwnnk.",
    ".kwwkwnyk.",
    ".kkkkkkkk.",
  ],
  zen: [
    "..g.g.....",
    "...g.g....",
    "..g.g.....",
    "kkkkkkkk..",
    "kwwwwwwkkk",
    "kwbbbbwk.k",
    "kwwwwwwkkk",
    ".kwwwwk...",
    "kkkkkkkkk.",
  ],
  wall: [
    "kkkkkkkkkk",
    "kyyyyyyyyk",
    "kysssssssk",
    "kyswwwwsyk",
    "kyswkkwsyk",
    "kyswwwwsyk",
    "kyskwwksyk",
    "kysssssssk",
    "kyyyyyyyyk",
    "kkkkkkkkkk",
  ],
};

// ---- Scene sprites (logical pixels; palettes applied at render) ----

export const SUN = [
  "...yy...",
  ".y.yy.y.",
  "..yYYy..",
  "yyYYYYyy",
  "yyYYYYyy",
  "..yYYy..",
  ".y.yy.y.",
  "...yy...",
];

export const CLOUDS = [
  [
    ".......hhhh.........",
    ".....hhwwwwhh.......",
    "....hwwwwwwwwh.hhh..",
    "..hhwwwwwwwwwhhwwwh.",
    ".hwwwwwwwwwwwwwwwwwh",
    "hwwwwwwwwwwwwwwwwwwh",
    "hssssssssssssssssssh",
    ".hhhhhhhhhhhhhhhhhh.",
  ],
  [
    "....hhhh......",
    "..hhwwwwhhh...",
    ".hwwwwwwwwwhh.",
    "hwwwwwwwwwwwwh",
    "hsssssssssssss",
    ".hhhhhhhhhhhh.",
  ],
  [
    "..........hhhh..........",
    "...hhh..hhwwwwhh........",
    "..hwwwhhwwwwwwwwhhhh....",
    ".hwwwwwwwwwwwwwwwwwwhh..",
    "hwwwwwwwwwwwwwwwwwwwwwh.",
    "hwwwwwwwwwwwwwwwwwwwwwwh",
    "hssssssssssssssssssssssh",
    ".hhhhhhhhhhhhhhhhhhhhhh.",
  ],
];

export const BOLT = [
  "...yy",
  "..yy.",
  ".yy..",
  "yyyy.",
  "..yy.",
  ".yy..",
  ".y...",
  "y....",
];

export const HOUSE = [
  "...kkkk...",
  "..krrrrk..",
  ".krrrrrrk.",
  "kkkkkkkkkk",
  ".kwwwwwwk.",
  ".kwBkwnnk.",
  ".kwwkwnnk.",
  ".kkkkkkkk.",
];

export const STATION = [
  "....kkkk....",
  "...kssssk...",
  "..kssssssk..",
  ".kkkkkkkkkk.",
  ".kwwwwwwwwk.",
  ".kwBkwwBkwk.",
  ".kwwwwwwwwk.",
  ".kwBkwwnnwk.",
  ".kwwwwwnnwk.",
  ".kkkkkkkkkk.",
];

export const SOCK = {
  limp: ["rr", "rw", "wr", "rr", "w."],
  half: ["rr......", "rwwr....", "..rrww..", "....rrw."],
  full: ["rrwwrrww", "rrwwrrw."],
};
