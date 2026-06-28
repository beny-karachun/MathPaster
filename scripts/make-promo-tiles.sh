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
# Usage:
#   scripts/make-promo-tiles.sh [SCREENSHOT_PNG]
#
# SCREENSHOT_PNG defaults to assets/promo_1280x800.png. Any aspect ratio works;
# it is fitted (not stretched) into the marquee's right panel.
#
# Requires ImageMagick 7 (`magick`) or 6 (`convert`).

set -euo pipefail

# ── Resolve paths relative to repo root (parent of this script's dir) ──────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC="${1:-$ROOT/assets/promo_1280x800.png}"
ICON="$ROOT/mathlive/icons/icon128.png"
OUT_MARQUEE="$ROOT/assets/marquee-1400x560.png"
OUT_SMALL="$ROOT/assets/small-tile-440x280.png"

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

# ── Pick a bold sans font (graceful fallback) ──────────────────────────────────
FONT=""
for f in \
  /usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf \
  /usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf \
  /usr/share/fonts/TTF/Arial-Bold.ttf; do
  [ -f "$f" ] && FONT="$f" && break
done
if [ -n "$FONT" ]; then FONT_ARG=(-font "$FONT"); else FONT_ARG=(); fi  # IM default if none

[ -f "$SRC" ]  || { echo "ERROR: screenshot not found: $SRC" >&2; exit 1; }
[ -f "$ICON" ] || { echo "ERROR: icon not found: $ICON" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Round the corners of an image and add a soft drop shadow.
# $1=input  $2=output  $3=corner radius
round_and_shadow() {
  local in="$1" out="$2" r="$3"
  "$IM" "$in" \
    \( +clone -alpha transparent -background none \
       -fill white -draw "roundrectangle 0,0,%[fx:w-1],%[fx:h-1],$r,$r" \) \
    -compose DstIn -composite "$TMP/rounded.png"
  "$IM" "$TMP/rounded.png" \
    \( +clone -background black -shadow 55x18+0+12 \) \
    +swap -background none -layers merge +repage "$out"
}

# ── 1. MARQUEE 1400x560 ────────────────────────────────────────────────────────
# Diagonal brand gradient base + soft accent glow behind the screenshot.
"$IM" -size 1400x560 -define gradient:angle=135 "gradient:${GRAD_FROM}-${GRAD_TO}" \
  \( -size 1400x560 xc:black -fill "$ACCENT" \
     -draw "circle 1040,170 1040,470" -blur 0x150 \) \
  -compose Screen -composite \
  "$TMP/marquee-bg.png"

# Screenshot panel: fit to ~720px wide, round corners, drop shadow.
"$IM" "$SRC" -resize 720x460 "$TMP/shot-fit.png"
round_and_shadow "$TMP/shot-fit.png" "$TMP/shot.png" 22

# Compose: background ← screenshot (right) ← icon + text (left).
"$IM" "$TMP/marquee-bg.png" \
  "$TMP/shot.png" -gravity East -geometry +70+0 -compose Over -composite \
  "$ICON" -gravity NorthWest -geometry +90+150 -compose Over -composite \
  "${FONT_ARG[@]}" -gravity NorthWest \
  -fill "$TITLE_FG"   -pointsize 74 -annotate +88+300 "MathPaster" \
  -fill "$TAGLINE_FG" -pointsize 30 -annotate +92+360 "Easy math for AI chatbots" \
  -fill "$SUBTLE_FG"  -pointsize 24 -annotate +92+410 "ChatGPT · Claude · Gemini — press Ctrl+M" \
  "$OUT_MARQUEE"

# ── 2. SMALL TILE 440x280 ──────────────────────────────────────────────────────
# Centered icon + wordmark on the same brand gradient (no screenshot — too small).
"$IM" -size 440x280 -define gradient:angle=135 "gradient:${GRAD_FROM}-${GRAD_TO}" \
  \( -size 440x280 xc:black -fill "$ACCENT" \
     -draw "circle 330,60 330,200" -blur 0x90 \) \
  -compose Screen -composite \
  \( "$ICON" -resize 92x92 \) -gravity North -geometry +0+44 -compose Over -composite \
  "${FONT_ARG[@]}" -gravity North \
  -fill "$TITLE_FG"   -pointsize 40 -annotate +0+150 "MathPaster" \
  -fill "$TAGLINE_FG" -pointsize 19 -annotate +0+205 "Easy math for AI chatbots" \
  "$OUT_SMALL"

# ── Report ─────────────────────────────────────────────────────────────────────
echo "Generated:"
for f in "$OUT_MARQUEE" "$OUT_SMALL"; do
  printf '  %s  (%s)\n' "$f" "$("$IM" identify -format '%wx%h' "$f")"
done
