import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius } from "../app/theme";

export function Screen({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <View style={s.frame}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.title} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          {children}
        </ScrollView>
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, kind = "primary", disabled, testID }: { label: string; onPress: () => void; kind?: "primary" | "ghost"; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.btn, kind === "ghost" && s.btnGhost, disabled && s.btnDisabled, pressed && !disabled && { opacity: 0.8 }]}
    >
      <Text style={[s.btnText, kind === "ghost" && s.btnGhostText]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1, width: "100%", maxWidth: 480, alignSelf: "center" },
  scroll: { padding: 16, paddingBottom: 24, gap: 12 },
  title: { fontSize: font.title, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: font.body, color: colors.muted, marginTop: -6 },
  footer: { padding: 16, paddingTop: 8, gap: 8, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 14, borderWidth: 1, borderColor: colors.line },
  btn: { backgroundColor: colors.accent, borderRadius: radius, paddingVertical: 14, alignItems: "center" },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: font.h2, fontWeight: "700" },
  btnGhostText: { color: colors.ink, fontWeight: "600", fontSize: font.body },
});

export function Field({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: font.small, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        maxLength={24}
        style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line, borderRadius: radius, padding: 12, fontSize: font.h2, color: colors.ink }}
      />
    </View>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={{ fontSize: font.body, lineHeight: 22, color: muted ? colors.muted : colors.ink }}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: font.h2, fontWeight: "700", color: colors.ink }}>{children}</Text>;
}
