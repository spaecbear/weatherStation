// Placeholder weather scene built from plain Views. Reads a timeline snapshot only.
import { StyleSheet, Text, View } from "react-native";
import type { HourSnapshot } from "../engine";
import { colors } from "../app/theme";

const W = 340;
const H = 220;
const GROUND = 46;

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i]! - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("");
}

/** Linear interpolation between two hourly snapshots. */
export function lerpSnapshot(a: HourSnapshot, b: HourSnapshot, t: number): HourSnapshot {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    hour: l(a.hour, b.hour),
    cloudCover: l(a.cloudCover, b.cloudCover),
    rain: t < 0.5 ? a.rain : b.rain,
    temperature: l(a.temperature, b.temperature),
    wind: l(a.wind, b.wind),
    fog: t < 0.5 ? a.fog : b.fog,
  };
}

export function Sky({ snap, timeMs, reducedMotion = false }: { snap: HourSnapshot; timeMs: number; reducedMotion?: boolean }) {
  const h = snap.hour;
  const dayness = Math.sin(Math.max(0, Math.min(1, (h - 5) / 16)) * Math.PI); // 0 at dawn/dusk, 1 midday
  const clearSky = mix("#f2b48a", "#8fc3e8", dayness);
  const sky = mix(clearSky, "#8b9198", snap.cloudCover * (snap.rain > 0 ? 1 : 0.75));
  const sunX = ((h - 5) / 17) * (W - 40) + 20;
  const sunY = 150 - dayness * 120;
  const t = reducedMotion ? 0 : timeMs;

  const cloudCount = Math.round(snap.cloudCover * 6);
  const clouds = Array.from({ length: cloudCount }, (_, i) => {
    const speed = 0.004 + snap.wind * 0.0008;
    const x = ((i * 97 + t * speed) % (W + 120)) - 100;
    const y = 18 + ((i * 37) % 70);
    const shade = mix("#ffffff", "#6e737a", snap.rain > 0 ? 0.7 : snap.cloudCover * 0.4);
    return <View key={i} style={[s.cloud, { left: x, top: y, backgroundColor: shade, width: 90 + (i % 3) * 20 }]} />;
  });

  const drops =
    snap.rain > 0
      ? Array.from({ length: Math.min(60, Math.round(10 + snap.rain * 10)) }, (_, i) => {
          const y = ((i * 53 + t * 0.35) % (H - GROUND)) + 0;
          const x = (i * 41 + y * snap.wind * 0.02) % W;
          return <View key={i} style={[s.drop, { left: x, top: y, transform: [{ rotate: `${Math.min(30, snap.wind)}deg` }] }]} />;
        })
      : null;

  // Windsock: extends and lifts with wind (0 limp → 1 straight out at 25+ mph)
  const k = Math.max(0, Math.min(1, snap.wind / 25));
  const flutter = reducedMotion ? 0 : Math.sin(t / 180) * 4 * k;
  const sockAngle = 80 - k * 75 + flutter;

  // Thermometer 20°F..100°F
  const fill = Math.max(0.03, Math.min(1, (snap.temperature - 20) / 80));

  return (
    <View style={[s.wrap, { backgroundColor: sky }]} accessibilityLabel="Weather over town">
      <View style={[s.sun, { left: sunX - 18, top: sunY - 18, opacity: Math.max(0, 1 - snap.cloudCover) * (dayness > 0.05 ? 1 : 0) }]} />
      {clouds}
      {drops}
      {snap.fog ? <View style={s.fog} /> : null}
      <View style={s.ground} />
      <View style={s.pole} />
      <View style={[s.sock, { transform: [{ rotate: `${sockAngle}deg` }] }]} />
      <View style={s.thermo}>
        <View style={[s.thermoFill, { height: `${fill * 100}%` }]} />
      </View>
      <Text style={s.thermoText}>{Math.round(snap.temperature)}°F</Text>
      <Text style={s.windText}>{Math.round(snap.wind)} mph</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: "100%", height: H, borderRadius: 16, overflow: "hidden" },
  sun: { position: "absolute", width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffd75e" },
  cloud: { position: "absolute", height: 34, borderRadius: 17, opacity: 0.95 },
  drop: { position: "absolute", width: 2, height: 10, backgroundColor: "#cfe3f5", borderRadius: 1 },
  fog: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(240,240,240,0.65)" },
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, height: GROUND, backgroundColor: "#7a9a5b" },
  pole: { position: "absolute", left: 30, bottom: GROUND, width: 3, height: 60, backgroundColor: "#5b4a3a" },
  sock: {
    position: "absolute", left: 32, bottom: GROUND + 42, width: 38, height: 12,
    backgroundColor: "#e8743b", borderTopRightRadius: 6, borderBottomRightRadius: 6,
    transformOrigin: "left center",
  },
  thermo: { position: "absolute", right: 22, top: 30, width: 14, height: 120, borderRadius: 7, backgroundColor: "#ffffffaa", overflow: "hidden", justifyContent: "flex-end" },
  thermoFill: { width: "100%", backgroundColor: colors.bad },
  thermoText: { position: "absolute", right: 8, top: 154, color: "#fff", fontWeight: "700", fontSize: 13 },
  windText: { position: "absolute", left: 12, bottom: 12, color: "#fff", fontWeight: "700", fontSize: 13 },
});
