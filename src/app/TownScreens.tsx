// Phase 5 screens: dialogue scenes, the Gazette, the notebook, the town board, the season call.
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import {
  calendar, CAREER, CLIENTS, NOTEBOOK, RIVAL, SCENES, seasonCallAvailable, seasonCallText, stakePreview, TOWN,
  type CareerState, type ClientId, type Headline, type Step,
} from "../engine";
import { Body, Button, Card, H2, Label, Panel, Screen } from "../components/ui";
import { StepSelector } from "../components/StepSelector";
import { Icon } from "../components/Sprite";
import { BOOK, ICON_PALETTE, SUN } from "../components/pixelArt";
import { colors, fonts, type } from "./theme";
import { pct, signed } from "./signalText";

export type StoryItem = { kind: "scene"; id: string } | { kind: "page"; index: number } | { kind: "headline"; h: Headline };

// ---------- Scenes ----------

export function SceneCard({ id }: { id: string }) {
  const sc = SCENES[id];
  if (!sc) return null;
  return (
    <Card tone="sunk" style={{ gap: 8 }}>
      <Label>{sc.title}</Label>
      <Text style={[type.h2, { color: colors.gold }]}>{sc.speaker.toUpperCase()}</Text>
      {sc.lines.map((l, i) => <Body key={i}>“{l}”</Body>)}
    </Card>
  );
}

// ---------- The Gazette front page ----------

function Newspaper({ h }: { h: Headline }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start(); }, [pop]);
  return (
    <Animated.View style={{ transform: [{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "-1deg"] }) }, { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
      <View style={{ backgroundColor: "#ece4cf", borderWidth: 3, borderColor: colors.outline, padding: 14, gap: 10 }}>
        <Text style={{ fontFamily: fonts.pixel, fontSize: 13, color: "#1b1a17", textAlign: "center" }}>THE VALLEY GAZETTE</Text>
        <View style={{ height: 3, backgroundColor: "#1b1a17" }} />
        <Text style={{ fontFamily: fonts.pixel, fontSize: 8, color: "#5a5445", textAlign: "center" }}>{h.kicker}</Text>
        <Text testID="headline" style={{ fontFamily: fonts.pixel, fontSize: 16, lineHeight: 24, color: "#1b1a17", textAlign: "center" }}>{h.title}</Text>
        <View style={{ height: 1, backgroundColor: "#1b1a17" }} />
        <Text style={{ fontFamily: fonts.body, fontSize: 21, lineHeight: 22, color: "#2d2a22" }}>{h.body}</Text>
      </View>
    </Animated.View>
  );
}

// ---------- After-day story sequence ----------

export function StoryScreen({ items, onDone }: { items: StoryItem[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const item = items[i]!;
  const last = i === items.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));
  const title = item.kind === "scene" ? "In Town" : item.kind === "page" ? "The Notebook" : item.h.celebrate ? "Hot off the press!" : "Hot off the press";
  return (
    <Screen title={title} footer={<Button testID="story-next" label={last ? "Continue" : "Next"} onPress={next} />}>
      {item.kind === "scene" ? <SceneCard id={item.id} /> : null}
      {item.kind === "page" ? <NotebookPageCard index={item.index} fresh /> : null}
      {item.kind === "headline" ? (
        <>
          {item.h.celebrate ? (
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 14 }}>
              {[0, 1, 2].map((k) => <Icon key={k} rows={SUN} palette={{ y: colors.gold, Y: "#fff" }} px={3} />)}
            </View>
          ) : null}
          <Newspaper h={item.h} />
        </>
      ) : null}
      <Text style={[type.label, { textAlign: "center" }]}>{i + 1} / {items.length}</Text>
    </Screen>
  );
}

// ---------- Notebook ----------

function NotebookPageCard({ index, fresh }: { index: number; fresh?: boolean }) {
  const p = NOTEBOOK[index]!;
  return (
    <View style={{ backgroundColor: "#e9dfc4", borderWidth: 3, borderColor: colors.outline, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon rows={BOOK} palette={ICON_PALETTE} px={2} />
        <Text style={{ fontFamily: fonts.pixel, fontSize: 9, color: "#4a3b22" }}>{fresh ? "A NEW PAGE" : p.title.toUpperCase()}</Text>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 22, lineHeight: 23, color: "#2f2617" }}>{p.text}</Text>
    </View>
  );
}

