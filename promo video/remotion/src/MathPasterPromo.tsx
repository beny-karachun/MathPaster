import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { TitleCard } from "./TitleCard";
import { EndCard } from "./EndCard";
import { ClipScene } from "./ClipScene";
import { FPS, TITLE_FRAMES, END_FRAMES, TRANSITION_FRAMES } from "./theme";
import { thinEvents, Ev } from "./sfx";
import meta from "./meta.json";

export const clipFrames = meta.clips.map((c) => Math.round(c.durationSec * FPS));

export const totalFrames =
  TITLE_FRAMES + clipFrames.reduce((a, b) => a + b, 0) + END_FRAMES - 4 * TRANSITION_FRAMES;

/* absolute start frame of each clip scene in the final timeline */
const clipStarts = meta.clips.map((_, i) => {
  let start = TITLE_FRAMES - TRANSITION_FRAMES;
  for (let k = 0; k < i; k++) start += clipFrames[k] - TRANSITION_FRAMES;
  return start;
});
const endStart = clipStarts[2] + clipFrames[2] - TRANSITION_FRAMES;

/* ── music ducking: smoothed typing-density envelope per frame ── */
const duck = new Float32Array(totalFrames);
{
  const target = new Float32Array(totalFrames);
  meta.clips.forEach((c, i) => {
    for (const e of thinEvents(c.events as Ev[])) {
      const f = clipStarts[i] + Math.round((e.t / 1000) * FPS);
      for (let d = -2; d <= 8; d++) {
        if (f + d >= 0 && f + d < totalFrames) target[f + d] = 1;
      }
    }
  });
  let s = 0;
  for (let i = 0; i < totalFrames; i++) {
    s += (target[i] - s) * (target[i] > s ? 0.35 : 0.07); // fast attack, slow release
    duck[i] = s;
  }
}

const musicVolume = (f: number) => {
  const fadeIn = interpolate(f, [0, FPS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [totalFrames - 3 * FPS, totalFrames - 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const base = 0.52 - 0.2 * (duck[Math.min(Math.max(f, 0), totalFrames - 1)] ?? 0);
  return base * fadeIn * fadeOut;
};

const zooms: { zoom: number; origin: string }[] = [
  { zoom: 1.06, origin: "50% 58%" }, // overview: editor + chat
  { zoom: 1.07, origin: "50% 45%" }, // autocomplete: mathfield
  { zoom: 1.08, origin: "46% 38%" }, // backslash: popover region
];

export const MathPasterPromo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={TITLE_FRAMES}>
          <TitleCard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        {meta.clips.flatMap((c, i) => {
          const scene = (
            <TransitionSeries.Sequence key={c.name} durationInFrames={clipFrames[i]}>
              <ClipScene
                src={`clips/${c.name}.mp4`}
                durationInFrames={clipFrames[i]}
                events={c.events as Ev[]}
                zoom={zooms[i].zoom}
                origin={zooms[i].origin}
                dingAfterLastClickMs={i === 0 ? 1900 : undefined}
              />
            </TransitionSeries.Sequence>
          );
          const transition = (
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />
          );
          return [scene, transition];
        })}
        <TransitionSeries.Sequence durationInFrames={END_FRAMES}>
          <EndCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* whooshes into and out of the screen-recording section */}
      <Sequence from={Math.max(0, TITLE_FRAMES - TRANSITION_FRAMES - 3)} layout="none">
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.22} />
      </Sequence>
      <Sequence from={endStart - 3} layout="none">
        <Audio src={staticFile("sfx/whoosh.wav")} volume={0.22} />
      </Sequence>

      <Audio src={staticFile("track.mp3")} loop loopVolumeCurveBehavior="extend" volume={musicVolume} />
    </AbsoluteFill>
  );
};
