# Build environment of MyGesClient's Linux packages (Wails: Go, Node, WebKitGTK 4.1), used by
# the release (.github/workflows/build.yml): PackagingOnLinux's package.yml builds this image, adds its
# packaging tools on top, then runs packaging.toml's [linux] command (wailsbuild.sh) in it.
#
# BASE is the distribution the packages are built on, and depend on: ubuntu:<release> for the
# .deb (and fedora:<release> for an .rpm).
ARG BASE=ubuntu:24.04

FROM node:20-bookworm-slim AS node

FROM ${BASE}

# Wails' Linux dependencies (GTK 3, WebKitGTK 4.1) and a C toolchain for cgo.
RUN if command -v apt-get >/dev/null 2>&1; then \
      apt-get update \
      && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
           ca-certificates curl git build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      dnf install -y gcc gcc-c++ make pkgconf-pkg-config git curl tar gzip gtk3-devel webkit2gtk4.1-devel \
      && dnf clean all; \
    fi

# Node 20, which builds the frontend.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Go (the toolchain of go.mod) and the Wails CLI (the version of github.com/wailsapp/wails/v2
# in go.mod).
ARG TARGETARCH
ENV PATH=/usr/local/go/bin:$PATH
COPY go.mod /tmp/go.mod
RUN go_version="$(sed -n 's/^toolchain go//p' /tmp/go.mod)" \
 && go_version="${go_version:-$(sed -n 's/^go //p' /tmp/go.mod)}" \
 && curl -fsSL "https://go.dev/dl/go${go_version}.linux-${TARGETARCH}.tar.gz" | tar -C /usr/local -xz \
 && wails_version="$(grep -v '^[[:space:]]*//' /tmp/go.mod | sed -n 's#.*github.com/wailsapp/wails/v2 \(v[0-9][0-9.]*\).*#\1#p')" \
 && GOBIN=/usr/local/bin go install "github.com/wailsapp/wails/v2/cmd/wails@${wails_version}" \
 && rm -rf /root/go /root/.cache/go-build /tmp/go.mod \
 && go version && wails version
