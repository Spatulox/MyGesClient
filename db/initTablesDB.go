package db

import (
	. "MyGesClient/log"
	"database/sql"
	"fmt"
)

// To store the user of the application
const USER = `CREATE TABLE IF NOT EXISTS USER (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark',
    eula BOOLEAN NOT NULL DEFAULT 0,
    selected BOOLEAN NOT NULL DEFAULT 0,
	last_year TEXT NOT NULL DEFAULT '1970'
);`

// To store the schedule of the user
const SALLES = `CREATE TABLE IF NOT EXISTS SALLES (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    campus TEXT NOT NULL,
    color TEXT
);`

const PROFS = `CREATE TABLE IF NOT EXISTS PROFS (
    teacher_id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_name TEXT NOT NULL DEFAULT 'Unknown'
);`

const DISCIPLINES = `CREATE TABLE IF NOT EXISTS DISCIPLINES (
    discip_id INTEGER PRIMARY KEY,
    discip_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    coef REAL,
    trimestre INTEGER NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES PROFS (teacher_id)
);`

const AGENDA = `CREATE TABLE IF NOT EXISTS AGENDA (
    agenda_id INTEGER PRIMARY KEY AUTOINCREMENT,
    agenda_name TEXT NOT NULL,
    type TEXT NOT NULL,
    modality TEXT NOT NULL,
    start_date TEXT NOT NULL,  -- Utilisation de TEXT pour les dates
    end_date TEXT NOT NULL,     -- Utilisation de TEXT pour les dates
    comment TEXT NOT NULL,
    room_id INTEGER,
    discip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES SALLES (room_id),
    FOREIGN KEY (discip_id) REFERENCES DISCIPLINES (discip_id),
    FOREIGN KEY (user_id) REFERENCES USER (user_id)
);`

const NOTES = `CREATE TABLE IF NOT EXISTS NOTES (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bonus TEXT NOT NULL,
    coef TEXT NOT NULL,
    course_name TEXT NOT NULL,
    ects TEXT NOT NULL,
    exam TEXT,
    trimestre INTEGER NOT NULL,
    year INTEGER NOT NULL,
    teacher_name TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES USER(user_id)
);`

const GRADESVALUE = `CREATE TABLE IF NOT EXISTS GRADESVALUE(
    note_id INTEGER NOT NULL,
    grade_value REAL NOT NULL,
    FOREIGN KEY (note_id) REFERENCES NOTES (note_id)
);`

const EVENTS = `CREATE TABLE IF NOT EXISTS EVENTS(
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    color TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES USER(user_id)
);`

const ABSENCES = `CREATE TABLE IF NOT EXISTS ABSENCES(
    abs_id INTEGER PRIMARY KEY AUTOINCREMENT,
    abs_cours TEXT NOT NULL,
    abs_date TEXT NOT NULL,
    abs_justified TEXT NOT NULL,
	abs_trimester TEXT NOT NULL,
	abs_trimester_name TEXT NOT NULL,
	abs_type TEXT NOT NULL,
	abs_year TEXT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES USER(user_id)
);`

const PRESET = `CREATE TABLE IF NOT EXISTS PRESET(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	value TEXT NOT NULL,
	user_id INT NOT NULL,
	type TEXT NOT NULL,
	FOREIGN KEY (user_id) REFERENCES USER(user_id),
	UNIQUE (user_id, name, type) -- Contrainte pour un seul preset du même nom pour une personne et un même type
);`

// Tables, in creation order (referenced tables first)
var tables = []struct {
	name   string
	schema string
}{
	{"USER", USER},
	{"SALLES", SALLES},
	{"PROFS", PROFS},
	{"DISCIPLINES", DISCIPLINES},
	{"AGENDA", AGENDA},
	{"NOTES", NOTES},
	{"GRADESVALUE", GRADESVALUE},
	{"EVENTS", EVENTS},
	{"ABSENCES", ABSENCES},
	{"PRESET", PRESET},
}

// migrations[i] upgrades a database from version i to version i+1
// (stored in PRAGMA user_version). Append new migrations at the end,
// never modify an existing one.
var migrations = []func(tx *sql.Tx) error{
	// 1: databases created before last_year existed
	func(tx *sql.Tx) error {
		return addColumnIfMissing(tx, "USER", "last_year", "TEXT NOT NULL DEFAULT '1970'")
	},
	// 2: a course (reservation) is shared by every student of a class, so
	// AGENDA is keyed by (agenda_id, user_id) instead of agenda_id alone:
	// otherwise two local accounts in the same class overwrote each other.
	func(tx *sql.Tx) error {
		statements := []string{
			`CREATE TABLE AGENDA_NEW (
				agenda_id INTEGER NOT NULL,
				agenda_name TEXT NOT NULL,
				type TEXT NOT NULL,
				modality TEXT NOT NULL,
				start_date TEXT NOT NULL,
				end_date TEXT NOT NULL,
				comment TEXT NOT NULL,
				room_id INTEGER,
				discip_id INTEGER NOT NULL,
				user_id INTEGER NOT NULL,
				PRIMARY KEY (agenda_id, user_id),
				FOREIGN KEY (room_id) REFERENCES SALLES (room_id),
				FOREIGN KEY (discip_id) REFERENCES DISCIPLINES (discip_id),
				FOREIGN KEY (user_id) REFERENCES USER (user_id)
			)`,
			`INSERT INTO AGENDA_NEW SELECT agenda_id, agenda_name, type, modality, start_date, end_date,
				comment, room_id, discip_id, user_id FROM AGENDA`,
			`DROP TABLE AGENDA`,
			`ALTER TABLE AGENDA_NEW RENAME TO AGENDA`,
			`CREATE INDEX IF NOT EXISTS idx_agenda_user_start ON AGENDA (user_id, start_date)`,
		}
		for _, stmt := range statements {
			if _, err := tx.Exec(stmt); err != nil {
				return err
			}
		}
		return nil
	},
}

// initSchema creates the missing tables, then applies the pending migrations.
func initSchema(db *sql.DB) error {
	for _, table := range tables {
		if _, err := db.Exec(table.schema); err != nil {
			return fmt.Errorf("création de la table %s : %w", table.name, err)
		}
	}

	var version int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("lecture de la version du schéma : %w", err)
	}

	for ; version < len(migrations); version++ {
		next := version + 1
		err := withTx(db, func(tx *sql.Tx) error {
			if err := migrations[version](tx); err != nil {
				return err
			}
			_, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", next))
			return err
		})
		if err != nil {
			return fmt.Errorf("migration du schéma vers la version %d : %w", next, err)
		}
		Log.Infos(fmt.Sprintf("DB schema migrated to version %d", next))
	}
	return nil
}

func addColumnIfMissing(tx *sql.Tx, table, column, definition string) error {
	rows, err := tx.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid       int
			name      string
			colType   string
			notNull   int
			dfltValue sql.NullString
			pk        int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dfltValue, &pk); err != nil {
			return err
		}
		if name == column {
			return nil
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}
	rows.Close()

	_, err = tx.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition))
	return err
}
