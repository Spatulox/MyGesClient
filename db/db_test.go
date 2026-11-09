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

func TestReplaceGradesKeepsDataOnInvalidJSON(t *testing.T) {
	db := newTestDB(t)
	mustExec(t, db, `INSERT INTO USER (user_id, username, password, selected) VALUES (1, 'alice', 'p', 1)`)
	valid := `{"items":[{"bonus":0,"coef":"1","course":"S1 - Go","ects":"2","exam":12.5,"grades":[10,14],"trimester":1,"year":2025}]}`

	if err := ReplaceGrades(db, 1, "2025", valid); err != nil {
		t.Fatal(err)
	}
	if err := ReplaceGrades(db, 1, "2025", "{'message':'error'}"); err == nil {
		t.Fatal("ReplaceGrades(invalid JSON) succeeded")
	}
	if got := count(t, db, `SELECT COUNT(*) FROM GRADESVALUE`); got != 2 {
		t.Fatalf("GRADESVALUE rows = %d, want 2 (data must survive a failed refresh)", got)
	}

	// Replacing twice must not duplicate rows
	if err := ReplaceGrades(db, 1, "2025", valid); err != nil {
		t.Fatal(err)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM NOTES`); got != 1 {
		t.Fatalf("NOTES rows = %d, want 1", got)
	}
}

func TestReplaceAbsencesAcceptsNullFields(t *testing.T) {
	db := newTestDB(t)
	abs := `{"items":[{"course_name":null,"date":1700000000000,"justified":true,"links":null,"trimester":1,"trimester_name":"S1","type":"absence","year":2025}]}`
	if err := ReplaceAbsences(db, 1, "2025", abs); err != nil {
		t.Fatal(err)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM ABSENCES WHERE user_id = 1`); got != 1 {
		t.Fatalf("ABSENCES rows = %d, want 1", got)
	}
}

func TestReplaceAgendaWithNullTrimester(t *testing.T) {
	db := newTestDB(t)
	start, end := "2025-01-06T00:00:00.000Z", "2025-01-12T05:00:00.000Z"
	mustExec(t, db, `INSERT INTO PROFS (teacher_id, teacher_name) VALUES (1, 'x')`)
	mustExec(t, db, `INSERT INTO DISCIPLINES (discip_id, discip_name, teacher_id, trimestre) VALUES (1, 'x', 1, 'S1')`)
	mustExec(t, db, `INSERT INTO AGENDA (agenda_id, agenda_name, type, modality, start_date, end_date, comment, discip_id, user_id) VALUES (99, 'old', 'Cours', 'x', '2025-01-07T08:00:00.000Z', '2025-01-07T10:00:00.000Z', '', 1, 1)`)

	agenda := `[{"reservation_id":1,"name":"Go","type":"Cours","modality":"Présentiel","start_date":1736240400000,"end_date":1736245800000,"comment":"","rooms":[{"room_id":3,"name":"A1","campus":"Paris"}],"discipline":{"name":"Go","teacher":"T","teacher_id":7,"trimester":null}}]`
	if err := ReplaceAgenda(db, 1, start, end, agenda); err != nil {
		t.Fatal(err)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM AGENDA WHERE user_id = 1`); got != 1 {
		t.Fatalf("AGENDA rows = %d, want 1", got)
	}
	if got := count(t, db, `SELECT COUNT(*) FROM AGENDA WHERE agenda_id = 99`); got != 0 {
		t.Fatalf("old course of the week was not replaced")
	}

	// A failing refresh keeps the existing week
	if err := ReplaceAgenda(db, 1, start, end, "not json"); err == nil {
		t.Fatal("ReplaceAgenda(invalid JSON) succeeded")
	}
	if got := count(t, db, `SELECT COUNT(*) FROM AGENDA WHERE user_id = 1`); got != 1 {
		t.Fatalf("AGENDA rows = %d after failed refresh, want 1", got)
	}
}
