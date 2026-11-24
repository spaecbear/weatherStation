// Generates every sound the game uses as small mono WAV files, procedurally, so the
// project has no third-party audio. Run: npm run sounds  (writes src/assets/sounds/*.wav)
// Deterministic: same output every run.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mulberry32 } from "../src/engine/rng";

const RATE = 22050;
const OUT = join(process.cwd(), "src/assets/sounds");
const rng = mulberry32(0x5eed);
const noise = () => rng() * 2 - 1;

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32000), i * 2);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const buf = (sec: number) => new Float32Array(Math.round(sec * RATE));
const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const square = (ph: number, duty = 0.5) => ((ph % 1) < duty ? 1 : -1);
const tri = (ph: number) => 1 - 4 * Math.abs((ph % 1) - 0.5);

/** One-pole low-pass, cutoff in Hz (may vary per sample). */
function lowpass(x: Float32Array, cutoff: (i: number) => number): Float32Array {
  const y = new Float32Array(x.length);
  let prev = 0;
  for (let i = 0; i < x.length; i++) {
    const a = 1 - Math.exp((-2 * Math.PI * cutoff(i)) / RATE);
    prev += a * (x[i]! - prev);
    y[i] = prev;
  }
  return y;
}

/** Make a loop seamless by crossfading its tail into its head. */
function loopify(x: Float32Array, fadeSec = 0.4): Float32Array {
  const n = Math.round(fadeSec * RATE);
  const y = x.slice(0, x.length - n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    y[i] = x[i]! * t + x[x.length - n + i]! * (1 - t);
  }
  return y;
}

const normalize = (x: Float32Array, peak = 0.8) => {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return x.map((v) => (v / (m || 1)) * peak);
};

/** Note sequence → chiptune voice. notes: [midi|null, beats][] */
function voice(out: Float32Array, notes: [number | null, number][], beat: number, wave: (ph: number) => number, vol: number) {
  let t = 0;
  for (const [m, beats] of notes) {
    const len = beats * beat;
    if (m !== null) {
      const f = freq(m);
      const start = Math.round(t * RATE), n = Math.round(len * RATE);
      for (let i = 0; i < n && start + i < out.length; i++) {
        const s = i / RATE;
        const env = Math.min(1, s / 0.01) * Math.exp(-s * 2.2) * (i > n - 200 ? (n - i) / 200 : 1);
        out[start + i]! += wave(f * s) * env * vol;
      }
    }
    t += len;
  }
}

const sounds: Record<string, () => Float32Array> = {
  // Calm daily theme: pentatonic lead over a gentle triangle bass. 16 beats at 80 bpm, loops.
  theme: () => {
    const beat = 60 / 80;
    const out = buf(16 * beat);
    const lead: [number | null, number][] = [
      [72, 1], [74, 0.5], [76, 0.5], [79, 1], [76, 1], [74, 1.5], [72, 0.5], [69, 1], [null, 1],
      [72, 1], [76, 1], [79, 0.5], [81, 0.5], [79, 1], [76, 1], [74, 1], [72, 1], [null, 1],
    ];
    voice(out, lead, beat, (p) => square(p, 0.25), 0.16);
    const bass: [number, number][] = [[48, 2], [55, 2], [45, 2], [52, 2], [48, 2], [55, 2], [50, 2], [55, 2]];
    voice(out, bass, beat, tri, 0.22);
    return normalize(out, 0.55);
  },
  // Wind: low-passed noise whose cutoff swells and gusts.
  wind: () => {
    const x = buf(6.4).map(noise);
    const y = lowpass(lowpass(x, (i) => 250 + 500 * (0.5 + 0.5 * Math.sin((2 * Math.PI * i) / (RATE * 3.2)))), () => 900);
    return normalize(loopify(y), 0.6);
  },
  // Rain on the roof: soft hiss plus random droplet ticks.
  rain: () => {
    const x = buf(4.4).map((_) => noise() * 0.25);
    for (let k = 0; k < 900; k++) {
      const at = Math.floor(rng() * (x.length - 300)), amp = 0.3 + rng() * 0.7;
      for (let i = 0; i < 220; i++) x[at + i]! += noise() * amp * Math.exp(-i / 30);
    }
    const hiss = lowpass(x, () => 3200);
    return normalize(loopify(hiss), 0.55);
  },
  // Distant thunder: a crack, then rolling low rumble.
  thunder: () => {
    const x = buf(3.6).map(noise);
    const env = (i: number) => { const s = i / RATE; return (s < 0.06 ? s / 0.06 : 1) * Math.exp(-s * 1.1) * (0.6 + 0.4 * Math.sin(s * 9) ** 2); };
    const y = lowpass(lowpass(x.map((v, i) => v * env(i)), () => 160), () => 220);
    return normalize(y, 0.9);
  },
  // Building cue for slowdowns: rising tremolo arpeggio, crescendo.
  build: () => {
    const out = buf(3);
    for (let i = 0; i < out.length; i++) {
      const s = i / RATE;
      const step = Math.floor(s * 8);
      const m = 60 + [0, 4, 7, 12][step % 4]! + Math.floor(step / 4) * 2;
      out[i] = square(freq(m) * s, 0.5) * (0.2 + 0.8 * (s / 3)) * (0.6 + 0.4 * Math.sin(s * 40)) * 0.25;
    }
    return normalize(out, 0.5);
  },
  // Reveal stings: right side, wrong side, a pass. Short and distinct (not just pitch).
  hit: () => { const o = buf(0.5); voice(o, [[76, 0.15], [83, 0.6]], 0.5, (p) => square(p, 0.25), 0.3); return normalize(o, 0.6); },
  miss: () => { const o = buf(0.6); voice(o, [[64, 0.2], [58, 0.8]], 0.5, tri, 0.4); return normalize(o, 0.6); },
  pass: () => { const o = buf(0.3); voice(o, [[69, 0.4]], 0.5, tri, 0.3); return normalize(o, 0.4); },
  // Perfect day fanfare.
  perfect: () => {
    const o = buf(1.6);
    voice(o, [[72, 0.25], [76, 0.25], [79, 0.25], [84, 1.25]], 0.5, (p) => square(p, 0.25), 0.25);
    voice(o, [[48, 0.75], [55, 1.25]], 0.5, tri, 0.3);
    return normalize(o, 0.7);
  },
  click: () => { const o = buf(0.05); for (let i = 0; i < o.length; i++) o[i] = square((1200 * i) / RATE) * Math.exp(-i / 200) * 0.3; return o; },
};

mkdirSync(OUT, { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  const data = wav(make());
  writeFileSync(join(OUT, `${name}.wav`), data);
  console.log(`${name.padEnd(8)} ${(data.length / 1024).toFixed(0).padStart(4)} KB`);
}
