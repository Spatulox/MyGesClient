#!/bin/bash
# Build the app with Wails. Usage: ./wailsbuild.sh [wails build flags...]
# e.g. ./wailsbuild.sh -platform windows/amd64
set -euo pipefail

cd "$(dirname "$0")"
. ./wails-env.sh

webkit_tags "$@"
version_ldflags "$@"
echo "wails build ${WEBKIT_TAGS[*]} ${VERSION_LDFLAGS[*]} $*"
exec wails build "${WEBKIT_TAGS[@]}" "${VERSION_LDFLAGS[@]}" "$@"
