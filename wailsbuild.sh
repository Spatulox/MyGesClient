#!/bin/bash
# Build the app with Wails. Usage: ./wailsbuild.sh [wails build flags...]
# e.g. ./wailsbuild.sh -platform windows/amd64
set -euo pipefail

cd "$(dirname "$0")"
. ./wails-env.sh

webkit_tags "$@"
echo "wails build ${WEBKIT_TAGS[*]} $*"
exec wails build "${WEBKIT_TAGS[@]}" "$@"
