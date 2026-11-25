package backend

import (
	"fmt"
	"os"
	"regexp"
	goruntime "runtime"
	"runtime/debug"
	"strings"
)

// AppVersion is the git tag of the build, set at build time with
// -ldflags "-X MyGesClient/backend.AppVersion=<tag>":
//   - the CI passes the release tag (v1.4.0_beta);
//   - wailsbuild.sh / wailsdev.sh pass $MYGES_VERSION if set, else
//     `git describe --tags --match 'v*' --dirty` (v1.3.2_beta-13-g6202d81
//     between two releases).
//
// Nothing to update by hand: tagging the release is enough.
var AppVersion = "dev"

// v1.4.0_beta, v1.4.0_beta-13-g6202d81, v1.4.0_release-dirty...
var versionFormat = regexp.MustCompile(`^v?(\d+\.\d+\.\d+)(?:_(beta|rc|release))?(?:-(\d+)-g([0-9a-f]+))?(-dirty)?$`)

// FormatVersion turns a git tag into the text of the popup:
// "v1.4.0_beta" -> "1.4.0 (bêta)", "v1.4.0_release" -> "1.4.0",
// "v1.3.2_beta-13-g6202d81" -> "1.3.2 (bêta) + 13 commits (6202d81)".
// Anything else is returned as is ("dev" when empty).
func FormatVersion(tag string) string {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return "dev"
	}
	m := versionFormat.FindStringSubmatch(tag)
	if m == nil {
		return tag
	}
	text := m[1]
	switch m[2] {
	case "beta":
		text += " (bêta)"
	case "rc":
		text += " (rc)"
	}
	if m[3] != "" {
		unit := "commits"
		if m[3] == "1" {
			unit = "commit"
		}
		text += fmt.Sprintf(" + %s %s (%s)", m[3], unit, m[4])
	}
	if m[5] != "" {
		text += ", modifications locales"
	}
	return text
}

// AppInfo is what the "Informations de l'Application" popup displays.
type AppInfo struct {
	Version      string `json:"version"`
	BuildDate    string `json:"buildDate"`
	System       string `json:"system"`
	GoVersion    string `json:"goVersion"`
	WailsVersion string `json:"wailsVersion"`
}

// GetAppInfo describes the running binary: version, build date, OS and
// architecture, Go and Wails versions. Everything but the version is read
// from the binary itself, so it is right for every platform build.
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{
		Version:      FormatVersion(AppVersion),
		BuildDate:    buildDate(),
		System:       systemName(),
		GoVersion:    strings.TrimPrefix(goruntime.Version(), "go"),
		WailsVersion: wailsVersion(),
	}
}

// buildDate is the modification date of the executable: the build date for a
// local build, the packaging date for an installed package. "" if unknown.
func buildDate() string {
	exe, err := os.Executable()
	if err != nil {
		return ""
	}
	info, err := os.Stat(exe)
	if err != nil {
		return ""
	}
	return info.ModTime().Format("02/01/2006")
}

func systemName() string {
	osName := map[string]string{"linux": "Linux", "windows": "Windows", "darwin": "macOS"}[goruntime.GOOS]
	if osName == "" {
		osName = goruntime.GOOS
	}
	arch := map[string]string{"amd64": "x64", "arm64": "ARM64", "386": "x86"}[goruntime.GOARCH]
	if arch == "" {
		arch = goruntime.GOARCH
	}
	return osName + " " + arch
}

// wailsVersion is the version of the Wails module compiled into the binary.
func wailsVersion() string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return ""
	}
	for _, dep := range info.Deps {
		if dep.Path == "github.com/wailsapp/wails/v2" {
			if dep.Replace != nil {
				return strings.TrimPrefix(dep.Replace.Version, "v")
			}
			return strings.TrimPrefix(dep.Version, "v")
		}
	}
	return ""
}
