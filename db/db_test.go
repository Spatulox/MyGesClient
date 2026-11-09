package db

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", filepath.Join(t.TempDir(), "test.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	for _, q := range []string{USER, SALLES, PROFS, DISCIPLINES, AGENDA, NOTES, GRADESVALUE, EVENTS, ABSENCES, PRESET} {
		if _, err := db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func mustExec(t *testing.T, db *sql.DB, q string, args ...any) {
	t.Helper()
	if _, err := db.Exec(q, args...); err != nil {
		t.Fatalf("%s: %v", q, err)
	}
}

func count(t *testing.T, db *sql.DB, q string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(q, args...).Scan(&n); err != nil {
		t.Fatalf("%s: %v", q, err)
	}
	return n
}

func TestUpdateUserPassword(t *testing.T) {
	db := newTestDB(t)
	mustExec(t, db, `INSERT INTO USER (username, password, selected) VALUES ('alice', 'old', 1)`)

	ok, err := UpdateUserPassword(db, "alice", "new")
	if !ok || err != nil {
		t.Fatalf("UpdateUserPassword() = %v, %v", ok, err)
	}
	if n := count(t, db, `SELECT COUNT(*) FROM USER WHERE username = 'alice' AND password = 'new'`); n != 1 {
		t.Fatalf("password not updated")
	}

	if ok, err := UpdateUserPassword(db, "bob", "x"); ok || err == nil {
		t.Fatalf("UpdateUserPassword(unknown user) = %v, %v; want failure", ok, err)
	}
}

func TestDeleteOldDataIsScopedToSelectedUser(t *testing.T) {
	db := newTestDB(t)
	mustExec(t, db, `INSERT INTO USER (user_id, username, password, selected, last_year) VALUES (1, 'alice', 'p', 1, '2025'), (2, 'bob', 'p', 0, '2025')`)
	insertNote := func(id, user, year int) {
		mustExec(t, db, `INSERT INTO NOTES (note_id, bonus, coef, course_name, ects, trimestre, year, teacher_name, user_id) VALUES (?, 0, '1', 'c', '1', 1, ?, 't', ?)`, id, year, user)
		mustExec(t, db, `INSERT INTO GRADESVALUE (note_id, grade_value) VALUES (?, 10)`, id)
	}
	insertNote(1, 1, 2023) // alice, old  -> deleted
	insertNote(2, 1, 2024) // alice, old  -> deleted
	insertNote(3, 1, 2025) // alice, current -> kept
	insertNote(4, 2, 2023) // bob -> kept
	mustExec(t, db, `INSERT INTO EVENTS (event_name, start_date, end_date, color, user_id) VALUES ('e', '2000-01-01 10:00:00', '2000-01-01 11:00:00', '#fff', 1), ('e', '2000-01-01 10:00:00', '2000-01-01 11:00:00', '#fff', 2)`)

	if err := DeleteOldData(db); err != nil {
		t.Fatal(err)
	}

	if got := count(t, db, `SELECT COUNT(*) FROM NOTES WHERE user_id = 1`); got != 1 {
		t.Errorf("alice notes = %d, want 1", got)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM NOTES WHERE user_id = 2`); got != 1 {
		t.Errorf("bob notes = %d, want 1", got)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM GRADESVALUE WHERE note_id NOT IN (SELECT note_id FROM NOTES)`); got != 0 {
		t.Errorf("%d orphan GRADESVALUE rows", got)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM EVENTS WHERE user_id = 2`); got != 1 {
		t.Errorf("bob events = %d, want 1", got)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM EVENTS WHERE user_id = 1`); got != 0 {
		t.Errorf("alice old events = %d, want 0", got)
	}
}
