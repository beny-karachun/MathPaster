#!/usr/bin/env bash
# Sync the shared editor files from mathlive/ (the source of truth) into
# docs/, which GitHub Pages serves as the live demo at mathpaster.com.
# Run this after any change to editor.html, editor.js, or lib/.
set -euo pipefail
cd "$(dirname "$0")/.."

cp mathlive/editor.html docs/editor.html
cp mathlive/editor.js   docs/editor.js
rm -rf docs/lib
cp -r mathlive/lib docs/lib

echo "docs/ synced from mathlive/ (editor.html, editor.js, lib/)"
