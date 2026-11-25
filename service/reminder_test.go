package service

import (
	. "MyGesClient/db"
	"database/sql"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := OpenDB(filepath.Join(t.TempDir(), "db.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	if _, err := CreateUser(db, "student"); err != nil {
		t.Fatal(err)
	}
	return db
}

// addEvent adds an event of the selected user starting in `in`.
func addEvent(t *testing.T, db *sql.DB, name string, in time.Duration) {
	t.Helper()
	start := time.Now().UTC().Add(in).Format("2006-01-02 15:04:05")
	_, err := db.Exec(`INSERT INTO EVENTS (event_name, event_description, start_date, end_date, color, user_id)
		SELECT ?, 'desc', ?, ?, '#FFFFFF', user_id FROM USER WHERE selected = true`, name, start, start)
	if err != nil {
		t.Fatal(err)
	}
}

type sent struct{ titles []string }

func (s *sent) notify(title, message string) error {
	s.titles = append(s.titles, title)
	return nil
}

func TestCheckRemindersSendsDueEventsOnce(t *testing.T) {
	db := newTestDB(t) // default delay: 15 minutes
	addEvent(t, db, "soon", 10*time.Minute)
	addEvent(t, db, "later", 30*time.Minute)
	addEvent(t, db, "past", -10*time.Minute)

	var s sent
	if err := checkReminders(db, s.notify, time.Now()); err != nil {
		t.Fatal(err)
	}
	if strings.Join(s.titles, ",") != "soon" {
		t.Fatalf("notified %v, want [soon]", s.titles)
	}

	// Second check (or the other process): nothing new
	if err := checkReminders(db, s.notify, time.Now()); err != nil {
		t.Fatal(err)
	}
	if len(s.titles) != 1 {
		t.Fatalf("notified %v, want only one notification", s.titles)
	}
}

func TestCheckRemindersUsesTheDelayOfTheUser(t *testing.T) {
	db := newTestDB(t)
	addEvent(t, db, "later", 30*time.Minute)
	if err := UpdateUserReminderMinutes(db, 60); err != nil {
		t.Fatal(err)
	}

	var s sent
	if err := checkReminders(db, s.notify, time.Now()); err != nil {
		t.Fatal(err)
	}
	if len(s.titles) != 1 {
		t.Fatalf("notified %v, want [later]", s.titles)
	}
}

func TestCheckRemindersDisabled(t *testing.T) {
	db := newTestDB(t)
	addEvent(t, db, "soon", time.Minute)
	if err := UpdateUserReminderMinutes(db, ReminderDisabled); err != nil {
		t.Fatal(err)
	}

	var s sent
	if err := checkReminders(db, s.notify, time.Now()); err != nil {
		t.Fatal(err)
	}
	if len(s.titles) != 0 {
		t.Fatalf("notified %v, want nothing", s.titles)
	}
}

func TestClaimEventReminderOnlyOnce(t *testing.T) {
	db := newTestDB(t)
	addEvent(t, db, "soon", time.Minute)

	first, err := ClaimEventReminderDB(db, 1)
	if err != nil || !first {
		t.Fatalf("first claim = %v, %v; want true", first, err)
	}
	second, err := ClaimEventReminderDB(db, 1)
	if err != nil || second {
		t.Fatalf("second claim = %v, %v; want false", second, err)
	}
}

func TestUpdateUserReminderMinutesBounds(t *testing.T) {
	db := newTestDB(t)
	for _, minutes := range []int{-2, ReminderMaxMinutes + 1} {
		if err := UpdateUserReminderMinutes(db, minutes); err == nil {
			t.Errorf("UpdateUserReminderMinutes(%d) accepted", minutes)
		}
	}
}

func TestReminderMessage(t *testing.T) {
	now := time.Date(2026, 11, 25, 10, 0, 0, 0, time.UTC)
	r := EventReminder{Name: "Partiel", Description: "Salle 12", StartDate: now.Add(15 * time.Minute)}
	if got, want := reminderMessage(r, now), "Commence dans 15 min (10:15)\nSalle 12"; got != want {
		t.Errorf("reminderMessage = %q, want %q", got, want)
	}

	r = EventReminder{Name: "Partiel", StartDate: now.Add(23 * time.Hour)}
	if got, want := reminderMessage(r, now), "Demain à 09:00"; got != want {
		t.Errorf("reminderMessage = %q, want %q", got, want)
	}
}
