# Moving-camera showcase

60-second, 1920×1080, 60 fps edit of actual MathPaster browser recordings, with a simulated AI conversation. The chat and reply are clearly labeled illustrative; editor typing and insertion use the real editor. No AI service is contacted.

- `capture-ai.cjs`: captures real integral entry and insertion into `ai-stage.html`, then the illustrative answer.
- `score.py`: synthesizes original music and remaps recorded keystroke/click events to the new edit.
- `../remotion/src/MotionCut.tsx`: camera choreography, cuts, typography and audio.
- Source footage: fresh-showcase's new recording and motion-showcase's chat recording. No footage from the older promo/template.

Run capture, transcode the resulting WebM after the offset in take.json into remotion/public/motion-cut/ai.mp4, and generate score.py. Copy fresh-showcase's MP4 as editor.mp4 and the score as score.wav into the same public directory. Run prepare.py to trim and retime individual shots. Render the MotionProof composition (3600 frames at 60 fps). Generated media is ignored.
