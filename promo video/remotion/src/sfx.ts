export type Ev = { t: number; type: "key" | "click" };

/* Thin keystroke events so the typing rhythm sounds natural (~6-8 clicks/s)
   instead of firing a sample for every captured keystroke. Mouse clicks are
   always kept. */
export const thinEvents = (events: Ev[], minGapMs = 130): Ev[] => {
  const out: Ev[] = [];
  let lastKey = -Infinity;
  for (const e of [...events].sort((a, b) => a.t - b.t)) {
    if (e.type === "click") {
      out.push(e);
      continue;
    }
    if (e.t - lastKey >= minGapMs) {
      out.push(e);
      lastKey = e.t;
    }
  }
  return out;
};

import meta from "./meta.json";

const FALLBACK = ["sfx/click_001.ogg", "sfx/click_002.ogg", "sfx/click_003.ogg", "sfx/click_004.ogg"];
const custom = (meta as { customKeys?: string[] }).customKeys ?? [];
const KEY_SAMPLES = custom.length > 0 ? custom : FALLBACK;
/* real keyboard recordings need less artificial pitch spread */
const TONE_SPREAD = custom.length > 0 ? 0.012 : 0.02;

/* Deterministic per-event variation — sample + volume + slight pitch. */
export const keyVariant = (i: number) => ({
  src: KEY_SAMPLES[(i * 7) % KEY_SAMPLES.length],
  volume: 0.42 + ((i * 13) % 5) * 0.025,
  tone: 1 - 3 * TONE_SPREAD + ((i * 11) % 7) * TONE_SPREAD,
});
