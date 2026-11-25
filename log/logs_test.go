package Projet_GO_Reservation

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestInitFileWritesPlainLines(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "logs")
	l := &LogHelper{DebugBool: true, color: true}
	if err := l.InitFile(dir, "app.log"); err != nil {
		t.Fatal(err)
	}
	l.Error("boom", errors.New("cause"))
	l.Infos("hello")
	if err := l.Close(); err != nil {
		t.Fatal(err)
	}

	content, err := os.ReadFile(filepath.Join(dir, "app.log"))
	if err != nil {
		t.Fatal(err)
	}
	got := string(content)
	if strings.Contains(got, "\033") {
		t.Errorf("ANSI codes in the log file: %q", got)
	}
	for _, want := range []string{"ERROR : boom\ncause\n", "INFOS : hello\n"} {
		if !strings.Contains(got, want) {
			t.Errorf("log file %q does not contain %q", got, want)
		}
	}

	if info, err := os.Stat(dir); err == nil && info.Mode().Perm()&0077 != 0 && os.PathSeparator == '/' {
		t.Errorf("log folder mode = %o; want readable by the user only", info.Mode().Perm())
	}
}

func TestInitFileRotates(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "app.log")
	if err := os.WriteFile(path, make([]byte, MaxLogSize+1), 0600); err != nil {
		t.Fatal(err)
	}

	l := &LogHelper{DebugBool: true}
	if err := l.InitFile(dir, "app.log"); err != nil {
		t.Fatal(err)
	}
	defer l.Close()

	if info, err := os.Stat(path + ".1"); err != nil || info.Size() != MaxLogSize+1 {
		t.Fatalf("old log not kept as app.log.1: %v", err)
	}
	if info, err := os.Stat(path); err != nil || info.Size() != 0 {
		t.Fatalf("new log not started empty: %v", err)
	}
}

func TestNothingWrittenWithoutDebug(t *testing.T) {
	dir := t.TempDir()
	l := &LogHelper{}
	if err := l.InitFile(dir, "app.log"); err != nil {
		t.Fatal(err)
	}
	l.Error("hidden")
	l.Close()
	if content, _ := os.ReadFile(filepath.Join(dir, "app.log")); len(content) != 0 {
		t.Fatalf("log written although DebugBool is false: %q", content)
	}
}
