//go:build linux

package autostart

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// Supported reports whether the background service can be enabled on this OS.
const Supported = true

const desktopFileName = "io.github.spatulox.MyGesClient-service.desktop"

// desktopFilePath returns the XDG autostart file of the service:
// $XDG_CONFIG_HOME/autostart (~/.config/autostart by default).
func desktopFilePath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, "autostart", desktopFileName), nil
}

// Enable starts the service with the session: an XDG autostart entry works
// on every desktop environment, and the service gets the session D-Bus
// needed by the notifications.
func Enable(exePath string) error {
	path, err := desktopFilePath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("création du dossier autostart : %w", err)
	}

	content := fmt.Sprintf(`[Desktop Entry]
Type=Application
Name=MyGesClient (rappels)
Comment=Rappels des évènements MyGesClient
Exec=%s %s
Icon=io.github.spatulox.MyGesClient
Terminal=false
NoDisplay=true
X-GNOME-Autostart-enabled=true
`, quoteExecArg(exePath), ServiceFlag)

	// Written next to the final file then renamed, so the desktop environment
	// never reads a half written file.
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(content), 0644); err != nil {
		return fmt.Errorf("écriture du fichier autostart : %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("écriture du fichier autostart : %w", err)
	}
	return nil
}

// Disable removes the autostart entry. A running service notices it and exits.
func Disable() error {
	path, err := desktopFilePath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("suppression du fichier autostart : %w", err)
	}
	return nil
}

// IsEnabled reports whether the autostart entry exists and was not turned
// off from the settings of the desktop environment (Hidden=true or
// X-GNOME-Autostart-enabled=false).
func IsEnabled() (bool, error) {
	path, err := desktopFilePath()
	if err != nil {
		return false, err
	}
	content, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	for _, line := range strings.Split(string(content), "\n") {
		switch strings.ReplaceAll(strings.TrimSpace(line), " ", "") {
		case "Hidden=true", "X-GNOME-Autostart-enabled=false":
			return false, nil
		}
	}
	return true, nil
}

// quoteExecArg quotes an argument of the Exec key of a desktop entry
// (Desktop Entry Specification, "The Exec key"). The string escapes (\\)
// are applied before the quoting rule: a quoted `"` is written \\" and a
// quoted backslash \\\\.
func quoteExecArg(arg string) string {
	var b strings.Builder
	b.WriteByte('"')
	for _, r := range arg {
		switch r {
		case '"', '`', '$':
			b.WriteString(`\\`)
			b.WriteRune(r)
		case '\\':
			b.WriteString(`\\\\`)
		case '%':
			b.WriteString("%%")
		default:
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
	return b.String()
}

// detach starts the service in its own session: closing the terminal that
// launched the GUI does not stop it.
func detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
