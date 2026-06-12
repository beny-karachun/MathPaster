import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Glow } from "./Glow";

const { fontFamily } = loadFont("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });

const enter = (frame: number, from: number, dur = 24) =>
  interpolate(frame, [from, from + dur], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const pop = (frame: number, from: number, dur = 22) =>
  interpolate(frame, [from, from + dur], [0, 1], {
    easing: Easing.bezier(0.34, 1.45, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = pop(frame, 2);
  const title = enter(frame, 10);
  const sub = enter(frame, 20);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Glow />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}
      >
        <Img
          src={staticFile("icon.png")}
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            boxShadow: "0 26px 80px rgba(79,70,229,0.45)",
            transform: `scale(${0.5 + 0.5 * icon})`,
            opacity: icon,
          }}
        />
        <h1
          style={{
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
            background: "linear-gradient(135deg, #e0e7ff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: title,
            transform: `translateY(${(1 - title) * 36}px)`,
          }}
        >
          MathPaster
        </h1>
        <p
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#94a3b8",
            margin: 0,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 28}px)`,
          }}
        >
          Easy math for AI chatbots — ChatGPT, Claude, Gemini
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
