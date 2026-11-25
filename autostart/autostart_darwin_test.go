//go:build darwin

package autostart

import (
	"os"
	"strings"
	"testing"
)

func TestEnableDisable(t *testing.T) {
	t.Setenv("HOME", t.TempDir())

	if enabled, err := IsEnabled(); err != nil || enabled {
		t.Fatalf("IsEnabled() = %v, %v before Enable", enabled, err)
	}
	exe := "/Applications/My Ges.app/Contents/MacOS/MyGesClient"
	if err := Enable(exe); err != nil {
		t.Fatal(err)
	}
	if enabled, err := IsEnabled(); err != nil || !enabled {
		t.Fatalf("IsEnabled() = %v, %v after Enable", enabled, err)
	}

	path, _ := launchAgentPath()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(content), "<string>"+exe+"</string>") {
		t.Errorf("unexpected LaunchAgent:\n%s", content)
	}

	if err := Disable(); err != nil {
		t.Fatal(err)
	}
	if enabled, _ := IsEnabled(); enabled {
		t.Fatal("IsEnabled() = true after Disable")
	}
	if err := Disable(); err != nil {
		t.Fatalf("second Disable: %v", err)
	}
}
