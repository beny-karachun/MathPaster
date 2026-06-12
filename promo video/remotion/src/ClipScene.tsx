import React, { useMemo } from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Video, Audio } from "@remotion/media";
import { BG } from "./theme";
import { Ev, thinEvents, keyVariant } from "./sfx";

type Props = {
  src: string;
  durationInFrames: number;
  events: Ev[];
  zoom?: number;
  origin?: string;
  /* play a soft ding this many ms after the last mouse click (AI reply lands) */
  dingAfterLastClickMs?: number;
};

/* A screen-recording scene: slow sub-pixel push-in (no zoompan quantization,
   so no shaking) + keyboard/mouse SFX placed at the recorded event times. */
export const ClipScene: React.FC<Props> = ({
  src,
  durationInFrames,
  events,
  zoom = 1.06,
  origin = "50% 55%",
  dingAfterLastClickMs,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, zoom], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sounds = useMemo(() => thinEvents(events), [events]);
  const lastClick = useMemo(
    () => [...events].reverse().find((e) => e.type === "click"),
    [events]
  );

  return (
    <AbsoluteFill style={{ background: BG, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        <Video src={staticFile(src)} muted style={{ width: "100%", height: "100%" }} />
      </AbsoluteFill>
      {sounds.map((e, i) => {
        const from = Math.round((e.t / 1000) * fps);
        if (from >= durationInFrames) return null;
        if (e.type === "click") {
          return (
            <Sequence key={i} from={from} layout="none">
              <Audio src={staticFile("sfx/mouse-click.wav")} volume={0.5} />
            </Sequence>
          );
        }
        const v = keyVariant(i);
        return (
          <Sequence key={i} from={from} layout="none">
            <Audio src={staticFile(v.src)} volume={v.volume} toneFrequency={v.tone} />
          </Sequence>
        );
      })}
      {dingAfterLastClickMs !== undefined && lastClick ? (
        <Sequence
          from={Math.round(((lastClick.t + dingAfterLastClickMs) / 1000) * fps)}
          layout="none"
        >
          <Audio src={staticFile("sfx/ding.wav")} volume={0.30} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};
