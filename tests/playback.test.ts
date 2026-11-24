import { describe, expect, it } from "vitest";
import {
  debriefQuestion, decidingHour, generateDay, PLAYBACK, playbackSchedule, resolveDay, seasonForIndex,
  SOURCES, STARTING_SOURCES, type SourceId,
} from "../src/engine";

const ALL = Object.keys(SOURCES) as SourceId[];

describe("playback schedule", () => {
  it("covers every hour, totals 30–60s, deterministic", () => {
    for (let i = 0; i < 1000; i++) {
      const d = generateDay(i * 17, seasonForIndex(i));
      const r = resolveDay(d);
      const s = playbackSchedule(d, r);
      expect(s.map((x) => x.hour)).toEqual(r.timeline.map((h) => h.hour));
      const total = s.reduce((a, x) => a + x.durationMs + x.holdMs, 0) / 1000;
      expect(total).toBeGreaterThanOrEqual(PLAYBACK.minTotalSeconds - 0.05);
      expect(total).toBeLessThanOrEqual(PLAYBACK.maxTotalSeconds + 0.05);
      expect(playbackSchedule(d, r)).toEqual(s);
    }
  });
  it("every question decides exactly once, and its hour is slower than a quiet hour", () => {
    for (let i = 0; i < 500; i++) {
      const d = generateDay(i, seasonForIndex(i));
      const r = resolveDay(d);
      const s = playbackSchedule(d, r);
      const quiet = s.filter((x) => x.focus.length === 0).map((x) => x.durationMs);
      for (const q of d.questions) {
        const hits = s.filter((x) => x.deciding.includes(q.id));
        expect(hits).toHaveLength(1);
        expect(hits[0]!.hour).toBe(decidingHour(q, r));
        expect(hits[0]!.holdMs).toBeGreaterThanOrEqual(1000); // the reveal always gets a beat
        if (quiet.length) expect(hits[0]!.durationMs).toBeGreaterThan(Math.max(...quiet));
      }
    }
  });
  it("near-misses linger longer", () => {
    // Compare the same day's deciding-hour step against the base slow pace.
    let checked = 0;
    for (let i = 0; i < 2000 && checked < 50; i++) {
      const d = generateDay(i, "spring");
      const r = resolveDay(d);
      const close = r.results.find((x) => x.closeness > 0.9);
      if (!close) continue;
      const s = playbackSchedule(d, r);
      const deciding = s.find((x) => x.deciding.includes(close.questionId))!;
      const nearOnly = s.filter((x) => x.focus.length && !x.deciding.length).map((x) => x.durationMs);
      if (nearOnly.length) expect(deciding.durationMs).toBeGreaterThan(Math.max(...nearOnly));
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("debrief", () => {
  it("names a signal for each question and points at locked upgrades", () => {
    let teased = 0;
    for (let i = 0; i < 500; i++) {
      const d = generateDay(i, seasonForIndex(i));
      const r = resolveDay(d);
      for (const q of d.questions) {
        const res = r.results.find((x) => x.questionId === q.id)!;
        const b = debriefQuestion(q, d, res, STARTING_SOURCES);
        expect(b.line.length).toBeGreaterThan(10);
        if (b.source) expect(STARTING_SOURCES).toContain(b.source);
        if (!b.source && b.bestSource) teased++;
        // With everything unlocked, any readable variable has a source.
        const full = debriefQuestion(q, d, res, ALL);
        if (full.bestSource) expect(full.source).toBe(full.bestSource);
      }
    }
    expect(teased).toBeGreaterThan(0);
  });
});
