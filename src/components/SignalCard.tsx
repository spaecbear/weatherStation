import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Signal } from "../engine";
import { formatSignal, SIGNAL_EXPLAIN, SIGNAL_ICONS } from "../app/signalText";
import { colors, font, radius } from "../app/theme";

export function SignalCard({ signal }: { signal: Signal }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Shows what this signal means" onPress={() => setOpen((o) => !o)} style={s.card}>
      <View style={s.row}>
        <Text style={s.icon}>{SIGNAL_ICONS[signal.source]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{signal.label}</Text>
          <Text style={s.reading}>{formatSignal(signal)}</Text>
        </View>
        <Text style={s.chev}>{open ? "–" : "?"}</Text>
      </View>
      {open ? <Text style={s.explain}>{SIGNAL_EXPLAIN[signal.source]}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { fontSize: 28 },
  label: { fontSize: font.small, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  reading: { fontSize: font.h2, color: colors.ink, fontWeight: "600" },
  chev: { fontSize: font.h2, color: colors.muted, width: 20, textAlign: "center" },
  explain: { marginTop: 10, fontSize: font.body, color: colors.ink, lineHeight: 21 },
});
