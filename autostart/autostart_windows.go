//go:build windows

package autostart

import (
	"errors"
	"fmt"
	"os/exec"
	"syscall"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// Supported reports whether the background service can be enabled on this OS.
const Supported = true

// The Run key of the current user: no administrator rights needed.
// The NSIS uninstaller deletes this value too (build/windows/installer/project.nsi).
const (
	runKeyPath   = `Software\Microsoft\Windows\CurrentVersion\Run`
	runValueName = "MyGesClientService"
)

// Enable starts the service with the session of the current user.
func Enable(exePath string) error {
	key, _, err := registry.CreateKey(registry.CURRENT_USER, runKeyPath, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("ouverture de la clé Run : %w", err)
	}
	defer key.Close()

	command := fmt.Sprintf(`"%s" %s`, exePath, ServiceFlag)
	if err := key.SetStringValue(runValueName, command); err != nil {
		return fmt.Errorf("écriture de la clé Run : %w", err)
	}
	return nil
}

// Disable removes the Run value. A running service notices it and exits.
func Disable() error {
	key, err := registry.OpenKey(registry.CURRENT_USER, runKeyPath, registry.SET_VALUE)
	if errors.Is(err, registry.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("ouverture de la clé Run : %w", err)
	}
	defer key.Close()

	if err := key.DeleteValue(runValueName); err != nil && !errors.Is(err, registry.ErrNotExist) {
		return fmt.Errorf("suppression de la clé Run : %w", err)
	}
	return nil
}

// IsEnabled reports whether the Run value exists.
func IsEnabled() (bool, error) {
	key, err := registry.OpenKey(registry.CURRENT_USER, runKeyPath, registry.QUERY_VALUE)
	if errors.Is(err, registry.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	defer key.Close()

	_, _, err = key.GetStringValue(runValueName)
	if errors.Is(err, registry.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// detach starts the service outside of the console and process group of the
// GUI, so it keeps running when the GUI is closed.
func detach(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: windows.CREATE_NEW_PROCESS_GROUP | windows.DETACHED_PROCESS,
	}
}
