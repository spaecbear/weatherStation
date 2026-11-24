// 16-bit pixel weather scene. Everything is drawn on a logical pixel grid and
// snapped to it. Reads a timeline snapshot only; no game logic.
import { memo, useState } from "react";
import { Text, View } from "react-native";
import type { HourSnapshot } from "../engine";
import { colors, fonts } from "../app/theme";
import { Sprite, type Palette } from "./Sprite";
import { BOLT, CLOUDS, HOUSE, SOCK, STATION, SUN } from "./pixelArt";

const ROWS = 56;
const HORIZON = 44;

export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.max(0, Math.min(1, t));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i]! - v) * k).toString(16).padStart(2, "0")).join("");
}

/** Lightning flash timing. Shared with the playback screen so thunder follows each flash. Off with reduced motion. */
export function stormFlash(snap: HourSnapshot, t: number, reducedMotion: boolean): boolean {
  return snap.rain > 3 && !reducedMotion && Math.floor(t / 1700) % 4 === 0 && t % 1700 < 140;
}

/** Linear interpolation between two hourly snapshots. */
export function lerpSnapshot(a: HourSnapshot, b: HourSnapshot, t: number): HourSnapshot {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    hour: l(a.hour, b.hour),
    cloudCover: l(a.cloudCover, b.cloudCover),
    rain: t < 0.5 ? a.rain : b.rain,
    snow: t < 0.5 ? a.snow : b.snow,
    rainbow: t < 0.5 ? a.rainbow : b.rainbow,
    aurora: t < 0.5 ? a.aurora : b.aurora,
    temperature: l(a.temperature, b.temperature),
    wind: l(a.wind, b.wind),
    fog: t < 0.5 ? a.fog : b.fog,
  };
}

const Rect = ({ x, y, w, h, c, px }: { x: number; y: number; w: number; h: number; c: string; px: number }) => (
  <View style={{ position: "absolute", left: x * px, top: y * px, width: w * px, height: h * px, backgroundColor: c }} />
);

/** Far ridge as merged column runs. Static per size/color. */
const Ridge = memo(function Ridge({ cols, px, color, top, amp, phase }: { cols: number; px: number; color: string; top: number; amp: number; phase: number }) {
  const heights = Array.from({ length: cols }, (_, c) => Math.round(top + amp * Math.sin(c / 9 + phase) + (amp / 2) * Math.sin(c / 3.7 + phase * 2)));
  const runs: { x: number; w: number; y: number }[] = [];
  heights.forEach((y, x) => {
    const last = runs[runs.length - 1];
    if (last && last.y === y) last.w++;
    else runs.push({ x, w: 1, y });
  });
  return <>{runs.map((r) => <Rect key={r.x} x={r.x} y={r.y} w={r.w} h={HORIZON - r.y} c={color} px={px} />)}</>;
});