export function NotebookScreen({ career, onBack }: { career: CareerState; onBack: () => void }) {
  const found = [...career.notebook].sort((a, b) => a - b);
  return (
    <Screen title="Wendell's Notebook" subtitle={`Found in the station desk. ${found.length} of ${NOTEBOOK.length} pages.`} footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      {found.length === 0 ? <Body muted>The pages are stuck together. Keep forecasting.</Body> : null}
      {found.map((i) => <NotebookPageCard key={i} index={i} />)}
      {found.length < NOTEBOOK.length ? <Body muted>More pages come loose with time, and with the town's respect.</Body> : null}
    </Screen>
  );
}

// ---------- Town board: clients, chalkboard, gazette ----------

function TrustBar({ v }: { v: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 3 }}>
      {Array.from({ length: TOWN.trustMax }, (_, i) => (
        <View key={i} style={{ width: 16, height: 10, borderWidth: 2, borderColor: colors.outline, backgroundColor: v >= i + 1 ? colors.good : v > i ? colors.accentLo : colors.cardLo }} />
      ))}
    </View>
  );
}

export function Chalkboard({ career }: { career: CareerState }) {
  const b = career.chalk;
  const season = calendar(b.seasonIndex * CAREER.daysPerSeason).season;
  return (
    <View style={{ backgroundColor: "#24352c", borderWidth: 3, borderColor: "#6b4a32", padding: 12, gap: 6 }}>
      <Text style={{ fontFamily: fonts.pixel, fontSize: 9, color: "#cfe0d3" }}>DORIS'S CHALKBOARD · {season.toUpperCase()}</Text>
      {[[career.forecaster.name, b.you, b.youWins], [RIVAL.name.split(",")[0]!, b.rival, b.rivalWins]].map(([n, rep, w]) => (
        <View key={String(n)} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.body, fontSize: 22, color: "#f2f2ea" }}>{n}</Text>
          <Text testID={`chalk-${n === career.forecaster.name ? "you" : "rival"}`} style={{ fontFamily: fonts.body, fontSize: 22, color: "#f2f2ea" }}>{signed(Number(rep))} rep · {w} wins</Text>
        </View>
      ))}
    </View>
  );
}

export function TownScreen({ career, onBack }: { career: CareerState; onBack: () => void }) {
  const clients = Object.keys(CLIENTS) as ClientId[];
  return (
    <Screen title="The Town" subtitle="Who's counting on you, and who's keeping score." footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      <Chalkboard career={career} />
      {career.chalkHistory.length ? (
        <Body muted>Past seasons: {career.chalkHistory.map((b) => `${b.you >= b.rival ? "W" : "L"} ${b.you}-${b.rival}`).join(" · ")}</Body>
      ) : null}
      <H2>CLIENTS</H2>
      {clients.map((id) => (
        <Card key={id} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <H2>{CLIENTS[id].name.toUpperCase()}</H2>
            <TrustBar v={career.trust[id]} />
          </View>
          <Body muted>
            Fee ${CLIENTS[id].fee} · {CLIENTS[id].seasons.length === 4 ? "all year" : CLIENTS[id].seasons.join(", ")}
            {CLIENTS[id].missMult > 1 ? " · misses cost extra trust" : ""}
            {id === "fair" ? " · one big day each summer" : ""}
          </Body>
        </Card>
      ))}
      <H2>THE GAZETTE</H2>
      {career.newspaper.length === 0 ? <Body muted>Nothing in the paper yet.</Body> : null}
      {career.newspaper.slice(0, 8).map((h, i) => (
        <Card key={i} tone="sunk" style={{ gap: 4 }}>
          <Label>Day {h.dayIndex + 1} · {h.kicker}</Label>
          <H2>{h.title}</H2>
        </Card>
      ))}
    </Screen>
  );
}

// ---------- Long-range season call (office card) ----------

export function SeasonCallCard({ career, onCall }: { career: CareerState; onCall: (s: Step) => void }) {
  const offer = seasonCallAvailable(career);
  const [step, setStep] = useState<Step | undefined>();
  const cal = calendar(career.forecaster.dayCount);
  const made = career.seasonCall && career.seasonCall.seasonIndex === cal.seasonIndex ? career.seasonCall : null;
  if (!offer && !made) return null;
  return (
    <Card style={{ gap: 10 }}>
      <Label>{`Long-range call · ${cal.season}`}</Label>
      {made ? (
        <>
          <H2>{seasonCallText(made)}</H2>
          <Body>You said {pct(made.call!)}. Resolves on the last day of the {cal.season}.</Body>
        </>
      ) : offer ? (
        <>
          <H2>{seasonCallText(offer)}</H2>
          <Body muted>Open for the first {TOWN.seasonCallDays} days of the season. Scored like any call when the season ends.</Body>
          <StepSelector testID="season-call" value={step} onChange={setStep} />
          {step ? <Body muted>If yes: {signed(stakePreview(step).ifYes)}. If no: {signed(stakePreview(step).ifNo)}.</Body> : null}
          <Button testID="season-call-lock" label="Lock in the season call" disabled={!step} onPress={() => step && onCall(step)} />
        </>
      ) : null}
    </Card>
  );
}

export { Panel };
