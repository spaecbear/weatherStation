import { PLAYBACK, TIMELINE } from "./config";
import type { Day, Question, Resolution } from "./types";

/** The hour at which a question's answer becomes known during the day. */
export function decidingHour(q: Question, res: Resolution): number {
  const tl = res.timeline;
  const outcome = res.results.find((r) => r.questionId === q.id)?.outcome ?? false;
  const first = (pred: (h: (typeof tl)[number]) => boolean, fallback: number) => tl.find(pred)?.hour ?? fallback;
  switch (q.type) {
    case "rainToday":
      return outcome ? first((h) => h.rain > 0, TIMELINE.endHour) : TIMELINE.endHour;
    case "rainBeforeNoon":
      return outcome ? first((h) => h.rain > 0, 11) : 11;
    case "highAbove":
      return outcome ? first((h) => h.temperature > q.threshold!, TIMELINE.peakTempHour) : TIMELINE.peakTempHour;
    case "windAbove": {
      if (outcome) return first((h) => h.wind > q.threshold!, TIMELINE.peakTempHour);
      return tl.reduce((best, h) => (h.wind > best.wind ? h : best)).hour;
    }
    case "fogAtDawn":
    case "frostAtDawn":
      return TIMELINE.startHour;
    case "snowToday":
      return outcome ? first((h) => h.rain > 0, TIMELINE.endHour) : TIMELINE.endHour;
    case "allDaySun":
      return outcome ? TIMELINE.endHour : first((h) => h.rain > 0 || h.fog, TIMELINE.endHour);
    case "doubleRainbow":
      return outcome ? first((h) => Boolean(h.rainbow), TIMELINE.endHour) : TIMELINE.endHour;
    case "auroraNight":
      return TIMELINE.endHour;
    case "hundredYearStorm":
      return tl.reduce((best, h) => (h.wind > best.wind ? h : best)).hour;
  }
}

export interface PlaybackStep {
  hour: number;
  durationMs: number;
  /** Frozen time after the hour plays, while its questions are revealed. */
  holdMs: number;
  /** Questions deciding at exactly this hour. */
  deciding: string[];
  /** Questions whose deciding hour is near: highlight them. */
  focus: string[];
}

/**
 * Real-time schedule for the day animation. Time slows near each deciding
 * hour and lingers longer the closer the outcome was to flipping; then time
 * freezes briefly on the reveal. Total (including holds) is scaled into
 * [minTotalSeconds, maxTotalSeconds]; holds are never squeezed.
 */
export function playbackSchedule(day: Day, res: Resolution): PlaybackStep[] {
  const decide = day.questions.map((q) => ({
    id: q.id,
    hour: decidingHour(q, res),
    closeness: res.results.find((r) => r.questionId === q.id)?.closeness ?? 0,
  }));
  const steps = res.timeline.map(({ hour }) => {
    const near = decide.filter((d) => Math.abs(d.hour - hour) <= PLAYBACK.slowWindowHours);
    const at = decide.filter((d) => d.hour === hour);
    let s = near.length ? PLAYBACK.slowSecondsPerHour : PLAYBACK.secondsPerHour;
    for (const d of at) s += PLAYBACK.lingerSeconds * d.closeness;
    return { hour, seconds: s, deciding: at.map((d) => d.id), focus: near.map((d) => d.id) };
  });
  const hold = (s: (typeof steps)[number]) => (s.deciding.length ? PLAYBACK.revealHoldSeconds * s.deciding.length : 0);
  const holds = steps.reduce((a, s) => a + hold(s), 0);
  const total = steps.reduce((a, s) => a + s.seconds, 0);
  const target = Math.min(PLAYBACK.maxTotalSeconds, Math.max(PLAYBACK.minTotalSeconds, total + holds)) - holds;
  const k = target / total;
  return steps.map((s) => ({
    hour: s.hour,
    durationMs: Math.round(s.seconds * k * 1000),
    holdMs: Math.round(hold(s) * 1000),
    deciding: s.deciding,
    focus: s.focus,
  }));
}
