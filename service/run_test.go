package service

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

func TestRemoveOldLogFiles(t *testing.T) {
	dir := t.TempDir()
	for _, name := range []string{"service.log", "service.log.old", "db.sqlite"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte("x"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	removeOldLogFiles(dir)
	removeOldLogFiles(dir) // already removed: nothing to do

	for _, name := range []string{"service.log", "service.log.old"} {
		if _, err := os.Stat(filepath.Join(dir, name)); !errors.Is(err, fs.ErrNotExist) {
			t.Errorf("%s still there (%v)", name, err)
		}
	}
	if _, err := os.Stat(filepath.Join(dir, "db.sqlite")); err != nil {
		t.Errorf("db.sqlite removed: %v", err)
	}
}
