// Renders ASCII pixel art as run-length-encoded Views. '.' (or space) is transparent.
import { memo } from "react";
import { View } from "react-native";

export type Palette = Record<string, string>;

export const Sprite = memo(function Sprite({ rows, palette, px, x = 0, y = 0, flip = false }: { rows: readonly string[]; palette: Palette; px: number; x?: number; y?: number; flip?: boolean }) {
  const w = Math.max(...rows.map((r) => r.length));
  const runs: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, ry) => {
    const r = flip ? row.padEnd(w, ".").split("").reverse().join("") : row;
    let start = 0;
    for (let i = 1; i <= r.length; i++) {
      if (i === r.length || r[i] !== r[start]) {
        const ch = r[start]!;
        const c = palette[ch];
        if (ch !== "." && ch !== " " && c) runs.push({ x: start, y: ry, w: i - start, c });
        start = i;
      }
    }
  });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x * px, top: y * px, width: w * px, height: rows.length * px }}>
      {runs.map((r, i) => (
        <View key={i} style={{ position: "absolute", left: r.x * px, top: r.y * px, width: r.w * px, height: px, backgroundColor: r.c }} />
      ))}
    </View>
  );
});

/** A sprite in normal layout flow (for icons). */
export function Icon({ rows, palette, px = 3 }: { rows: readonly string[]; palette: Palette; px?: number }) {
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <View style={{ width: w * px, height: rows.length * px }}>
      <Sprite rows={rows} palette={palette} px={px} />
    </View>
  );
}