export function Sky({ snap, timeMs, reducedMotion = false }: { snap: HourSnapshot; timeMs: number; reducedMotion?: boolean }) {
  const [width, setWidth] = useState(340);
  const px = width < 320 ? 3 : 4;
  const cols = Math.ceil(width / px);
  const t = reducedMotion ? 0 : timeMs;
  const h = snap.hour;

  const dayness = Math.sin(Math.max(0, Math.min(1, (h - 5) / 16)) * Math.PI);
  const raining = snap.rain > 0;
  const dark = Math.min(1, snap.cloudCover * (raining ? 1 : 0.7));
  const stormy = snap.rain > 3;
  const flash = stormy && stormFlash(snap, t, reducedMotion);

  // Sky: posterized bands, 16-bit style.
  let top = mix(mix("#3b4a6b", "#4f86c0", dayness), "#353c46", dark);
  let bottom = mix(mix("#e39a6e", "#a9cfe9", dayness), "#68717e", dark);
  if (flash) { top = "#b9c4d2"; bottom = "#dde4ec"; }
  const top0 = top, bottom0 = bottom;
  const BANDS = 11;
  const bandH = Math.ceil(HORIZON / BANDS);
  const shade = (c: string) => mix(c, "#15181c", dark * 0.4 + (1 - dayness) * 0.25);

  // Sun
  const sunX = Math.round(((h - 5) / 17) * (cols - 16) + 4);
  const sunY = Math.round(30 - dayness * 26);
  const sunVisible = dark < 0.65 && dayness > 0.05;

  // Clouds
  const darkness = raining ? 0.85 : dark * 0.7;
  const cloudPal: Palette = {
    w: mix("#f2f5f8", "#5d6572", darkness),
    s: mix("#c4ccd6", "#434a55", darkness),
    h: mix("#d5dce4", "#3a4049", darkness),
  };
  const nClouds = Math.round(snap.cloudCover * 5) + (raining ? 2 : 0);
  const speed = 0.002 + snap.wind * 0.0004;
  const clouds = Array.from({ length: nClouds }, (_, i) => {
    const span = cols + 34;
    const x = Math.floor(((i * 31 + t * speed * (1 + (i % 3) * 0.3)) % span) - 26);
    const y = 1 + ((i * 7) % 16);
    return <Sprite key={i} rows={CLOUDS[i % 3]!} palette={cloudPal} px={px} x={x} y={y} flip={i % 2 === 1} />;
  });

  // Rain, or snow: slower, square flakes that drift
  const snowing = Boolean(snap.snow);
  const drops = raining
    ? Array.from({ length: Math.min(55, Math.round(10 + snap.rain * 9)) }, (_, i) => {
        const fall = snowing ? 0.018 : 0.07;
        const y = Math.floor((i * 13 + t * fall * (1 + (i % 3) * 0.15)) % (HORIZON + 6)) - 3;
        const drift = snowing ? Math.round(2 * Math.sin(t / 400 + i)) : 0;
        const x = Math.floor((((i * 17 + y * Math.min(1, snap.wind / 20) + drift) % cols) + cols) % cols);
        return snowing
          ? <Rect key={i} x={x} y={y} w={1} h={1} c="#ffffff" px={px} />
          : <Rect key={i} x={x} y={y} w={1} h={3} c="#a9c4e0" px={px} />;
      })
    : null;

  // Ground: snow cover when it snows, a frost rime when it's freezing
  const frosty = snap.temperature <= 32;
  const groundBase = snowing ? "#e8edf2" : frosty ? mix("#4d7f43", "#dfe8ee", 0.55) : "#4d7f43";
  const groundTop = snowing ? "#ffffff" : frosty ? "#e9f0f4" : "#6ea35c";
  const groundTuft = snowing ? "#c9d3dd" : frosty ? "#b9c9d2" : "#3e6a37";

  // Double rainbow: solid pixel bands. For each column, each band fills the gap between
  // its outer and inner radius, so the arc has no holes. The outer bow is fainter and reversed.
  const BOW = ["#d65a4a", "#e8913b", "#f3cd55", "#6aa95a", "#6f98c2", "#8a6fc2"];
  const rainbow = snap.rainbow
    ? ([[19, BOW, 0.85], [27, [...BOW].reverse(), 0.45]] as const).flatMap(([R, bands, k], arc) => {
        const cx = Math.round(cols * 0.5), cy = HORIZON;
        const yAt = (r: number, x: number) => (Math.abs(x - cx) > r ? cy : cy - Math.sqrt(r * r - (x - cx) ** 2));
        const out = [];
        for (let b = 0; b < bands.length; b++) {
          const rOut = R - b, rIn = R - b - 1;
          for (let x = cx - rOut; x <= cx + rOut; x++) {
            const top = Math.round(Math.min(yAt(rOut, x), yAt(rOut, x + 0.99)));
            const bottom = Math.max(top + 1, Math.round(Math.min(yAt(rIn, x), yAt(rIn, x + 0.99))));
            const h = Math.min(bottom, cy) - top;
            if (h > 0) out.push(<Rect key={`rb${arc}-${b}-${x}`} x={x} y={top} w={1} h={h} c={mix(mix(top0, bottom0, top / HORIZON), bands[b]!, k)} px={px} />);
          }
        }
        return out;
      })
    : null;

  // Northern lights: wavy green/teal curtains across the top of the sky
  const aurora = snap.aurora
    ? ["#58e0a0", "#3bb7c9"].flatMap((c, band) => Array.from({ length: Math.ceil(cols / 3) }, (_, i) => {
        const x = i * 3;
        const y = Math.round(3 + band * 5 + 3 * Math.sin(x / 7 + t / 600 + band));
        return <View key={`au${band}-${i}`} style={{ position: "absolute", left: x * px, top: y * px, width: 3 * px, height: (5 + (i % 3)) * px, backgroundColor: c, opacity: 0.5 }} />;
      }))
    : null;

  // Town
  const windowLit = dayness < 0.35 || dark > 0.8;
  const townPal: Palette = {
    k: colors.outline,
    r: shade("#9a4d43"),
    w: shade("#d8d2c4"),
    B: windowLit ? "#f3cd55" : shade("#6f98c2"),
    n: shade("#6b4a32"),
    s: shade("#5b6676"),
  };
  const stationX = Math.round(cols * 0.34);
  const poleX = stationX + 10;
  const poleTop = HORIZON - 10 - 8;
  const k = snap.wind;
  const sock = k < 7 ? SOCK.limp : k < 16 ? SOCK.half : SOCK.full;
  const flutter = !reducedMotion && k >= 16 && Math.floor(t / 160) % 2 === 0 ? 1 : 0;

  // Thermometer (20°F..100°F)
  const thH = 28;
  const fill = Math.round(Math.max(1, Math.min(thH - 2, ((snap.temperature - 20) / 80) * (thH - 2))));
  const thX = cols - 8;

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: "100%", height: ROWS * px, overflow: "hidden", backgroundColor: bottom, borderWidth: 3, borderColor: colors.outline }}
      accessibilityLabel="Weather over town"
    >
      {Array.from({ length: BANDS }, (_, i) => <Rect key={`b${i}`} x={0} y={i * bandH} w={cols} h={bandH} c={mix(top, bottom, i / (BANDS - 1))} px={px} />)}
      {aurora}
      {sunVisible ? <Sprite rows={SUN} palette={{ y: "#f3cd55", Y: "#fff1a8" }} px={px} x={sunX} y={sunY} /> : null}
      <Ridge cols={cols} px={px} color={shade("#55657a")} top={33} amp={3} phase={0.4} />
      {clouds}
      {flash ? <Sprite rows={BOLT} palette={{ y: "#fff3b0" }} px={px} x={Math.round(cols * 0.6)} y={16} /> : null}
      <Ridge cols={cols} px={px} color={shade("#3f6a46")} top={39} amp={2} phase={2.1} />
      {/* ground */}
      {rainbow}
      <Rect x={0} y={HORIZON} w={cols} h={ROWS - HORIZON} c={shade(groundBase)} px={px} />
      <Rect x={0} y={HORIZON} w={cols} h={1} c={shade(groundTop)} px={px} />
      {Array.from({ length: Math.ceil(cols / 6) }, (_, i) => (
        <Rect key={`g${i}`} x={i * 6 + (i % 3)} y={HORIZON + 3 + (i * 5) % 8} w={2} h={1} c={shade(groundTuft)} px={px} />
      ))}
      <Sprite rows={HOUSE} palette={townPal} px={px} x={Math.round(cols * 0.1)} y={HORIZON - 8} />
      <Sprite rows={STATION} palette={townPal} px={px} x={stationX} y={HORIZON - 10} />
      <Sprite rows={HOUSE} palette={townPal} px={px} x={Math.round(cols * 0.6)} y={HORIZON - 8} flip />
      <Rect x={poleX} y={poleTop} w={1} h={8} c={colors.outline} px={px} />
      <Sprite rows={sock} palette={{ r: "#e8743b", w: "#f2ede4" }} px={px} x={poleX + 1} y={poleTop + flutter} />
      {raining ? drops : null}
      {snap.fog ? Array.from({ length: 6 }, (_, i) => (
        <View key={`f${i}`} style={{ position: "absolute", left: 0, right: 0, top: (26 + i * 4) * px, height: 3 * px, backgroundColor: "#dfe4ea", opacity: 0.55 - i * 0.04 }} />
      )) : null}
      {/* HUD: thermometer + wind */}
      <Rect x={thX} y={3} w={5} h={thH + 2} c={colors.outline} px={px} />
      <Rect x={thX + 1} y={4} w={3} h={thH} c="#e9edf2" px={px} />
      <Rect x={thX + 1} y={4 + thH - fill} w={3} h={fill} c={colors.bad} px={px} />
      <Text style={{ position: "absolute", right: 4, top: (thH + 7) * px, fontFamily: fonts.pixel, fontSize: 9, color: "#fff", textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }}>
        {Math.round(snap.temperature)}°F
      </Text>
      <Text style={{ position: "absolute", left: 6, bottom: 6, fontFamily: fonts.pixel, fontSize: 9, color: "#fff", textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }}>
        WIND {Math.round(snap.wind)} MPH
      </Text>
    </View>
  );
}
