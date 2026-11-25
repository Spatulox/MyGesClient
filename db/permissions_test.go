//go:build !windows

package db

import (
	"os"
	"path/filepath"
	"testing"
)

func mode(t *testing.T, path string) os.FileMode {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	return info.Mode().Perm()
}

func TestPrepareDataDirRestrictsPermissions(t *testing.T) {
	folder := filepath.Join(t.TempDir(), "MyGes")
	// Folder created by an older version
	if err := os.Mkdir(folder, 0755); err != nil {
		t.Fatal(err)
	}

	if err := prepareDataDir(folder); err != nil {
		t.Fatal(err)
	}
	dbPath := filepath.Join(folder, "db.sqlite")
	if got := mode(t, folder); got != 0700 {
		t.Errorf("folder mode = %o; want 700", got)
	}

	db, err := OpenDB(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	restrictToOwner(dbPath, 0600)
	if got := mode(t, dbPath); got != 0600 {
		t.Errorf("database mode = %o; want 600", got)
	}
}
