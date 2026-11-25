package backend

import (
	"os"
	goruntime "runtime"
	"runtime/debug"
	"strings"
)

// AppVersion is shown in "Informations de l'Application".
// Keep it in sync with packaging.toml and the release tag.
const AppVersion = "1.3.2 (bêta)"

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
		Version:      AppVersion,
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
