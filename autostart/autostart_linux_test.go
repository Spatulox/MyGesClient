//go:build linux

package autostart

import (
	"os"
	"strings"
	"testing"
)

func TestEnableDisable(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())

	if enabled, err := IsEnabled(); err != nil || enabled {
		t.Fatalf("IsEnabled() = %v, %v before Enable", enabled, err)
	}
	if err := Enable("/opt/My Ges/MyGesClient"); err != nil {
		t.Fatal(err)
	}
	if enabled, err := IsEnabled(); err != nil || !enabled {
		t.Fatalf("IsEnabled() = %v, %v after Enable", enabled, err)
	}

	path, _ := desktopFilePath()
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(content), `Exec="/opt/My Ges/MyGesClient" --service`) {
		t.Errorf("unexpected desktop entry:\n%s", content)
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

func TestIsEnabledHonoursTheDesktopSettings(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", t.TempDir())
	if err := Enable("/usr/bin/MyGesClient"); err != nil {
		t.Fatal(err)
	}
	path, _ := desktopFilePath()
	content, _ := os.ReadFile(path)
	content = []byte(strings.Replace(string(content), "X-GNOME-Autostart-enabled=true", "X-GNOME-Autostart-enabled=false", 1))
	if err := os.WriteFile(path, content, 0644); err != nil {
		t.Fatal(err)
	}
	if enabled, _ := IsEnabled(); enabled {
		t.Fatal("IsEnabled() = true, the desktop environment turned it off")
	}
}

func TestQuoteExecArg(t *testing.T) {
	tests := map[string]string{
		"/usr/bin/MyGesClient": `"/usr/bin/MyGesClient"`,
		`/a "b"/c`:             `"/a \\"b\\"/c"`,
		`/a\b`:                 `"/a\\\\b"`,
		"/100%/$x":             `"/100%%/\\$x"`,
	}
	for in, want := range tests {
		if got := quoteExecArg(in); got != want {
			t.Errorf("quoteExecArg(%q) = %s, want %s", in, got, want)
		}
	}
}
