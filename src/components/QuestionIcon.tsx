// Shape-coded question icons: each weather type has a distinct silhouette, so
// meaning never depends on colour alone (colour-blind safe).
import type { QuestionType } from "../engine";
import { Icon } from "./Sprite";
import type { Palette } from "./Sprite";

const PAL: Palette = { k: "#101216", b: "#6f98c2", w: "#e9edf2", y: "#f3cd55", r: "#d65a4a", g: "#9aa4b1", G: "#58e0a0", c: "#3bb7c9" };

const ICONS: Record<QuestionType, string[]> = {
  rainToday: ["...k....", "..kbk...", ".kbbbk..", "kbwbbbk.", "kbbbbbk.", ".kbbbk..", "..kkk...", "........"],
  rainBeforeNoon: ["..kk....", ".kbbk...", "kbwbbk..", ".kkkk.kk", "....kkwk", "...kwkwk", "...kwwwk", "....kkk."],
  highAbove: ["..kk....", ".kwwk...", ".kwwk.k.", ".krrk...", ".krrk.k.", "krrrrk..", "krrrrk..", ".kkkk..."],
  windAbove: ["........", "kkkkkk..", "......k.", "kkkkkkk.", ".......k", "kkkkk..k", ".....kk.", "........"],
  fogAtDawn: ["........", "gggggg..", "........", "..gggggg", "........", "gggggg..", "........", "..gggggg"],
  frostAtDawn: ["...b....", ".b.b.b..", "..bbb...", "bbbwbbb.", "..bbb...", ".b.b.b..", "...b....", "........"],
  snowToday: ["...w....", ".w.w.w..", "..www...", "wwwkwww.", "..www...", ".w.w.w..", "...w....", "........"],
  allDaySun: ["...y....", ".y.y.y..", "..yyy...", "yyyyyyy.", "..yyy...", ".y.y.y..", "...y....", "........"],
  doubleRainbow: ["..rrrr..", ".ryyyyr.", "ryGGGGyr", "rG....Gy", "y......G", "........", "........", "........"],
  auroraNight: ["G..G..G.", ".GG.GG.G", "c.c..c..", ".c.cc.c.", "........", "...w....", "........", "kkkkkkkk"],
  hundredYearStorm: ["....yy..", "...yy...", "..yy....", ".yyyy...", "...yy...", "..yy....", ".yy.....", "y......."],
};

export function QuestionIcon({ type }: { type: QuestionType }) {
  return <Icon rows={ICONS[type]} palette={PAL} px={3} />;
}
