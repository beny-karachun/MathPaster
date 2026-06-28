#!/usr/bin/env bash
#
# make-promo-tiles.sh — generate Chrome Web Store promotional graphics from
# existing 1280x800 screenshot art, branded with MathPaster's indigo→violet
# gradient.
#
# Produces:
#   assets/marquee-1400x560.png    (Marquee promo tile — featured carousel)
#   assets/small-tile-440x280.png  (Small promo tile — search/category strips)
#
# Existing outputs are NEVER overwritten unless you pass --force, so any tile
# you've hand-edited stays safe across re-runs.
#
# Usage:
#   scripts/make-promo-tiles.sh [--force] [SCREENSHOT_PNG]
#
#   --force, -f   Regenerate even if the target file already exists.
#   SCREENSHOT_PNG  Source art (default: assets/promo_1280x800.png). Any aspect
#                   ratio works; it is fitted (not stretched) into the marquee.
#
# Requires ImageMagick 7 (`magick`) or 6 (`convert`).

set -euo pipefail

# ── Resolve paths relative to repo root (parent of this script's dir) ──────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Parse arguments ────────────────────────────────────────────────────────────
FORCE=0
SRC=""
for arg in "$@"; do
  case "$arg" in
    -f|--force) FORCE=1 ;;
    -h|--help)  sed -n '2,22p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
    -*)         echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
    *)          SRC="$arg" ;;
  esac
done

SRC="${SRC:-$ROOT/assets/promo_1280x800.png}"
ICON="$ROOT/mathlive/icons/icon128.png"
OUT_MARQUEE="$ROOT/assets/marquee-1400x560.png"
OUT_SMALL="$ROOT/assets/small-tile-440x280.png"

# ── Copy (edit these to change the marquee wording) ────────────────────────────
HEADLINE="Type math AI chatbots actually understand"
# Sub-line is split across two rows so it fits the left column without crowding
# the screenshot. Keep each row short.
SUBLINE_1="Write & paste flawless LaTeX into"
SUBLINE_2="ChatGPT · Claude · Gemini or any chatbot"
SMALL_TAGLINE="Get math into any AI, instantly"

# ── Brand tokens (from the extension's popup.css) ──────────────────────────────
GRAD_FROM="#2b2860"   # deep indigo
GRAD_TO="#0f1022"     # near-black base
ACCENT="#6366f1"      # indigo accent (glow)
TITLE_FG="#ffffff"
TAGLINE_FG="#bdbfe8"  # light lavender
SUBTLE_FG="#8487bd"   # muted lavender

# ── Pick ImageMagick command ───────────────────────────────────────────────────
if command -v magick >/dev/null 2>&1; then IM="magick"
elif command -v convert >/dev/null 2>&1; then IM="convert"
else echo "ERROR: ImageMagick not found (need 'magick' or 'convert')." >&2; exit 1
fi

# ── Pick a bold sans font (graceful fallback to IM default) ────────────────────
FONT_ARG=()
for f in \
  /usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf \
  /usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf \
  /usr/share/fonts/TTF/Arial-Bold.ttf; do
  [ -f "$f" ] && FONT_ARG=(-font "$f") && break
done

