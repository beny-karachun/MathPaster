#!/usr/bin/env bash
# Sync the shared editor files from mathlive/ (the source of truth) into
# docs/, which GitHub Pages serves as the live demo at mathpaster.com.
# Run this after any change to editor.html, editor.css, src/, or lib/.
set -euo pipefail
cd "$(dirname "$0")/.."

cp mathlive/editor.html docs/editor.html
cp mathlive/editor.css  docs/editor.css
rm -f docs/editor.js              # legacy single-file build, now split into src/
rm -rf docs/src
cp -r mathlive/src docs/src
rm -rf docs/lib
cp -r mathlive/lib docs/lib

echo "docs/ synced from mathlive/ (editor.html, editor.css, src/, lib/)"
