package backend

import (
	"MyGesClient/autostart"
	. "MyGesClient/db"
	. "MyGesClient/log"
	"MyGesClient/service"
	"fmt"
)

// GetBackgroundServiceSupported reports whether the background service can be
// enabled on this OS (Linux, Windows and macOS).
func (a *App) GetBackgroundServiceSupported() bool {
	return autostart.Supported
}

// GetBackgroundService reports whether the background service (event
// reminders while the app is closed) starts with the session.
func (a *App) GetBackgroundService() (bool, error) {
	return autostart.IsEnabled()
}

// SetBackgroundService enables or disables the background service. When it
// is enabled, it is started right away; when it is disabled, the running
// service notices it and exits within a minute.
func (a *App) SetBackgroundService(enabled bool) error {
	if !enabled {
		Log.Infos("Disabling the background service")
		return autostart.Disable()
	}

	Log.Infos("Enabling the background service")
	exePath, err := autostart.ExecPath()
	if err != nil {
		return fmt.Errorf("chemin de l'application introuvable : %w", err)
	}
	if err := autostart.Enable(exePath); err != nil {
		return err
	}
	if err := autostart.StartDetached(exePath); err != nil {
		// Enabled anyway: it will start with the next session
		Log.Error(fmt.Sprintf("Impossible to start the background service now: %v", err))
	}
	return nil
}

// UpdateReminderMinutes sets how many minutes before an event the user is
// reminded of it (-1: never).
func (a *App) UpdateReminderMinutes(minutes int) error {
	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()
	return UpdateUserReminderMinutes(a.db, minutes)
}

// refreshAutostartPath rewrites the autostart entry with the current path of
// the executable: a portable build or an AppImage may have been moved.
func refreshAutostartPath() {
	enabled, err := autostart.IsEnabled()
	if err != nil || !enabled {
		return
	}
	exePath, err := autostart.ExecPath()
	if err != nil {
		return
	}
	if err := autostart.Enable(exePath); err != nil {
		Log.Error(fmt.Sprintf("Impossible to update the background service entry: %v", err))
	}
}

// startReminders checks the event reminders every minute while the app is
// open, with or without the background service: an event is notified once.
func (a *App) startReminders() {
	go a.runEveryXMinutes(a.ctx, 1, func() {
		// Not tracked by dbWg (Add must not race with Wait in Shutdown): a
		// check running while the DB is closed only fails, and is logged.
		a.dbMutex.Lock()
		defer a.dbMutex.Unlock()
		if err := service.CheckReminders(a.db); err != nil {
			Log.Error(fmt.Sprintf("Event reminders: %v", err))
		}
	})
}
