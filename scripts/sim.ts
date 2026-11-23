import {
  FORECAST_STEPS, generateDay, playDay, seasonForIndex, mulberry32, type Day, type Step,
} from "../src/engine";

const DAYS = Number(process.argv[2] ?? 10_000);
type Bot = (p: number) => Step;

const bots: Record<string, Bot> = {
  oracle: (p) => FORECAST_STEPS.reduce((best, s) => (Math.abs(s - p) < Math.abs(best - p) ? s : best)) as Step,
  coward: () => 0.5,
  gambler: (p) => (p >= 0.5 ? 0.9 : 0.1),
};

const totals: Record<string, { rep: number; perfect: number; bonus: number }> = {};
for (const name of Object.keys(bots)) totals[name] = { rep: 0, perfect: 0, bonus: 0 };
const bins = new Array(10).fill(0) as number[];
const byType: Record<string, number[]> = {};

const master = mulberry32(20261123);
for (let i = 0; i < DAYS; i++) {
  const seed = Math.floor(master() * 2 ** 32);
  const day: Day = generateDay(seed, seasonForIndex(Math.floor(i / 90)));
  for (const q of day.questions) {
    bins[Math.min(9, Math.floor(q.trueProbability * 10))]!++;
    (byType[q.type] ??= []).push(q.trueProbability);
  }
  for (const [name, bot] of Object.entries(bots)) {
    const forecasts = Object.fromEntries(day.questions.map((q) => [q.id, bot(q.trueProbability)]));
    // Score as "daily" so the participation trickle doesn't blur the comparison.
    const { score } = playDay(day, forecasts, "daily");
    totals[name]!.rep += score.total;
    totals[name]!.bonus += score.perfectBonus;
    if (score.perfectBonus > 0) totals[name]!.perfect++;
  }
}

console.log(`\nWeather Station sim: ${DAYS} days, 3 questions/day\n`);
console.log("Bot       avg rep/day   from calls   from bonus   perfect days");
for (const [name, t] of Object.entries(totals)) {
  console.log(
    `${name.padEnd(9)} ${(t.rep / DAYS).toFixed(2).padStart(11)}   ${((t.rep - t.bonus) / DAYS).toFixed(2).padStart(10)}   ${(t.bonus / DAYS).toFixed(2).padStart(10)}   ${((100 * t.perfect) / DAYS).toFixed(1).padStart(11)}%`,
  );
}
const avg = (n: string) => totals[n]!.rep / DAYS;
const ok = avg("oracle") > avg("coward") && avg("coward") > avg("gambler");
console.log(`\nExpected oracle > coward > gambler: ${ok ? "YES" : "NO  <-- see README tuning notes"}`);

console.log("\nTrue probability histogram (all questions)");
const total = bins.reduce((a, b) => a + b, 0);
const maxBin = Math.max(...bins);
bins.forEach((n, i) => {
  const label = `${String(i * 10).padStart(2)}-${String(i * 10 + 10).padStart(3)}%`;
  console.log(`${label} ${"#".repeat(Math.round((50 * n) / maxBin)).padEnd(50)} ${((100 * n) / total).toFixed(1)}%`);
});

console.log("\nMean / share in 5–95% by question type");
for (const [t, ps] of Object.entries(byType)) {
  const mean = ps.reduce((a, b) => a + b, 0) / ps.length;
  const mid = ps.filter((p) => p >= 0.05 && p <= 0.95).length / ps.length;
  console.log(`${t.padEnd(15)} mean ${mean.toFixed(2)}  in-range ${(100 * mid).toFixed(0)}%  n=${ps.length}`);
}
