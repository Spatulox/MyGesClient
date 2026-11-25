# Environment shared by wailsbuild.sh and wailsdev.sh (sourced, not run).
#
# Works without an interactive shell (e.g. PackagingOnLinux launched from the
# desktop menu), where ~/.bashrc is not read: go/bin and nvm are added here.

# wails is installed by `go install` into $(go env GOPATH)/bin
export PATH="${GOPATH:-$HOME/go}/bin:$PATH"

# npm (needed by wails to build the frontend) may come from nvm
if ! command -v npm >/dev/null 2>&1 && [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    set +u
    . "$NVM_DIR/nvm.sh"
    set -u
fi

# version_ldflags ARGS... sets VERSION_LDFLAGS to the -ldflags that write the
# version shown in "Informations de l'Application" (backend.AppVersion):
# $MYGES_VERSION if set (the CI passes the release tag), else the nearest
# release tag (git describe, v* tags only), else "dev". Nothing when -ldflags
# is already given.
# Not $APP_VERSION: PackagingOnLinux sets it to the packaging.toml version
# when it runs this script, which isn't a tag.
version_ldflags() {
    local arg version
    VERSION_LDFLAGS=()
    for arg in "$@"; do
        case "$arg" in -ldflags|-ldflags=*) return ;; esac
    done
    version="${MYGES_VERSION:-}"
    if [ -z "$version" ]; then
        version="$(git describe --tags --match 'v*' --dirty 2>/dev/null || true)"
    fi
    VERSION_LDFLAGS=(-ldflags "-X MyGesClient/backend.AppVersion=${version:-dev}")
}

# webkit_tags ARGS... sets WEBKIT_TAGS to the extra wails flags for these
# arguments: -tags webkit2_41 for a Linux build when WebKitGTK 4.1 is
# installed, like the CI (Ubuntu 24.04 and Debian 13 no longer ship
# webkit2gtk-4.0). Nothing when -tags is given or for another -platform.
webkit_tags() {
    local linux_build=true has_tags=false prev="" arg
    for arg in "$@"; do
        case "$arg" in
            -tags|-tags=*) has_tags=true ;;
            -platform=*) [[ "${arg#-platform=}" == linux* ]] || linux_build=false ;;
        esac
        if [ "$prev" = "-platform" ] && [[ "$arg" != linux* ]]; then
            linux_build=false
        fi
        prev="$arg"
    done

    WEBKIT_TAGS=()
    if $linux_build && ! $has_tags && pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
        WEBKIT_TAGS=(-tags webkit2_41)
    fi
}
