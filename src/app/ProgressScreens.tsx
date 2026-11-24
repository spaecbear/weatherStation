// Phase 4 screens: shop, folklore journal, calibration chart. Display only.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  calibrationBars, canBuy, EQUIPMENT, FOLK, FOLK_SIGNS, journalSettled, journalTier, RADAR, SOURCES,
  type Calibration, type CareerState, type EquipmentId, type Tier,
} from "../engine";
import { Body, Button, Card, H2, Label, Panel, Screen } from "../components/ui";
import { Icon } from "../components/Sprite";
import { COIN, ICON_PALETTE, RAIN_GAUGE, SOURCE_ICONS } from "../components/pixelArt";
import { colors, type } from "./theme";
import { money, pct, SIGNAL_EXPLAIN } from "./signalText";

// ---------- Shop ----------

const EQUIP_ICON: Record<EquipmentId, string[]> = {
  rainGauge: RAIN_GAUGE,
  upstreamRadio: SOURCE_ICONS.upstreamRadio,
  weatherBalloon: SOURCE_ICONS.weatherBalloon,
  radar: SOURCE_ICONS.radar,
};
const EQUIP_TEXT: Record<EquipmentId, string> = {
  rainGauge: "A proper gauge to check the hygrometer against. Humidity readings get much sharper.",
  upstreamRadio: "A line to the station upriver. Tells you when the front will reach town.",
  weatherBalloon: "Measures winds aloft. A big help on wind calls.",
  radar: "Times the front better than the radio. Big storms can knock it out.",
};

export function Wallet({ amount }: { amount: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Icon rows={COIN} palette={ICON_PALETTE} px={3} />
      <Text testID="money" style={[type.big, { color: colors.gold }]}>{money(amount)}</Text>
    </View>
  );
}

