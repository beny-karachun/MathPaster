import React from "react";
import { AbsoluteFill } from "remotion";
import { BG } from "./theme";

/* Shared dark backdrop with the brand's ambient glows. */
export const Glow: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <div
      style={{
        position: "absolute",
        width: 900,
        height: 900,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(79,70,229,0.20), transparent 65%)",
        top: -300,
        left: -200,
      }}
    />
    <div
      style={{
        position: "absolute",
        width: 1000,
        height: 1000,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(147,51,234,0.13), transparent 65%)",
        bottom: -400,
        right: -260,
      }}
    />
  </AbsoluteFill>
);
