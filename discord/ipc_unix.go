//go:build !windows

package discord

import (
	"fmt"
	"net"
	"os"
	"path/filepath"
)

// Folders, relative to a base folder, where a Discord install creates its
// socket: native, Flatpak (seen from the host, then from inside another
// Flatpak) and Snap.
var socketSubdirs = []string{
	"",
	"app/com.discordapp.Discord",
	".flatpak/com.discordapp.Discord/xdg-run",
	"snap.discord",
}

func socketCandidates() []string {
	return socketPaths(os.Getenv, os.Getuid(), fileExists)
}

// socketPaths returns the sockets that exist among the possible ones, in
// order: discord-ipc-0 in every folder first, then discord-ipc-1...
//
// The base folders are $XDG_RUNTIME_DIR (Linux), /run/user/<uid> (when
// XDG_RUNTIME_DIR is not set, e.g. started from a service), then the temp
// folders ($TMPDIR on macOS).
func socketPaths(getenv func(string) string, uid int, exists func(string) bool) []string {
	var bases []string
	seen := map[string]bool{}
	addBase := func(dir string) {
		if dir == "" {
			return
		}
		dir = filepath.Clean(dir)
		if !seen[dir] {
			seen[dir] = true
			bases = append(bases, dir)
		}
	}
	addBase(getenv("XDG_RUNTIME_DIR"))
	if uid >= 0 {
		addBase(fmt.Sprintf("/run/user/%d", uid))
	}
	addBase(getenv("TMPDIR"))
	addBase(getenv("TMP"))
	addBase(getenv("TEMP"))
	addBase("/tmp")

	var paths []string
	for i := 0; i < maxSockets; i++ {
		name := fmt.Sprintf("discord-ipc-%d", i)
		for _, base := range bases {
			for _, sub := range socketSubdirs {
				path := filepath.Join(base, sub, name)
				if exists(path) {
					paths = append(paths, path)
				}
			}
		}
	}
	return paths
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func dial(path string) (net.Conn, error) {
	return net.DialTimeout("unix", path, ioTimeout)
}
