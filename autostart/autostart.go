// Package autostart registers the background service (MyGesClient --service)
// to be started with the user session of the OS.
//
// The OS is the source of truth: the service is enabled when its startup
// entry exists (an XDG autostart file on Linux, a Run registry value on
// Windows).
package autostart

import (
	"errors"
	"os"
	"os/exec"
)

// ServiceFlag is the command line flag that starts the background service.
const ServiceFlag = "--service"

// ErrUnsupported is returned on the OS without autostart support.
var ErrUnsupported = errors.New("le démarrage automatique n'est pas supporté sur ce système")

// ExecPath returns the path of the executable to register. Inside an
// AppImage, os.Executable() is a temporary mount: $APPIMAGE is the real file.
func ExecPath() (string, error) {
	if appImage := os.Getenv("APPIMAGE"); appImage != "" {
		return appImage, nil
	}
	return os.Executable()
}

// StartDetached starts the background service now, without waiting for the
// next session. The service is detached from this process: it keeps running
// when the GUI is closed.
func StartDetached(exePath string) error {
	cmd := exec.Command(exePath, ServiceFlag)
	detach(cmd)
	if err := cmd.Start(); err != nil {
		return err
	}
	// Reap the process if it exits before the GUI (no zombie)
	go cmd.Wait()
	return nil
}
