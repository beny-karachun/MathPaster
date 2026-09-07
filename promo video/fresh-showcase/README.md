# Fresh original MathPaster showcase

A new continuous 60-second recording, with a newly written capture stage and script. No prior footage, Remotion compositions, title-card components, music, or sound-effect recordings are used.

The iframe loads the real current `mathlive/editor.html`. Playwright types the equation characters and clicks the real controls. Presentation-only adjustments center the editor, enlarge the math text, and match the recording backdrop. The text destination is a neutral working textarea, not a simulated AI answer. Saved settings are seeded only in a clean recording context.

The soundtrack is newly synthesized by `score.py`: a 96 BPM extended-chord progression, mallet arpeggios, bass, restrained percussion, and UI sounds aligned with recorded input events. It uses deterministic generated tones and noise, with no external samples.

Run from the repository root:

```sh
node 'promo video/fresh-showcase/capture.cjs'
python3 'promo video/fresh-showcase/score.py'
```

Capture metadata in `take.json` includes the startup offset and event timestamps. Trim the captured WebM at that offset to 60 seconds and mux with the new score. Final master: `promo video/exports/mathpaster-fresh-original-60s.mp4` (H.264, 1080p, AAC).
