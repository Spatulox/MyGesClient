#!/bin/bash
# Build the app with Wails. Usage: ./wailsbuild.sh [wails build flags...]
# e.g. ./wailsbuild.sh -platform windows/amd64
#
# Run by PackagingOnLinux for the commands of packaging.toml (locally, or in the release in
# .github/build.Dockerfile): the exe's file version (wails.json info.productVersion, digits
# only, Properties > Details) is then $APP_VERSION (1.4.0~alpha -> 1.4.0), and wails.json is
# restored afterwards.
set -euo pipefail

cd "$(dirname "$0")"
. ./wails-env.sh

webkit_tags "$@"
# Before wails.json is changed below: git describe would add -dirty.
version_ldflags "$@"

if [ -n "${APP_VERSION:-}" ]; then
    backup="$(mktemp)"
    cp wails.json "$backup"
    trap 'cp "$backup" wails.json && rm -f "$backup"' EXIT
    node -e '
        const fs = require("fs");
        const config = JSON.parse(fs.readFileSync("wails.json", "utf8"));
        config.info = { ...config.info, productVersion: process.argv[1] };
        fs.writeFileSync("wails.json", JSON.stringify(config, null, 2) + "\n");
    ' "${APP_VERSION%%[~+]*}"
fi

echo "wails build ${WEBKIT_TAGS[*]} ${VERSION_LDFLAGS[*]} $*"
wails build "${WEBKIT_TAGS[@]}" "${VERSION_LDFLAGS[@]}" "$@"
