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

# Linux build: use WebKitGTK 4.1 when it is installed, like the CI. Recent
# distributions (Ubuntu 24.04, Debian 13) no longer ship webkit2gtk-4.0.
linux_build=true
has_tags=false
prev=""
for arg in "$@"; do
    case "$arg" in
        -tags|-tags=*) has_tags=true ;;
    esac
    if [ "$prev" = "-platform" ] && [[ "$arg" != linux* ]]; then
        linux_build=false
    fi
    case "$arg" in
        -platform=*) [[ "${arg#-platform=}" == linux* ]] || linux_build=false ;;
    esac
    prev="$arg"
done

extra=()
if $linux_build && ! $has_tags && pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    extra=(-tags webkit2_41)
fi

echo "wails build ${extra[*]} $*"
exec wails build "${extra[@]}" "$@"
