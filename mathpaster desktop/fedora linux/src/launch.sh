#!/bin/sh
# Ozone is initialized before Electron loads main.js. Select the backend here,
# not with app.commandLine.appendSwitch(), which only affects child processes.
set -eu
launcher_dir=$(dirname -- "$(readlink -f -- "$0")")
if [ -x "$launcher_dir/mathpaster.bin" ]; then
  set -- "$launcher_dir/mathpaster.bin" "$@"
else
  set -- "$launcher_dir/../node_modules/electron/dist/electron" "$launcher_dir/.." "$@"
fi

select_x11=${DISPLAY:-}
for argument in "$@"; do
  case "$argument" in --ozone-platform|--ozone-platform=*) select_x11= ;; esac
done
if [ -n "$select_x11" ]; then
  executable=$1
  shift
  set -- "$executable" --ozone-platform=x11 "$@"
fi

# Development tools sometimes export this; the desktop must run Electron, not Node.
unset ELECTRON_RUN_AS_NODE
exec "$@"
