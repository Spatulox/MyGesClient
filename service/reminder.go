// Package service holds the event reminders, and the background service
// (MyGesClient --service) that sends them when the GUI is closed.
package service

import (
	. "MyGesClient/db"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

const maxDescriptionLength = 200

// CheckReminders sends a notification for each event whose reminder is due.
// It is called every minute by the GUI and by the background service; an
// event is only notified once, even when both are running.
func CheckReminders(db *sql.DB) error {
	return checkReminders(db, Notify, time.Now())
}

func checkReminders(db *sql.DB, notify func(title, message string) error, now time.Time) error {
	reminders, err := GetEventsToRemindDB(db)
	if err != nil {
		return err
	}

	var errs []string
	for _, r := range reminders {
		claimed, err := ClaimEventReminderDB(db, r.Id)
		if err != nil {
			errs = append(errs, err.Error())
			continue
		}
		if !claimed {
			continue // already sent by the other process
		}
		if err := notify(r.Name, reminderMessage(r, now)); err != nil {
			errs = append(errs, fmt.Sprintf("notification de l'évènement %d : %v", r.Id, err))
		}
	}
	if len(errs) > 0 {
		return fmt.Errorf("%s", strings.Join(errs, " ; "))
	}
	return nil
}

// reminderMessage is the body of the notification: when the event starts,
// in local time, then its description.
func reminderMessage(r EventReminder, now time.Time) string {
	start := r.StartDate.In(now.Location())
	hour := start.Format("15:04")

	var when string
	switch minutes := int(start.Sub(now).Round(time.Minute).Minutes()); {
	case minutes <= 0:
		when = "Commence maintenant (" + hour + ")"
	case minutes < 60:
		when = fmt.Sprintf("Commence dans %d min (%s)", minutes, hour)
	case sameDay(start, now):
		when = "Aujourd'hui à " + hour
	case sameDay(start, now.AddDate(0, 0, 1)):
		when = "Demain à " + hour
	default:
		when = start.Format("02/01") + " à " + hour
	}

	description := strings.TrimSpace(r.Description)
	if description == "" {
		return when
	}
	if runes := []rune(description); len(runes) > maxDescriptionLength {
		description = string(runes[:maxDescriptionLength]) + "…"
	}
	return when + "\n" + description
}

func sameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}