export function ShopScreen({ career, onBuy, onRepair, onBack }: { career: CareerState; onBuy: (id: EquipmentId) => void; onRepair: (id: EquipmentId) => void; onBack: () => void }) {
  const ids = Object.keys(EQUIPMENT) as EquipmentId[];
  return (
    <Screen title="The Shop" subtitle="Mail-order instruments for a small-town station." footer={<Button kind="ghost" label="Back to the office" onPress={onBack} />}>
      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H2>SAVINGS</H2>
        <Wallet amount={career.money} />
      </Card>
      {ids.map((id) => {
        const e = EQUIPMENT[id];
        const owned = career.equipment.includes(id);
        const broken = career.brokenEquipment.includes(id);
        return (
          <Card key={id} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Panel tone="sunk" style={{ padding: 5 }}><Icon rows={EQUIP_ICON[id]} palette={ICON_PALETTE} px={3} /></Panel>
              <View style={{ flex: 1, gap: 4 }}>
                <H2>{e.label.toUpperCase()}</H2>
                <Text style={[type.label, { color: broken ? colors.bad : owned ? colors.good : colors.gold }]}>
                  {broken ? "BROKEN IN THE STORM" : owned ? "INSTALLED" : money(e.price)}
                </Text>
              </View>
            </View>
            <Body muted>{EQUIP_TEXT[id]}</Body>
            {broken ? (
              <Button testID={`repair-${id}`} label={`Repair ${money(RADAR.repairCost)}`} disabled={career.money < RADAR.repairCost} onPress={() => onRepair(id)} />
            ) : owned ? null : (
              <Button testID={`buy-${id}`} label={`Buy ${money(e.price)}`} disabled={!canBuy(career, id)} onPress={() => onBuy(id)} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

// ---------- Folklore journal ----------

const TIER_COLOR: Record<Tier, string> = { Unknown: colors.muted, Nonsense: colors.bad, Hunch: colors.ink, Decent: colors.accentHi, Trusty: colors.good };
const TIER_NOTE: Record<Tier, string> = {
  Unknown: "Not enough days yet.",
  Nonsense: "No better than a coin flip.",
  Hunch: "Slightly better than a guess.",
  Decent: "Worth a look.",
  Trusty: "As good as any instrument.",
};

export function JournalScreen({ career, onBack }: { career: CareerState; onBack: () => void }) {
  return (
    <Screen title="Folklore Journal" subtitle="Every omen, tested against the sky. Passed down through every forecaster." footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      {FOLK_SIGNS.map((id) => {
        const e = career.journal[id];
        const tier = journalTier(e);
        return (
          <Card key={id} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Panel tone="sunk" style={{ padding: 5 }}><Icon rows={SOURCE_ICONS[id]} palette={ICON_PALETTE} px={3} /></Panel>
              <View style={{ flex: 1, gap: 4 }}>
                <H2>{SOURCES[id].label.toUpperCase()}</H2>
                <Text testID={`tier-${id}`} style={[type.h2, { color: TIER_COLOR[tier] }]}>{tier.toUpperCase()}{tier !== "Unknown" && !journalSettled(e) ? <Text style={[type.label, { color: colors.muted }]}>  EARLY READ</Text> : null}</Text>
              </View>
            </View>
            <Body muted>{SIGNAL_EXPLAIN[id]}</Body>
            <Body>
              {e ? `Right ${e.agreed} of ${e.samples} days (${pct(e.agreed / e.samples)}). ` : "Never seen yet. "}
              {tier === "Unknown" && e ? `${FOLK.minSamples - e.samples} more days to judge.` : TIER_NOTE[tier]}
              {tier !== "Unknown" && !journalSettled(e) ? " Too few days to be sure yet." : ""}
            </Body>
          </Card>
        );
      })}
    </Screen>
  );
}

// ---------- Calibration chart ----------

const CHART_H = 150;

/** One series (how often it happened), with the step you picked as a reference tick. Tap a bar for detail. */
export function CalibrationChart({ cal }: { cal: Calibration }) {
  const bars = calibrationBars(cal);
  const [sel, setSel] = useState<number | null>(null);
  const chosen = sel !== null ? bars[sel]! : null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {/* y axis */}
        <View style={{ width: 32, height: CHART_H, justifyContent: "space-between", alignItems: "flex-end" }}>
          {["100%", "50%", "0%"].map((t) => <Text key={t} style={[type.label, { fontSize: 7 }]}>{t}</Text>)}
        </View>
        <View style={{ flex: 1, height: CHART_H, flexDirection: "row", alignItems: "flex-end", gap: 6, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: colors.line }}>
          {/* recessive 50% gridline */}
          <View style={{ position: "absolute", left: 0, right: 0, bottom: CHART_H / 2, height: 1, backgroundColor: colors.cardHi }} />
          {bars.map((b, i) => (
            <Pressable key={b.step} testID={`cal-bar-${b.step}`} accessibilityLabel={b.rate === null ? `${pct(b.step)}: needs ${b.needed} more` : `When you said ${pct(b.step)}, it happened ${pct(b.rate)} of the time`}
              onPress={() => setSel(sel === i ? null : i)} style={{ flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center" }}>
              {b.rate !== null ? (
                <>
                  <View style={{ width: "70%", height: Math.max(3, b.rate * (CHART_H - 22)), backgroundColor: sel === i ? colors.accentHi : colors.accent, borderWidth: 2, borderColor: colors.outline, borderBottomWidth: 0 }} />
                </>
              ) : (
                <Text style={[type.label, { fontSize: 7, textAlign: "center", marginBottom: 6 }]}>{`NEEDS\n${b.needed}\nMORE`}</Text>
              )}
              {/* reference tick: where a perfectly calibrated bar would reach */}
              <View style={{ position: "absolute", bottom: b.step * (CHART_H - 22) - 1, width: "90%", height: 3, backgroundColor: colors.gold }} />
            </Pressable>
          ))}
        </View>
      </View>
      {/* table row: what you said / how often it happened */}
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Text style={[type.label, { width: 32, fontSize: 7 }]}>SAID</Text>
        {bars.map((b) => <Text key={b.step} style={[type.label, { flex: 1, textAlign: "center", color: colors.ink }]}>{pct(b.step)}</Text>)}
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Text style={[type.label, { width: 32, fontSize: 7 }]}>REAL</Text>
        {bars.map((b) => <Text key={b.step} testID={`cal-rate-${b.step}`} style={[type.label, { flex: 1, textAlign: "center", color: b.rate === null ? colors.muted : colors.accentHi }]}>{b.rate === null ? "--" : pct(b.rate)}</Text>)}
      </View>
      <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 12, height: 12, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.outline }} /><Label>How often it happened</Label></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><View style={{ width: 14, height: 3, backgroundColor: colors.gold }} /><Label>What you said</Label></View>
      </View>
      <Panel tone="sunk" style={{ padding: 10 }}>
        <Body>
          {chosen
            ? chosen.rate === null
              ? `You've said ${pct(chosen.step)} ${chosen.n} time${chosen.n === 1 ? "" : "s"}. ${chosen.needed} more to chart it.`
              : `When you said ${pct(chosen.step)}, it happened ${pct(chosen.rate)} of the time (${chosen.n} calls).`
            : "Tap a bar for details. Close to the gold line means your confidence is honest."}
        </Body>
      </Panel>
    </View>
  );
}

export function CalibrationScreen({ cal, onBack }: { cal: Calibration; onBack: () => void }) {
  const total = calibrationBars(cal).reduce((a, b) => a + b.n, 0);
  return (
    <Screen title="Calibration" subtitle="Are your 70% calls right 70% of the time? Career and Daily calls count." footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      <Card><CalibrationChart cal={cal} /></Card>
      <Body muted>{total} calls recorded. Each step needs at least 10 before its bar appears.</Body>
    </Screen>
  );
}
