/* Prepares assets for the Remotion composition:
   - transcodes the composite recordings (raw/composite/*.webm) to mp4 in public/clips/
   - copies the event timelines, extension icon, and music track
   - writes src/meta.json with clip durations + events
   Run after re-recording:  COMPOSITE=1 node ../recorder/record.js && node prepare.js
*/
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const R = __dirname;
const RAW = path.join(R, "..", "recorder", "raw", "composite");
const PUB = path.join(R, "public");
const CLIPS = ["promo_overview", "promo_autocomplete", "promo_backslash"];

fs.mkdirSync(path.join(PUB, "clips"), { recursive: true });

const probeDur = (f) =>
  parseFloat(execFileSync("ffprobe", ["-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

const meta = { clips: [] };
for (const name of CLIPS) {
  const webm = path.join(RAW, `${name}.webm`);
  const mp4 = path.join(PUB, "clips", `${name}.mp4`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", webm, "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p", mp4]);
  const { events } = JSON.parse(fs.readFileSync(path.join(RAW, `${name}.json`)));
  meta.clips.push({ name, durationSec: probeDur(mp4), events });
  console.log(`✓ ${name} (${meta.clips.at(-1).durationSec.toFixed(1)}s, ${events.length} events)`);
}

fs.copyFileSync(path.join(R, "..", "..", "mathlive", "icons", "icon128.png"), path.join(PUB, "icon.png"));
const music = path.join(R, "..", "music", "track.mp3");
if (fs.existsSync(music)) {
  fs.copyFileSync(music, path.join(PUB, "track.mp3"));
  console.log("✓ music copied");
} else {
  console.log("ℹ no music at promo video/music/track.mp3");
}

/* ── custom keyboard samples ──
   Drop files at  promo video/sfx/ :
   - several short one-press files → used directly as variants
   - a single longer typing recording → auto-split on silences (up to 6 hits)
   When present they replace the bundled Kenney clicks. */
const SFX_SRC = path.join(R, "..", "sfx");
const customDir = path.join(PUB, "sfx", "custom");
fs.rmSync(customDir, { recursive: true, force: true });
meta.customKeys = [];
const audioFiles = fs.existsSync(SFX_SRC)
  ? fs.readdirSync(SFX_SRC).filter((f) => /\.(mp3|wav|ogg|m4a|flac)$/i.test(f)).sort()
  : [];
if (audioFiles.length) {
  fs.mkdirSync(customDir, { recursive: true });
  const cut = (src, start, idx) => {
    const dest = path.join(customDir, `k_${idx}.wav`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, start)), "-i", src,
      "-t", "0.22", "-af", "afade=t=out:st=0.16:d=0.06", "-ar", "48000", dest]);
    meta.customKeys.push(`sfx/custom/k_${idx}.wav`);
  };
  if (audioFiles.length === 1 && probeDur(path.join(SFX_SRC, audioFiles[0])) > 1.5) {
    const src = path.join(SFX_SRC, audioFiles[0]);
    let log = "";
    try {
      execFileSync("ffmpeg", ["-i", src, "-af", "silencedetect=noise=-30dB:d=0.05", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    } catch (e) { log = e.stderr?.toString() ?? ""; }
    // capture stderr on success too
    if (!log) {
      const r = require("child_process").spawnSync("ffmpeg", ["-i", src, "-af", "silencedetect=noise=-30dB:d=0.05", "-f", "null", "-"]);
      log = r.stderr.toString();
    }
    const onsets = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
    if (!onsets.length || onsets[0] > 0.05) onsets.unshift(0);
    onsets.slice(0, 6).forEach((t, i) => cut(src, t - 0.004, i));
    console.log(`✓ split ${audioFiles[0]} into ${meta.customKeys.length} key samples`);
  } else {
    audioFiles.slice(0, 8).forEach((f, i) => cut(path.join(SFX_SRC, f), 0, i));
    console.log(`✓ ${meta.customKeys.length} custom key samples`);
  }
} else {
  console.log("ℹ no custom key sounds at promo video/sfx/ — using bundled clicks");
}

fs.writeFileSync(path.join(R, "src", "meta.json"), JSON.stringify(meta, null, 1));
console.log("✓ meta.json written");
