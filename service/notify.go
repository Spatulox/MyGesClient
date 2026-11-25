package service

import (
	"sync"

	"github.com/gen2brain/beeep"
)

var (
	iconMu sync.RWMutex
	icon   []byte
)

func init() {
	beeep.AppName = "MyGesClient"
}

// SetIcon sets the PNG icon of the notifications (build/appicon.png,
// embedded by main.go).
func SetIcon(png []byte) {
	iconMu.Lock()
	defer iconMu.Unlock()
	icon = png
}

// Notify sends a desktop notification: D-Bus (or notify-send) on Linux,
// a toast on Windows.
func Notify(title, message string) error {
	iconMu.RLock()
	png := icon
	iconMu.RUnlock()

	if png == nil {
		return beeep.Notify(title, message, "")
	}
	return beeep.Notify(title, message, png)
}
