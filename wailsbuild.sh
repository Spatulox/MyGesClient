#!/bin/bash
# Build the app with Wails. Usage: ./wailsbuild.sh [wails build flags...]
# e.g. ./wailsbuild.sh -platform windows/amd64
#
# Works without an interactive shell (e.g. PackagingOnLinux launched from the
# desktop menu), where ~/.bashrc is not read: go/bin and nvm are added here.
set -euo pipefail

cd "$(dirname "$0")"

# wails is installed by `go install` into $(go env GOPATH)/bin
export PATH="${GOPATH:-$HOME/go}/bin:$PATH"

# npm (needed by wails to build the frontend) may come from nvm
if ! command -v npm >/dev/null 2>&1 && [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    set +u
    . "$NVM_DIR/nvm.sh"
    set -u
fi

# Wails' binding generator breaks with recent Go releases ("package ... without
# types was imported"): use the toolchain pinned in go.mod, like the CI does.
export GOTOOLCHAIN="${GOTOOLCHAIN:-go1.24.1}"

exec wails build "$@"
