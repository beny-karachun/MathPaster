# MathPaster showcase — 60 seconds

1920 × 1080, 30 fps, 1,800 frames. Animated product walkthrough based on the redesigned editor, with mathematically typeset equations. The chat is illustrative; it does not fabricate an AI response.

## Render

```sh
npx remotion render Showcase2026 ../exports/mathpaster-showcase-2026-60s.mp4 --codec=h264 --crf=17 --concurrency=4
```

## Timeline

- 00:00–00:06 — The effort of describing math in words.
- 00:06–00:13 — Introducing the visual editor and Ctrl+M.
- 00:13–00:22 — Auto-symbols: int, bounds, integrand.
- 00:22–00:30 — Fractions, sqrt, and arrow navigation.
- 00:30–00:38 — Square-bracket matrix construction.
- 00:38–00:45 — Insert inline LaTeX into a conversation.
- 00:45–00:53 — Precision, Paper, Glass, and Vaporwave.
- 00:53–01:00 — Free-extension call to action and mathpaster.com.

Audio reuses the project's existing track.mp3 and mouse-click, whoosh, and ding assets. Music fades in/out; effects are timed to visual changes. No voiceover. All animation is driven by Remotion frames, not CSS animations.

Source: src/Showcase2026.tsx. The older Promo composition is preserved.
