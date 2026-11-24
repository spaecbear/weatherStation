// Small 16-bit scenes: the forecaster's office and the Channel 6 broadcast.
import { useState } from "react";
import { Text, View } from "react-native";
import type { EquipmentId, Season } from "../engine";
import { colors, fonts } from "../app/theme";
import { Sprite, type Palette } from "./Sprite";
import { BOOK, CLOUDS, ICON_PALETTE, RAIN_GAUGE, SOURCE_ICONS, SUN } from "./pixelArt";

const Rect = ({ x, y, w, h, c, px }: { x: number; y: number; w: number; h: number; c: string; px: number }) => (
  <View style={{ position: "absolute", left: x * px, top: y * px, width: w * px, height: h * px, backgroundColor: c }} />
);

const WINDOW_SKY: Record<Season, [string, string]> = {
  spring: ["#6f9fd0", "#b9d7ee"],
  summer: ["#4f86c0", "#a9cfe9"],
  autumn: ["#6b7585", "#a7b0bd"],
  winter: ["#3b4a6b", "#8e9cb4"],
};

/** The office interior. Instruments you own appear on the wall and desk. */
export function OfficeScene({ season, equipment }: { season: Season; equipment: EquipmentId[] }) {
  const [width, setWidth] = useState(340);
  const px = 4;
  const cols = Math.ceil(width / px);
  const ROWS = 30;
  const [skyTop, skyBottom] = WINDOW_SKY[season];
  const winX = Math.round(cols * 0.56), winW = Math.min(30, cols - winX - 3);
  const cloudPal: Palette = { w: "#f2f5f8", s: "#c4ccd6", h: "#d5dce4" };
  const has = (e: EquipmentId) => equipment.includes(e);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="The forecaster's office"
      style={{ width: "100%", height: ROWS * px, overflow: "hidden", borderWidth: 3, borderColor: colors.outline, backgroundColor: "#4a3f36" }}>
      {/* wallpaper stripes */}
      {Array.from({ length: Math.ceil(cols / 6) }, (_, i) => <Rect key={i} x={i * 6} y={0} w={3} h={21} c="#544739" px={px} />)}
      {/* window */}
      <Rect x={winX - 1} y={2} w={winW + 2} h={14} c={colors.outline} px={px} />
      <Rect x={winX} y={3} w={winW} h={6} c={skyTop} px={px} />
      <Rect x={winX} y={9} w={winW} h={6} c={skyBottom} px={px} />
      <View style={{ position: "absolute", left: winX * px, top: 3 * px, width: winW * px, height: 12 * px, overflow: "hidden" }}>
        {season === "autumn" || season === "winter"
          ? <Sprite rows={CLOUDS[1]!} palette={cloudPal} px={px} x={3} y={1} />
          : <Sprite rows={SUN} palette={{ y: "#f3cd55", Y: "#fff1a8" }} px={px} x={winW - 11} y={1} />}
        {season === "winter" ? <Rect x={0} y={10} w={winW} h={2} c="#e8edf2" px={px} /> : <Rect x={0} y={10} w={winW} h={2} c="#5f8f4e" px={px} />}
      </View>
      <Rect x={winX + Math.floor(winW / 2)} y={3} w={1} h={12} c={colors.outline} px={px} />
      <Rect x={winX} y={9} w={winW} h={1} c={colors.outline} px={px} />
      {/* wall instruments */}
      <Sprite rows={SOURCE_ICONS.barometer} palette={ICON_PALETTE} px={px} x={4} y={3} />
      {has("thermometer") ? <Sprite rows={SOURCE_ICONS.thermometer} palette={ICON_PALETTE} px={px} x={16} y={3} /> : null}
      {has("radar") ? <Sprite rows={SOURCE_ICONS.radar} palette={ICON_PALETTE} px={px} x={28} y={3} /> : null}
      {/* desk */}
      <Rect x={0} y={21} w={cols} h={ROWS - 21} c="#2f2620" px={px} />
      <Rect x={2} y={19} w={Math.round(cols * 0.75)} h={3} c="#7a5a3a" px={px} />
      <Rect x={2} y={19} w={Math.round(cols * 0.75)} h={1} c="#9a7650" px={px} />
      <Sprite rows={BOOK} palette={ICON_PALETTE} px={px} x={6} y={11} />
      {has("upstreamRadio") ? <Sprite rows={SOURCE_ICONS.upstreamRadio} palette={ICON_PALETTE} px={px} x={20} y={9} /> : null}
      {has("rainGauge") ? <Sprite rows={RAIN_GAUGE} palette={ICON_PALETTE} px={px} x={34} y={9} /> : null}
      {has("weatherBalloon") ? <Sprite rows={SOURCE_ICONS.weatherBalloon} palette={ICON_PALETTE} px={px} x={cols - 12} y={18} /> : null}
    </View>
  );
}

const CHET = [
  "...kkkkkk...",
  "..kyyyyyyk..",
  ".kyyyyyyyyk.",
  ".kpppppppk..",
  ".kpkppkppk..",
  ".kpppppppk..",
  ".kppkkkppk..",
  "..kpppppk...",
  ".kkwwrwwkk..",
  "kssswrwsssk.",
  "ksssswssssk.",
  "kssssssssssk",
];

/** Channel 6: Chet Storm's broadcast, on a pixel CRT. */
export function TvSegment({ lines, testID }: { lines: string[]; testID?: string }) {
  const px = 4;
  return (
    <View testID={testID} style={{ backgroundColor: "#3a2f28", borderWidth: 3, borderColor: colors.outline, padding: 8 }}>
      <View style={{ backgroundColor: "#1d3b4a", borderWidth: 3, borderColor: "#111", padding: 8, flexDirection: "row", gap: 10 }}>
        <View style={{ width: 12 * px, height: 12 * px }}>
          <Sprite rows={CHET} palette={{ k: "#101216", y: "#e8b04a", p: "#e7b89a", w: "#f2f2ea", r: "#d65a4a", s: "#44678c" }} px={px} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontFamily: fonts.pixel, fontSize: 8, color: colors.gold }}>CH 6 · CHET STORM</Text>
          {lines.map((l, i) => <Text key={i} style={{ fontFamily: fonts.body, fontSize: 20, lineHeight: 20, color: "#dff3ff" }}>{l}</Text>)}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6, marginTop: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#7a5a3a" }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#7a5a3a" }} />
      </View>
    </View>
  );
}
