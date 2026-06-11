#!/usr/bin/env bash
# Package the extension for Chrome Web Store upload.
# Produces MathPaster.zip at the repo root (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -f MathPaster.zip
zip -r MathPaster.zip mathlive -x "mathlive/.*" "mathlive/*/.*"

echo
echo "Built MathPaster.zip:"
unzip -l MathPaster.zip | tail -2
