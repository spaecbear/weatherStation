import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { calendar, CAREER, careerSeason, currentRating, specialFor, type Step, RATING, suggestName, townTalk, wallEntryFor, type CareerState, type WallEntry } from "../engine";
import { Body, Button, Card, Field, H2, Screen } from "../components/ui";
import { colors, type } from "./theme";
import { Wallet } from "./ProgressScreens";
import { Chalkboard, SeasonCallCard } from "./TownScreens";
import { OfficeScene } from "../components/Scenes";
import { FIRST_WEEK_TIPS, NoteCard } from "./Onboarding";

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;

export function CareerSetupScreen({ onStart, onBack }: { onStart: (name: string, hardcore: boolean) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [hardcore, setHardcore] = useState(false);
  return (
    <Screen title="A New Forecaster" subtitle="The old forecaster retired after the Great Picnic Disaster. The station is yours."
      footer={<><Button testID="start-career" label="Take the job" disabled={!name.trim()} onPress={() => onStart(name, hardcore)} /><Button kind="ghost" label="Back" onPress={onBack} /></>}>
      <Field testID="name-input" label="Your name" value={name} onChange={setName} />
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <H2>Hardcore</H2>
          <Body muted>On retirement, everything is wiped, even the folklore journal and the history wall.</Body>
        </View>
        <Switch testID="hardcore" value={hardcore} onValueChange={setHardcore} />
      </Card>
    </Screen>
  );
}

function RatingBar({ rating }: { rating: number }) {
  const pct = (v: number) => `${(v / RATING.max) * 100}%` as const;
  return (
    <View style={{ height: 16, backgroundColor: colors.cardLo, borderWidth: 2, borderColor: colors.outline }}>
      <View style={{ width: pct(rating), height: "100%", backgroundColor: rating <= RATING.decayFloor ? colors.bad : colors.accent }} />
      <View style={{ position: "absolute", left: pct(RATING.retirementAt), top: 0, bottom: 0, width: 2, backgroundColor: colors.ink }} />
    </View>
  );
}

export type OfficeNav = "shop" | "journal" | "calibration" | "wall" | "town" | "notebook";

export function OfficeScreen({ career, today, onForecast, onNav, onMenu, onSeasonCall }: { career: CareerState; today: string; onForecast: () => void; onNav: (to: OfficeNav) => void; onMenu: () => void; onSeasonCall: (s: Step) => void }) {
  const f = career.forecaster;
  const cal = calendar(f.dayCount);
  const special = specialFor(cal);
  const rating = currentRating(career, today);
  const talk = townTalk(career, today);
  return (
    <Screen title="The Office" subtitle={`${f.name}, the town's ${ordinal(career.generation)} forecaster${career.hardcore ? " · Hardcore" : ""}`}
      footer={<><Button testID="career-forecast" label={`Forecast day ${f.dayCount + 1}`} onPress={onForecast} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button testID="nav-shop" kind="ghost" label="Shop" onPress={() => onNav("shop")} /></View>
          <View style={{ flex: 1 }}><Button testID="nav-journal" kind="ghost" label="Journal" onPress={() => onNav("journal")} /></View>
          <View style={{ flex: 1 }}><Button testID="nav-town" kind="ghost" label="Town" onPress={() => onNav("town")} /></View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Button testID="nav-calibration" kind="ghost" label="Chart" onPress={() => onNav("calibration")} /></View>
          <View style={{ flex: 1 }}><Button testID="nav-notebook" kind="ghost" label="Notes" onPress={() => onNav("notebook")} /></View>
          <View style={{ flex: 1 }}><Button kind="ghost" label="Wall" onPress={() => onNav("wall")} /></View>
          <View style={{ flex: 1 }}><Button kind="ghost" label="Menu" onPress={onMenu} /></View>
        </View></>}>
      <OfficeScene season={cal.season} equipment={career.equipment.filter((e) => !career.brokenEquipment.includes(e))} />
      {f.dayCount < FIRST_WEEK_TIPS.length ? (
        <NoteCard title={`Wendell's note · ${FIRST_WEEK_TIPS[f.dayCount]!.title}`} testID="office-tip">{FIRST_WEEK_TIPS[f.dayCount]!.text}</NoteCard>
      ) : null}
      <Card tone="sunk" style={{ gap: 4 }}>
        <Text testID="calendar" style={type.h2}>YEAR {cal.year} · {cal.season.toUpperCase()} · DAY {cal.dayInSeason + 1}/{CAREER.daysPerSeason}</Text>
        {special ? <Text style={[type.label, { color: colors.gold }]}>TODAY: {special.title.toUpperCase()}</Text> : null}
      </Card>
      {talk ? (
        <Card tone="gold" style={{ gap: 6 }}>
          <Text style={[type.label, { color: "#3a2e08" }]}>AROUND TOWN</Text>
          <Text testID="town-talk" style={[type.body, { color: "#1a1406" }]}>“{talk}”</Text>
        </Card>
      ) : null}
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <H2>Standing in town</H2>
          <Text testID="rating" style={type.big}>{rating}</Text>
        </View>
        <RatingBar rating={rating} />
        <Body muted>The council retires a forecaster at {RATING.retirementAt}. Only bad calls can get you there.</Body>
      </Card>
      <SeasonCallCard career={career} onCall={onSeasonCall} />
      <Chalkboard career={career} />
      <Card style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <H2>SAVINGS</H2>
        <Wallet amount={career.money} />
      </Card>
      {career.brokenEquipment.length ? (
        <Card tone="sunk"><Body>The radar is out since the last storm. Repair it at the shop.</Body></Card>
      ) : null}
      <Card style={{ gap: 4 }}>
        <Body>Days forecast: {f.dayCount}</Body>
        <Body>Perfect days: {f.perfectDays}</Body>
        <Body>Best standing: {f.peakRating}</Body>
        <Body>Season: {careerSeason(career)}</Body>
      </Card>
    </Screen>
  );
}

export function FarewellScreen({ career, today, onContinue }: { career: CareerState; today: string; onContinue: (apprentice: string) => void }) {
  const entry = wallEntryFor(career, today);
  const [name, setName] = useState(suggestName(career.seedBase, career.generation + 1));
  return (
    <Screen title="Farewell" subtitle={`${career.forecaster.name} hangs up the barometer.`}
      footer={<Button testID="farewell-continue" disabled={!career.hardcore && !name.trim()} label={career.hardcore ? "Start over" : "Welcome the apprentice"} onPress={() => onContinue(name)} />}>
      <WallCard e={entry} />
      {career.hardcore ? (
        <Body>Hardcore career: the station is cleared out. The journal, the wall, everything starts fresh.</Body>
      ) : (
        <>
          <Body>{career.forecaster.name}'s portrait goes up on the history wall. The folklore journal stays on the shelf. The equipment, the savings and the town's trust go with them.</Body>
          <Body muted>The apprentice starts at {RATING.start}. Folks will be wary at first.</Body>
          <Field testID="apprentice-name" label="Apprentice's name" value={name} onChange={setName} />
        </>
      )}
    </Screen>
  );
}

function WallCard({ e }: { e: WallEntry }) {
  return (
    <Card style={{ gap: 4 }}>
      <H2>{e.name} <Text style={{ color: colors.muted }}>· {ordinal(e.generation)}</Text></H2>
      <Body muted>{e.startedDate} → {e.retiredDate}</Body>
      <Body>{e.days} days · {e.perfectDays} perfect · best standing {e.peakRating}</Body>
      <Body>{e.howWentOut}</Body>
    </Card>
  );
}

export function HistoryWallScreen({ career, today, onBack }: { career: CareerState | null; today: string; onBack: () => void }) {
  const wall = career?.historyWall ?? [];
  return (
    <Screen title="History Wall" subtitle="Every forecaster who held the station." footer={<Button kind="ghost" label="Back" onPress={onBack} />}>
      {career ? (
        <Card tone="sunk" style={{ gap: 4 }}>
          <H2>{career.forecaster.name} <Text style={{ color: colors.gold }}>· on duty</Text></H2>
          <Body>{career.forecaster.dayCount} days · standing {currentRating(career, today)}</Body>
        </Card>
      ) : null}
      {wall.length === 0 ? <Body muted>No portraits yet. Every forecaster who retires gets one here.</Body> : null}
      {[...wall].reverse().map((e) => <WallCard key={`${e.generation}`} e={e} />)}
    </Screen>
  );
}
