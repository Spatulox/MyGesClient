package db

import (
	. "MyGesClient/log"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/labstack/gommon/log"
	_ "modernc.org/sqlite"
)

// To store the user of the application
const USER = `CREATE TABLE USER (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark',
    eula BOOLEAN NOT NULL DEFAULT 0,
    selected BOOLEAN NOT NULL DEFAULT 0,
	last_year TEXT NOT NULL DEFAULT '1970'
);`

// To store the schedule of the user
const SALLES = `CREATE TABLE SALLES (
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

func initDBTables() {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		Log.Error(fmt.Sprintf("erreur lors de l'obtention du dossier AppData: %v", err))
		return
	}
	dbPath := filepath.Join(appDataPath, "MyGes", "db.sqlite")
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		fmt.Printf("Erreur lors de l'ouverture de la base de données: %v\n", err)
		return
	}
	defer db.Close()

	// Enable foreign key
	if _, err := db.Exec("PRAGMA foreign_keys = ON;"); err != nil {
		fmt.Printf("Erreur lors de l'activation des clé étrangère': %v\n", err)
		return
	}

	if _, err := db.Exec(USER); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table users: %v\n", err))
		return
	}
	Log.Infos("Table 'users' créée avec succès.")

	if _, err := db.Exec(SALLES); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table salles: %v\n", err))
		return
	}
	Log.Infos("Table 'Salles' créée avec succès.")

	if _, err := db.Exec(PROFS); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table prof: %v\n", err))
		return
	}
	Log.Infos("Table 'Prof' créée avec succès.")

	if _, err := db.Exec(DISCIPLINES); err != nil {
		log.Error(fmt.Sprintf("Erreur lors de la création de la table discipline: %v\n", err))
		return
	}
	Log.Infos("Table 'Discipline' créée avec succès.")

	if _, err := db.Exec(AGENDA); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table agenda: %v\n", err))
		return
	}
	Log.Infos("Table 'Agenda' créée avec succès.")

	if _, err := db.Exec(NOTES); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table notes: %v\n", err))
		return
	}
	Log.Infos("Table 'Notes' créée avec succès.")

	if _, err := db.Exec(GRADESVALUE); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table gradesvalue: %v\n", err))
		return
	}
	Log.Infos("Table 'GradesValue' créée avec succès.")

	if _, err := db.Exec(EVENTS); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table events: %v\n", err))
		return
	}
	Log.Infos("Table 'Events' créée avec succès.")

	if _, err := db.Exec(ABSENCES); err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la création de la table absences: %v\n", err))
		return
	}
	Log.Infos("Table 'Absences' créée avec succès.")

}

func createDB() error {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("erreur lors de l'obtention du dossier AppData: %v", err)
	}

	dbDir := filepath.Join(appDataPath, "MyGes")
	dbPath := filepath.Join(dbDir, "db.sqlite")

	// Assurez-vous que le dossier MyGes existe
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return fmt.Errorf("erreur lors de la création du dossier MyGes: %v", err)
	}

	// Vérifie si le fichier existe
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		// Le fichier n'existe pas, donc on le crée
		file, err := os.Create(dbPath)
		if err != nil {
			errMsg := fmt.Sprintf("erreur lors de la création du fichier de base de données: %v", err)
			Log.Error(errMsg)
			return fmt.Errorf(errMsg)
		}
		defer file.Close()
		Log.Infos("Fichier db.sqlite créé.")

		initDBTables()
	} else if err != nil {
		return fmt.Errorf("erreur lors de la vérification de l'existence du fichier: %v", err)
	} else {
		Log.Infos("Le fichier db.sqlite existe déjà.")
	}

	return nil
}
