//go:build linux

package Projet_GO_Reservation

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInitDefaultFileUsesTheCacheDir(t *testing.T) {
	cache := t.TempDir()
	t.Setenv("XDG_CACHE_HOME", cache)

	dir, err := LogDir()
	if err != nil {
		t.Fatal(err)
	}
	if want := filepath.Join(cache, "MyGes", "logs"); dir != want {
		t.Fatalf("LogDir() = %s; want %s", dir, want)
	}

	l := &LogHelper{DebugBool: true}
	if err := l.InitDefaultFile("service.log"); err != nil {
		t.Fatal(err)
	}
	l.Infos("started")
	l.Close()

	info, err := os.Stat(filepath.Join(dir, "service.log"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Size() == 0 || info.Mode().Perm() != 0600 {
		t.Fatalf("log file: size %d, mode %o; want content and 600", info.Size(), info.Mode().Perm())
	}
}
