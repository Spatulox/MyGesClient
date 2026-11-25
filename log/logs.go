package Projet_GO_Reservation

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/mattn/go-isatty"
)

type LogHelper struct {
	DebugBool bool

	mu    sync.Mutex
	file  io.WriteCloser // nil until InitFile succeeds
	color bool           // stdout is a terminal: ANSI colors are understood
}

// MaxLogSize is the size above which the log file is rotated at startup
// (the previous one is kept as <name>.1).
const MaxLogSize = 1 << 20

// -----------------------------------------------------

// LogDir returns the folder of the log files, <user cache dir>/MyGes/logs:
// %LocalAppData% on Windows, ~/.cache on Linux, ~/Library/Caches on macOS.
func LogDir() (string, error) {
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(cacheDir, "MyGes", "logs"), nil
}

// InitDefaultFile also writes the logs to LogDir()/name.
func (l *LogHelper) InitDefaultFile(name string) error {
	dir, err := LogDir()
	if err != nil {
		return err
	}
	return l.InitFile(dir, name)
}

// InitFile also writes the logs to dir/name, created readable by the user
// only. The release builds have no console (Windows GUI app, app started from
// the desktop menu), so without it their logs are lost.
func (l *LogHelper) InitFile(dir, name string) error {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	path := filepath.Join(dir, name)
	if info, err := os.Stat(path); err == nil && info.Size() > MaxLogSize {
		// Keep one old file; on failure, keep appending to the current one
		_ = os.Rename(path, path+".1")
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file != nil {
		l.file.Close()
	}
	l.file = f
	return nil
}

// Close closes the log file, if any.
func (l *LogHelper) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.file == nil {
		return nil
	}
	err := l.file.Close()
	l.file = nil
	return err
}

// Created to avoid code "redondance"
func log() string {
	now := time.Now()
	dateTimeStr := now.Format("[01/02/2006 - 15:04:05] ")
	return dateTimeStr
}

// write prints a line on stdout (colored when it is a terminal) and in the
// log file (never colored).
func (l *LogHelper) write(ansiColor, level, message string, errs []error) {
	if !l.DebugBool {
		return
	}
	prefix := log() + level + " : "
	line := prefix + message + "\n"
	for _, err := range errs {
		if err != nil {
			line += err.Error() + "\n"
		}
	}

	l.mu.Lock()
	defer l.mu.Unlock()
	if l.color && ansiColor != "" {
		fmt.Fprintf(os.Stdout, "\033[%sm%s\033[0m%s", ansiColor, prefix, line[len(prefix):])
	} else {
		fmt.Fprint(os.Stdout, line)
	}
	if l.file != nil {
		_, _ = io.WriteString(l.file, line)
	}
}

// Make the text red
func (l *LogHelper) Error(message string, err ...error) {
	l.write("1;31", "ERROR", message, err)
}

// Make the text white (normal)
func (l *LogHelper) Infos(message string, err ...error) {
	l.write("", "INFOS", message, err)
}

// Make the text green
func (l *LogHelper) Debug(message string, err ...error) {
	l.write("1;32", "DEBUG", message, err)
}

// -----------------------------------------------------

var Log = LogHelper{
	color: isatty.IsTerminal(os.Stdout.Fd()) || isatty.IsCygwinTerminal(os.Stdout.Fd()),
}
