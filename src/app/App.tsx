import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { PressStart2P_400Regular } from "@expo-google-fonts/press-start-2p";
import { VT323_400Regular } from "@expo-google-fonts/vt323";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  CLIENTS, makeSeasonCall, RIVAL,
  BASE_LOADOUT, buy, careerLoadout, currentStreak, dailyCalibration, FOLK_SIGNS, journalTier, mergeCalibration, repair, dailyNumber, dailyResult, generateDailyDay, generateDay, isCareerRetired, mulberry32,
  newCareer, nextCareerDay, pick, playCareerDay, playDay, SEASONS, shareCard, submitDaily, succeed, emptyCalibration,
  type CareerDayOutcome, type CareerState, type DailyState, type Day,
} from "../engine";
import { saves } from "../storage";
import { Body, Button, Card, H2, Panel } from "../components/ui";
import { MenuScreen } from "./MenuScreen";
import { Round } from "./Round";
import { CareerSetupScreen, FarewellScreen, HistoryWallScreen, OfficeScreen } from "./CareerScreens";
import { CalibrationScreen, ShopScreen, JournalScreen, Wallet } from "./ProgressScreens";
import { NotebookScreen, SceneCard, StoryScreen, TownScreen, type StoryItem } from "./TownScreens";
import { shiftClock, todayUtc } from "./clock";
import { colors } from "./theme";
import { money, signed } from "./signalText";

type Route =
  | { name: "menu" }
  | { name: "daily" }
  | { name: "zen"; seed: number }
  | { name: "careerSetup" }
  | { name: "office" }
  | { name: "careerRound"; day: Day }
  | { name: "farewell" }
  | { name: "wall"; back: "menu" | "office" }
  | { name: "shop" }
  | { name: "journal" }
  | { name: "calibration"; back: "menu" | "office" }
  | { name: "town" }
  | { name: "notebook" }
  | { name: "story"; items: StoryItem[]; then: Route };

