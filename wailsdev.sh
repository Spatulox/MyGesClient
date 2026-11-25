#!/bin/bash
# Run the app in development mode (hot reload of the frontend).
# Usage: ./wailsdev.sh [wails dev flags...]
#
# wails dev generates the bindings (frontend/wailsjs) itself.
set -euo pipefail

cd "$(dirname "$0")"
. ./wails-env.sh

webkit_tags "$@"
version_ldflags "$@"
echo "wails dev ${WEBKIT_TAGS[*]} ${VERSION_LDFLAGS[*]} $*"
exec wails dev "${WEBKIT_TAGS[@]}" "${VERSION_LDFLAGS[@]}" "$@"
