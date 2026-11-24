import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { isFolk, type Signal, type Tier } from "../engine";
import { formatSignal, SIGNAL_EXPLAIN } from "../app/signalText";
import { colors, type } from "../app/theme";
import { Icon } from "./Sprite";
import { ICON_PALETTE, SOURCE_ICONS } from "./pixelArt";
import { Panel } from "./ui";

const TIER_COLOR: Record<Tier, string> = { Unknown: colors.muted, Nonsense: colors.bad, Hunch: colors.muted, Decent: colors.accentHi, Trusty: colors.good };

export function SignalCard({ signal, tier }: { signal: Signal; tier?: Tier }) {
  const folk = isFolk(signal.source);
  const [open, setOpen] = useState(false);
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Shows what this signal means" onPress={() => setOpen((o) => !o)}>
      <Panel style={{ padding: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Panel tone="sunk" style={{ padding: 5 }}><Icon rows={SOURCE_ICONS[signal.source]} palette={ICON_PALETTE} px={3} /></Panel>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.label}>
              {signal.label.toUpperCase()}
              {folk ? <Text style={{ color: tier ? TIER_COLOR[tier] : colors.muted }}>{`  · ${tier ? `JOURNAL: ${tier.toUpperCase()}` : "FOLKLORE"}`}</Text> : null}
            </Text>
            <Text style={[type.body, { fontSize: 24 }]}>{formatSignal(signal)}</Text>
          </View>
          <Text style={[type.h2, { color: colors.gold }]}>{open ? "-" : "?"}</Text>
        </View>
        {open ? <Text style={[type.body, { marginTop: 10, color: colors.accentHi }]}>{SIGNAL_EXPLAIN[signal.source]}</Text> : null}
      </Panel>
    </Pressable>
  );
}
