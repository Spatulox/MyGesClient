//go:build darwin

package autostart

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// Supported reports whether the background service can be enabled on this OS.
const Supported = true

// launchAgentPath returns the LaunchAgent of the service. launchd loads the
// agents of ~/Library/LaunchAgents at login: no administrator rights needed.
func launchAgentPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "Library", "LaunchAgents", launchAgentLabel+".plist"), nil
}

// Enable starts the service with the session of the user. launchd reads the
// agent at the next login; the GUI starts the service right away with
// StartDetached (the service lock prevents a second instance).
func Enable(exePath string) error {
	path, err := launchAgentPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("création du dossier LaunchAgents : %w", err)
	}

	// Written next to the final file then renamed, so launchd never reads a
	// half written file.
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, []byte(launchAgentPlist(exePath)), 0644); err != nil {
		return fmt.Errorf("écriture du LaunchAgent : %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("écriture du LaunchAgent : %w", err)
	}
	return nil
}

// Disable removes the LaunchAgent. A running service notices it and exits;
// launchd does not start it again (KeepAlive is false).
func Disable() error {
	path, err := launchAgentPath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("suppression du LaunchAgent : %w", err)
	}
	return nil
}

// IsEnabled reports whether the LaunchAgent exists. The switch of System
// Settings > General > Login Items cannot be read by the app: an agent
// turned off there is still reported as enabled.
func IsEnabled() (bool, error) {
	path, err := launchAgentPath()
	if err != nil {
		return false, err
	}
	_, err = os.Stat(path)
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// detach starts the service in its own session: closing the terminal that
// launched the GUI does not stop it.
func detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}