[ -f "$SRC" ]  || { echo "ERROR: screenshot not found: $SRC" >&2; exit 1; }
[ -f "$ICON" ] || { echo "ERROR: icon not found: $ICON" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Skip generation when the target exists and --force was not passed.
should_write() {
  local out="$1"
  if [ -e "$out" ] && [ "$FORCE" -ne 1 ]; then
    echo "  skip (exists): ${out#"$ROOT"/}  — pass --force to regenerate"
    return 1
  fi
  return 0
}

report() { echo "  wrote: ${1#"$ROOT"/}  ($("$IM" identify -format '%wx%h' "$1"))"; }

# Round the corners of a square icon to its display size (≈25% squircle).
# $1=in  $2=out  $3=size(px)  $4=corner radius(px)
round_icon() {
  "$IM" "$1" -resize "${3}x${3}" \
    \( +clone -alpha transparent -background none \
       -fill white -draw "roundrectangle 0,0,%[fx:w-1],%[fx:h-1],$4,$4" \) \
    -compose DstIn -composite "$2"
}

# Round an image's corners and add a soft drop shadow.  $1=in $2=out $3=radius
round_and_shadow() {
  "$IM" "$1" \
    \( +clone -alpha transparent -background none \
       -fill white -draw "roundrectangle 0,0,%[fx:w-1],%[fx:h-1],$3,$3" \) \
    -compose DstIn -composite "$TMP/rounded.png"
  "$IM" "$TMP/rounded.png" \
    \( +clone -background black -shadow 55x18+0+12 \) \
    +swap -background none -layers merge +repage "$2"
}

# ── 1. MARQUEE 1400x560 ────────────────────────────────────────────────────────
gen_marquee() {
  # Diagonal brand gradient + soft accent glow behind the screenshot.
  "$IM" -size 1400x560 -define gradient:angle=135 "gradient:${GRAD_FROM}-${GRAD_TO}" \
    \( -size 1400x560 xc:black -fill "$ACCENT" \
       -draw "circle 1005,150 1005,450" -blur 0x150 \) \
    -compose Screen -composite \
    "$TMP/marquee-bg.png"

  # Screenshot panel: fit ~600px wide (leaves room for the longer headline),
  # round corners, drop shadow.
  "$IM" "$SRC" -resize 600x "$TMP/shot-fit.png"
  round_and_shadow "$TMP/shot-fit.png" "$TMP/shot.png" 22
  round_icon "$ICON" "$TMP/icon-marquee.png" 128 32

  # Compose: background ← screenshot (right) ← icon + text (left).
  "$IM" "$TMP/marquee-bg.png" \
    "$TMP/shot.png" -gravity East -geometry +50+0 -compose Over -composite \
    "$TMP/icon-marquee.png" -gravity NorthWest -geometry +90+116 -compose Over -composite \
    "${FONT_ARG[@]}" -gravity NorthWest \
    -fill "$TITLE_FG"   -pointsize 60 -annotate +90+296 "MathPaster" \
    -fill "$TAGLINE_FG" -pointsize 28 -annotate +92+348 "$HEADLINE" \
    -fill "$SUBTLE_FG"  -pointsize 20 -annotate +92+392 "$SUBLINE_1" \
    -fill "$SUBTLE_FG"  -pointsize 20 -annotate +92+420 "$SUBLINE_2" \
    "$OUT_MARQUEE"
}

# ── 2. SMALL TILE 440x280 ──────────────────────────────────────────────────────
gen_small() {
  round_icon "$ICON" "$TMP/icon-sm.png" 88 22
  "$IM" -size 440x280 -define gradient:angle=135 "gradient:${GRAD_FROM}-${GRAD_TO}" \
    \( -size 440x280 xc:black -fill "$ACCENT" \
       -draw "circle 330,60 330,200" -blur 0x90 \) \
    -compose Screen -composite \
    "$TMP/icon-sm.png" -gravity North -geometry +0+50 -compose Over -composite \
    "${FONT_ARG[@]}" -gravity North \
    -fill "$TITLE_FG"   -pointsize 38 -annotate +0+172 "MathPaster" \
    -fill "$TAGLINE_FG" -pointsize 19 -annotate +0+218 "$SMALL_TAGLINE" \
    "$OUT_SMALL"
}

# ── Run ────────────────────────────────────────────────────────────────────────
echo "Promo tiles:"
if should_write "$OUT_MARQUEE"; then gen_marquee; report "$OUT_MARQUEE"; fi
if should_write "$OUT_SMALL";   then gen_small;   report "$OUT_SMALL"; fi
exit 0
