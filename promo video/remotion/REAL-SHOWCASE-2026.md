# Real editor showcase

This replaces the animated-interface showcase. Every product shot is a browser recording of the current mathlive/editor.html. Playwright types and clicks the actual controls. No equation is injected into the field. The surrounding page is a neutral recording stage with a working text box; no AI response is simulated or sent.

Capture: 1920×1080, browser WebM at 25 fps. Edit: native speed, small continuous push-ins, crossfades, two short bookends, existing music and event-timed keyboard/click effects. The iframe background and vertical placement are adjusted for the recording canvas; the editor functionality is unchanged.

Reproduce from the repository root:

```sh
node 'promo video/recorder/serve.js'
# Separate terminal:
node 'promo video/recorder/record-real-2026.js'
python3 'promo video/recorder/prepare-real-2026.py'
cd 'promo video/remotion'
npx remotion render RealShowcase2026 ../exports/mathpaster-real-editor-60s.mp4 --codec=h264 --crf=17 --concurrency=4
```

Raw takes and event logs: recorder/raw/real-2026. The end card uses remaining time to make the edit 1,500 frames, exactly 60 seconds. If recording durations change substantially, review this timing before rendering.
