import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, type } from "../app/theme";

/** Chunky 16-bit panel: dark outline, light top-left bevel, dark bottom-right bevel, hard drop shadow. */
export function Panel({ children, style, tone = "card", pressed = false }: { children: ReactNode; style?: ViewStyle; tone?: "card" | "accent" | "gold" | "sunk"; pressed?: boolean }) {
  const t = {
    card: [colors.card, colors.cardHi, colors.cardLo],
    accent: [colors.accent, colors.accentHi, colors.accentLo],
    gold: [colors.gold, "#fff0a8", colors.goldLo],
    sunk: [colors.bgAlt, colors.cardLo, colors.cardHi],
  }[tone];
  const [bg, hi, lo] = pressed ? [t[0], t[2], t[1]] : t;
  return (
    <View style={[s.outer, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }] }, pressed || tone === "sunk" ? null : s.shadow]}>
      <View style={[s.bevel, { backgroundColor: bg, borderTopColor: hi, borderLeftColor: hi, borderBottomColor: lo, borderRightColor: lo }, style]}>{children}</View>
    </View>
  );
}

export function Screen({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.frame}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={type.title} accessibilityRole="header">{title.toUpperCase()}</Text>
          {subtitle ? <Text style={[type.body, { color: colors.muted, marginTop: -4 }]}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: "card" | "accent" | "gold" | "sunk" }) {
  return <Panel style={{ padding: 12, ...style }} tone={tone}>{children}</Panel>;
}

export function Button({ label, onPress, kind = "primary", disabled, testID }: { label: string; onPress: () => void; kind?: "primary" | "ghost"; disabled?: boolean; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={disabled ? undefined : onPress} style={disabled ? { opacity: 0.45 } : undefined}>
      {({ pressed }) => (
        <Panel tone={kind === "primary" ? "accent" : "card"} pressed={pressed && !disabled} style={{ paddingVertical: kind === "primary" ? 14 : 11, alignItems: "center" }}>
          <Text style={[type.h2, { color: kind === "primary" ? "#0f1a26" : colors.ink, textAlign: "center" }]}>{label.toUpperCase()}</Text>
        </Panel>
      )}
    </Pressable>
  );
}

export function Field({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Panel tone="sunk" style={{ padding: 0 }}>
        <TextInput testID={testID} value={value} onChangeText={onChange} maxLength={24} placeholderTextColor={colors.muted}
          style={[type.body, { padding: 10, fontSize: 24, color: colors.ink, outlineStyle: "none" } as object]} />
      </Panel>
    </View>
  );
}

export const Label = ({ children }: { children: ReactNode }) => <Text style={type.label}>{typeof children === "string" ? children.toUpperCase() : children}</Text>;

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[type.body, muted && { color: colors.muted }]}>{children}</Text>;
}

export function H2({ children, color }: { children: ReactNode; color?: string }) {
  return <Text style={[type.h2, color ? { color } : null]}>{children}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  scroll: { padding: 16, paddingBottom: 24, gap: 14 },
  footer: { padding: 16, paddingTop: 12, gap: 10, borderTopWidth: 3, borderColor: colors.outline, backgroundColor: colors.bgAlt },
  outer: { borderWidth: 2, borderColor: colors.outline },
  shadow: { shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.6, shadowRadius: 0, elevation: 3 },
  bevel: { borderWidth: 3 },
});
