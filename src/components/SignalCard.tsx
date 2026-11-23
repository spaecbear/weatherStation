import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Signal } from "../engine";
import { formatSignal, SIGNAL_EXPLAIN } from "../app/signalText";
import { colors, type } from "../app/theme";
import { Icon } from "./Sprite";
import { ICON_PALETTE, SOURCE_ICONS } from "./pixelArt";
import { Panel } from "./ui";

export function SignalCard({ signal }: { signal: Signal }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Shows what this signal means" onPress={() => setOpen((o) => !o)}>
      <Panel style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Panel tone="sunk" style={{ padding: 5 }}><Icon rows={SOURCE_ICONS[signal.source]} palette={ICON_PALETTE} px={3} /></Panel>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.label}>{signal.label.toUpperCase()}</Text>
            <Text style={[type.body, { fontSize: 24 }]}>{formatSignal(signal)}</Text>
          </View>
          <Text style={[type.h2, { color: colors.gold }]}>{open ? "-" : "?"}</Text>
        </View>
        {open ? <Text style={[type.body, { marginTop: 10, color: colors.accentHi }]}>{SIGNAL_EXPLAIN[signal.source]}</Text> : null}
      </Panel>
    </Pressable>
  );
}
