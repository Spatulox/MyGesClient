package service

import (
	"MyGesClient/autostart"
	. "MyGesClient/db"
	. "MyGesClient/log"
	"context"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/gofrs/flock"
)

const (
	checkInterval  = time.Minute
	maxLogFileSize = 1 << 20 // 1 MiB, then the log is rotated (service.log.old)
)

// IsServiceMode reports whether the program was started as the background
// service (MyGesClient --service).
func IsServiceMode(args []string) bool {
	for _, arg := range args[1:] {
		if arg == autostart.ServiceFlag {
			return true
		}
	}
	return false
}

// Run is the background service: no window, it only sends the event
// reminders. It runs until the autostart entry is removed (the option is
// turned off in the GUI), or until it is stopped by a signal. It returns the
// exit code of the process.
func Run() int {
	dir, err := AppDataDir()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return 1
	}
	// Nobody reads the output of a process started with the session
	if logFile, err := openLogFile(filepath.Join(dir, "service.log")); err == nil {
		defer logFile.Close()
		os.Stdout = logFile
		os.Stderr = logFile
	}
	Log.DebugBool = true

	if !autostart.Supported {
		Log.Error("Background service: not supported on this OS")
		return 1
	}

	// Only one service at a time (started with the session, and by the GUI
	// when the option is turned on)
	lock := flock.New(filepath.Join(dir, "service.lock"))
	locked, err := lock.TryLock()
	if err != nil {
		Log.Error(fmt.Sprintf("Background service: lock: %v", err))
		return 1
	}
	if !locked {
		Log.Infos("Background service: already running")
		return 0
	}
	defer lock.Unlock()

	if !isEnabled() {
		Log.Infos("Background service: disabled in the settings, exiting")
		return 0
	}

	database, err := InitDBConnexion()
	if err != nil {
		Log.Error(fmt.Sprintf("Background service: %v", err))
		return 1
	}
	defer database.Close()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	Log.Infos("Background service: started")
	ticker := time.NewTicker(checkInterval)
	defer ticker.Stop()

	for {
		if err := CheckReminders(database); err != nil {
			Log.Error(fmt.Sprintf("Background service: reminders: %v", err))
		}

		select {
		case <-ctx.Done():
			Log.Infos("Background service: stopped")
			return 0
		case <-ticker.C:
		}

		if !isEnabled() {
			Log.Infos("Background service: disabled in the settings, exiting")
			return 0
		}
	}
}

func isEnabled() bool {
	enabled, err := autostart.IsEnabled()
	if err != nil {
		// Keep running: a transient error must not stop the reminders
		Log.Error(fmt.Sprintf("Background service: autostart state: %v", err))
		return true
	}
	return enabled
}

func openLogFile(path string) (*os.File, error) {
	if info, err := os.Stat(path); err == nil && info.Size() > maxLogFileSize {
		_ = os.Rename(path, path+".old")
	}
	return os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
}
