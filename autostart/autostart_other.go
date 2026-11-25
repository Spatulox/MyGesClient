//go:build !linux && !windows

package autostart

import "os/exec"

// Supported reports whether the background service can be enabled on this OS.
const Supported = false

func Enable(exePath string) error { return ErrUnsupported }

func Disable() error { return nil }

func IsEnabled() (bool, error) { return false, nil }

func detach(cmd *exec.Cmd) {}
