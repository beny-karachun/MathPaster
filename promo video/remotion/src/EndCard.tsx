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

const Key: React.FC<{ children: string }> = ({ children }) => (
  <span
    style={{
      background: "linear-gradient(180deg, #1e293b, #0f172a)",
      border: "1px solid rgba(129,140,248,0.55)",
      borderBottomWidth: 3,
      borderRadius: 12,
      padding: "8px 18px",
    }}
  >
    {children}
  </span>
);

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const icon = pop(frame, 2);
  const head = enter(frame, 10);
  const pill = pop(frame, 24);
  const url = enter(frame, 36);

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <Glow />
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}
      >
        <Img
          src={staticFile("icon.png")}
          style={{
            width: 150,
            height: 150,
            borderRadius: 34,
            boxShadow: "0 26px 80px rgba(79,70,229,0.45)",
            transform: `scale(${0.5 + 0.5 * icon})`,
            opacity: icon,
          }}
        />
        <h1
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            margin: 0,
            background: "linear-gradient(135deg, #e0e7ff, #a5b4fc)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            opacity: head,
            transform: `translateY(${(1 - head) * 34}px)`,
          }}
        >
          Free on the Chrome Web Store
        </h1>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            fontSize: 32,
            fontWeight: 600,
            color: "#c7d2fe",
            background: "rgba(49,46,129,0.55)",
            border: "1px solid rgba(129,140,248,0.4)",
            borderRadius: 20,
            padding: "16px 36px",
            opacity: pill,
            transform: `scale(${0.7 + 0.3 * pill})`,
          }}
        >
          <Key>Ctrl</Key>
          <span style={{ color: "#818cf8" }}>+</span>
          <Key>M</Key>
          <span style={{ marginLeft: 8 }}>in any text box</span>
        </div>
        <p
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#818cf8",
            margin: 0,
            opacity: url,
            transform: `translateY(${(1 - url) * 24}px)`,
          }}
        >
          mathpaster.com
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