const randomSeed = () => Math.floor(Math.random() * 2 ** 32);
const zenDay = (seed: number) => generateDay(seed, pick(mulberry32(seed ^ 0x5eaa), SEASONS));

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [career, setCareer] = useState<CareerState | null>(null);
  const [route, setRoute] = useState<Route>({ name: "menu" });
  const [today, setToday] = useState(todayUtc());
  const [lastCareerDay, setLastCareerDay] = useState<CareerDayOutcome | null>(null);
  const [copied, setCopied] = useState(false);
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular, VT323_400Regular });

  useEffect(() => {
    Promise.all([saves.loadDaily(), saves.loadCareer()]).then(([d, c]) => {
      setDaily(d);
      setCareer(c);
      setLoaded(true);
    });
  }, []);

  const toMenu = useCallback(() => {
    setToday(todayUtc());
    setRoute({ name: "menu" });
  }, []);

  const updateCareer = useCallback((c: CareerState | null) => {
    setCareer(c);
    void (c ? saves.saveCareer(c) : saves.deleteCareer());
  }, []);

  const todaysDaily = useMemo(() => generateDailyDay(today), [today]);

  if (!loaded || !daily || !fontsLoaded) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}><ActivityIndicator color={colors.accent} /></View>;
  }

  let screen: React.ReactNode;
  switch (route.name) {
    case "menu":
      screen = (
        <MenuScreen
          today={today} daily={daily} career={career}
          devNextDay={() => { shiftClock(1); setToday(todayUtc()); }}
          go={(to) => {
            if (to === "daily") { setCopied(false); setRoute({ name: "daily" }); }
            if (to === "zen") setRoute({ name: "zen", seed: randomSeed() });
            if (to === "wall") setRoute({ name: "wall", back: "menu" });
            if (to === "calibration") setRoute({ name: "calibration", back: "menu" });
            if (to === "career") setRoute(!career ? { name: "careerSetup" } : isCareerRetired(career, today) ? { name: "farewell" } : { name: "office" });
          }}
        />
      );
      break;

    case "daily": {
      const done = dailyResult(daily, today);
      const existing = done ? { calls: daily.entries[today]!.calls, result: done.result } : undefined;
      screen = (
        <Round
          key={`daily-${today}`}
          day={todaysDaily} mode="daily" loadout={BASE_LOADOUT} existing={existing}
          subtitle={`Daily Forecast #${dailyNumber(today)}`}
          onLeave={toMenu}
          commit={(calls) => {
            const next = submitDaily(daily, today, calls); // locked from here on
            setDaily(next);
            void saves.saveDaily(next);
            return dailyResult(next, today)!.result;
          }}
          verdictExtra={done ? <DailyShare text={shareCard(today, todaysDaily, done.result)} streak={currentStreak(daily, today)} copied={copied} onCopy={async (t) => { await Clipboard.setStringAsync(t); setCopied(true); }} /> : null}
          verdictActions={<Button label="Menu" onPress={toMenu} />}
        />
      );
      break;
    }

    case "zen":
      screen = (
        <Round
          key={`zen-${route.seed}`}
          day={zenDay(route.seed)} mode="zen" loadout={BASE_LOADOUT}
          subtitle="Zen"
          onLeave={toMenu}
          commit={(calls) => playDay(zenDay(route.seed), calls, "zen")}
          verdictActions={<>
            <Button testID="zen-next" label="Another day" onPress={() => setRoute({ name: "zen", seed: randomSeed() })} />
            <Button kind="ghost" label="Menu" onPress={toMenu} />
          </>}
        />
      );
      break;

    case "careerSetup":
      screen = (
        <CareerSetupScreen
          onBack={toMenu}
          onStart={(name, hardcore) => {
            updateCareer(newCareer({ name, hardcore, today, seedBase: randomSeed() }));
            setRoute({ name: "office" });
          }}
        />
      );
      break;

    case "office":
      screen = (
        <OfficeScreen
          career={career!} today={today}
          onForecast={() => { setLastCareerDay(null); setRoute({ name: "careerRound", day: nextCareerDay(career!) }); }}
          onNav={(to) => setRoute(
            to === "wall" ? { name: "wall", back: "office" } : to === "calibration" ? { name: "calibration", back: "office" }
              : to === "shop" ? { name: "shop" } : to === "town" ? { name: "town" } : to === "notebook" ? { name: "notebook" } : { name: "journal" },
          )}
          onSeasonCall={(step) => updateCareer(makeSeasonCall(career!, step))}
          onMenu={toMenu}
        />
      );
      break;

    case "careerRound": {
      const out = lastCareerDay;
      screen = (
        <Round
          key={`career-${route.day.seed}`}
          day={route.day} mode="career" loadout={careerLoadout(career!)}
          tiers={Object.fromEntries(FOLK_SIGNS.map((f) => [f, journalTier(career!.journal[f])]))}
          stationIntro={route.day.special ? <SceneCard id={route.day.special} /> : null}
          subtitle={`${career!.forecaster.name} · day ${career!.forecaster.dayCount + (out ? 0 : 1)}`}
          onLeave={() => setRoute({ name: "office" })}
          commit={(calls) => {
            const o = playCareerDay(career!, calls, today); // saved before playback
            updateCareer(o.career);
            setLastCareerDay(o);
            return o.result;
          }}
          verdictExtra={out ? (
            <Card style={{ gap: 4 }}>
              <H2>STANDING {out.ratingBefore} → {out.ratingAfter}  <H2 color={out.ratingAfter >= out.ratingBefore ? colors.good : colors.bad}>({signed(out.ratingAfter - out.ratingBefore)})</H2></H2>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Body>Pay today: {money(out.pay)}</Body>
                <Wallet amount={out.career.money} />
              </View>
              {out.contracts.map((x) => (
                <Body key={x.questionId}>
                  {CLIENTS[x.client].name}: {money(x.pay)} · trust {x.trustAfter > x.trustBefore + 0.01 ? "up" : x.trustAfter < x.trustBefore - 0.01 ? "down" : "steady"}
                </Body>
              ))}
              {out.radarBroke ? <Body>A lightning strike knocked out the radar. Repair it at the shop.</Body> : null}
              {out.retired ? <Body>The council has called a meeting...</Body> : null}
            </Card>
          ) : null}
          verdictRival={out ? { name: RIVAL.name, calls: out.rival.calls, rep: out.rival.rep, yourRep: out.yourRep } : undefined}
          verdictActions={(() => {
            if (!out) return null;
            const items: StoryItem[] = [
              ...out.story.scenes.map((id) => ({ kind: "scene" as const, id })),
              ...out.story.pages.map((index) => ({ kind: "page" as const, index })),
              ...out.story.headlines.map((h) => ({ kind: "headline" as const, h })),
            ];
            const then: Route = out.retired ? { name: "farewell" } : { name: "office" };
            const label = items.length ? (out.story.headlines.length ? "Read the Gazette" : "Meanwhile, in town...") : out.retired ? "Go to the council meeting" : "Back to the office";
            return <Button testID={items.length ? "to-story" : out.retired ? "to-farewell" : "to-office"} label={label} onPress={() => setRoute(items.length ? { name: "story", items, then } : then)} />;
          })()}
        />
      );
      break;
    }

    case "farewell":
      screen = (
        <FarewellScreen
          career={career!} today={today}
          onContinue={(apprentice) => {
            const next = succeed(career!, apprentice, today);
            updateCareer(next);
            setRoute(next ? { name: "office" } : { name: "careerSetup" });
          }}
        />
      );
      break;

    case "wall":
      screen = <HistoryWallScreen career={career} today={today} onBack={route.back === "office" ? () => setRoute({ name: "office" }) : toMenu} />;
      break;

    case "shop":
      screen = (
        <ShopScreen career={career!} onBack={() => setRoute({ name: "office" })}
          onBuy={(id) => updateCareer(buy(career!, id))}
          onRepair={(id) => updateCareer(repair(career!, id))} />
      );
      break;

    case "town":
      screen = <TownScreen career={career!} onBack={() => setRoute({ name: "office" })} />;
      break;

    case "notebook":
      screen = <NotebookScreen career={career!} onBack={() => setRoute({ name: "office" })} />;
      break;

    case "story":
      screen = <StoryScreen key={route.items.length + JSON.stringify(route.items[0])} items={route.items} onDone={() => setRoute(route.then)} />;
      break;

    case "journal":
      screen = <JournalScreen career={career!} onBack={() => setRoute({ name: "office" })} />;
      break;

    case "calibration":
      screen = (
        <CalibrationScreen
          cal={mergeCalibration(career?.calibration ?? emptyCalibration(), dailyCalibration(daily))}
          onBack={route.back === "office" ? () => setRoute({ name: "office" }) : toMenu}
        />
      );
      break;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
    </SafeAreaProvider>
  );
}

function DailyShare({ text, streak, copied, onCopy }: { text: string; streak: number; copied: boolean; onCopy: (t: string) => void }) {
  return (
    <Card style={{ gap: 8 }}>
      <H2>SHARE YOUR DAY</H2>
      <Panel tone="sunk" style={{ padding: 12 }}>
        <Body>{text}</Body>
      </Panel>
      <Button testID="copy-share" kind="ghost" label={copied ? "Copied ✓" : "Copy to clipboard"} onPress={() => onCopy(text)} />
      <Body muted>{streak > 0 ? `Daily streak: ${streak}. ` : ""}Come back tomorrow for a new sky.</Body>
    </Card>
  );
}
