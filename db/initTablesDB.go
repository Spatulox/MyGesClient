package db

import (
	"database/sql"
	"fmt"
	_ "modernc.org/sqlite"
	"os"
)

// To store the user of the application
const USER = `CREATE TABLE USER (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    theme TEXT NOT NULL,
    eula BOOLEAN NOT NULL DEFAULT 0,
    selected BOOLEAN NOT NULL DEFAULT 0
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
    disci_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    coef REAL NOT NULL,
    trimestre INTEGER NOT NULL,
    teacher_id_1 INTEGER NOT NULL,
    FOREIGN KEY (teacher_id_1) REFERENCES PROFS (teacher_id)
);`

const AGENDA = `CREATE TABLE IF NOT EXISTS AGENDA (
    agenda_id INTEGER PRIMARY KEY AUTOINCREMENT,
    agenda_name TEXT NOT NULL,
    type TEXT NOT NULL,
    modality TEXT NOT NULL,
    start_date TEXT NOT NULL,  -- Utilisation de TEXT pour les dates
    end_date TEXT NOT NULL,     -- Utilisation de TEXT pour les dates
    comment TEXT NOT NULL,
    room_id INTEGER NOT NULL,
    discip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES SALLES (room_id),
    FOREIGN KEY (discip_id) REFERENCES DISCIPLINES (discip_id),
    FOREIGN KEY (user_id) REFERENCES UTILISATEUR (user_id)
);`

func initDBTables() {
	db, err := sql.Open("sqlite3", "./db.sqlite")
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
		fmt.Printf("Erreur lors de la création de la table users: %v\n", err)
		return
	}
	fmt.Println("Table 'users' créée avec succès.")

	if _, err := db.Exec(SALLES); err != nil {
		fmt.Printf("Erreur lors de la création de la table users: %v\n", err)
		return
	}
	fmt.Println("Table 'users' créée avec succès.")

	if _, err := db.Exec(PROFS); err != nil {
		fmt.Printf("Erreur lors de la création de la table users: %v\n", err)
		return
	}
	fmt.Println("Table 'users' créée avec succès.")

	if _, err := db.Exec(DISCIPLINES); err != nil {
		fmt.Printf("Erreur lors de la création de la table users: %v\n", err)
		return
	}
	fmt.Println("Table 'users' créée avec succès.")

	if _, err := db.Exec(AGENDA); err != nil {
		fmt.Printf("Erreur lors de la création de la table users: %v\n", err)
		return
	}
	fmt.Println("Table 'users' créée avec succès.")

}

func createDB() error {
	dbFile := "./db.sqlite"

	// Vérifie si le fichier existe
	if _, err := os.Stat(dbFile); os.IsNotExist(err) {
		// Le fichier n'existe pas, donc on le crée
		file, err := os.Create(dbFile)
		if err != nil {
			return fmt.Errorf("erreur lors de la création du fichier de base de données: %v", err)
		}
		defer file.Close()
		fmt.Println("Fichier db.sqlite créé.")
		initDBTables()
	} else {
		fmt.Println("Le fichier db.sqlite existe déjà.")
	}

	return nil
}
