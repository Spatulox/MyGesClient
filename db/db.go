package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

// ------------------------------------------------ //

func InitDBConnexion(mutex *sync.Mutex, waitgroup *sync.WaitGroup) (*sql.DB, error) {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'obtention du dossier AppData: %v", err)
	}

	dbFolder := filepath.Join(appDataPath, "MyGes")
	dbPath := filepath.Join(appDataPath, "MyGes", "db.sqlite")

	// Assurez-vous que le dossier MyGes existe
	err = os.MkdirAll(filepath.Dir(dbFolder), 0755)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la création du dossier MyGes: %v", err)
	}

	if err := createDB(mutex, waitgroup); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'ouverture de la base de données: %v", err)
	}

	return db, nil
}

// ------------------------------------------------ //

// CreateUser creates a new account and makes it the only selected one.
func CreateUser(db *sql.DB, username string, password string) (bool, error) {
	err := withTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec("UPDATE USER SET selected = false"); err != nil {
			return fmt.Errorf("Erreur lors de l'update des utilisateurs existants (selected column) : %w", err)
		}
		if _, err := tx.Exec("INSERT INTO USER (username, password, selected) VALUES (?, ?, true)", username, password); err != nil {
			return fmt.Errorf("Erreur lors de l'insertion du nouvel utilisateur : %w", err)
		}
		return nil
	})
	return err == nil, err
}

func CheckUserExist(db *sql.DB, username string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM USER WHERE username = ?)", username).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("Erreur lors du check si l'utilisateur %s existe : %w", username, err)
	}
	return exists, nil
}

// ------------------------------------------------ //

func UpdateUserPassword(db *sql.DB, username string, password string) (bool, error) {
	result, err := db.Exec("UPDATE USER SET password = ? WHERE username = ?", password, username)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'update de l'utilisateurs %s : %w", username, err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}
	if rowsAffected != 1 {
		return false, fmt.Errorf("Aucun compte local ne correspond à l'utilisateur %s", username)
	}
	return true, nil
}

// ------------------------------------------------ //

func UpdateUserLastYear(db *sql.DB, year string) (bool, error) {
	_, err := db.Exec("UPDATE USER SET last_year = ? WHERE selected = true", year)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'update de l'année de l'utilisateurs : %w", err)
	}
	return true, nil
}

// ------------------------------------------------ //

func GetUser(db *sql.DB) (UserSettings, error) {
	var user UserSettings
	query := `SELECT user_id, username, password, theme, eula, last_year FROM USER WHERE selected = true`
	err := db.QueryRow(query).Scan(&user.ID, &user.Username, &user.Password, &user.Theme, &user.EULA, &user.Year)
	if err != nil {
		Log.Error(fmt.Sprintf("1 %v", err))
		return UserSettings{}, err
	}
	return user, nil
}

// ------------------------------------------------ //

func GetLastYearInDB(db *sql.DB) (string, error) {
	var year string
	query := `SELECT last_year FROM USER WHERE selected = true`
	err := db.QueryRow(query).Scan(&year)
	if err != nil {
		Log.Error(fmt.Sprintf("2 %v", err))
		return "1970", err
	}
	return year, nil
}

// ------------------------------------------------ //

func GetRegisteredUsers(db *sql.DB) ([]UserSettings, error) {
	query := `SELECT user_id, username, password, theme, eula, last_year FROM USER` // WHERE selected = 0`
	rows, err := db.Query(query)
	if err != nil {
		Log.Error(fmt.Sprintf("3 %v", err))
		return nil, err
	}
	defer rows.Close()

	var users []UserSettings
	for rows.Next() {
		var user UserSettings
		err := rows.Scan(&user.ID, &user.Username, &user.Password, &user.Theme, &user.EULA, &user.Year)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// ------------------------------------------------ //

func DeconnectUser(db *sql.DB) error {
	user, err := GetUser(db)
	if err != nil {
		return fmt.Errorf("Impossible to select the current user :/")
	}
	query := `UPDATE USER SET selected = 0 WHERE user_id = ?`
	_, err = db.Exec(query, user.ID)
	if err != nil {
		return err
	}

	return nil
}

// ------------------------------------------------ //

// ErrBadCredentials is returned by ConnectUser when no local account matches.
var ErrBadCredentials = errors.New("nom d'utilisateur ou mot de passe incorrect")

// ConnectUser selects the account matching username and password, and
// deselects every other account. Nothing changes if the credentials are wrong.
func ConnectUser(db *sql.DB, username string, password string) error {
	return withTx(db, func(tx *sql.Tx) error {
		result, err := tx.Exec(`UPDATE USER SET selected = true WHERE username = ? AND password = ?`, username, password)
		if err != nil {
			return fmt.Errorf("Error when connecting the user : %w", err)
		}
		n, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
		}
		if n != 1 {
			return ErrBadCredentials
		}
		if _, err := tx.Exec(`UPDATE USER SET selected = false WHERE username <> ?`, username); err != nil {
			return fmt.Errorf("Error when deselecting the other users : %w", err)
		}
		return nil
	})
}

// ------------------------------------------------ //

func UpdateUserEula(db *sql.DB) (bool, error) {
	updateQuery := `UPDATE USER SET eula = true WHERE selected = true`
	result, err := db.Exec(updateQuery)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la mise à jour de l'EULA : %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}

	if rowsAffected == 0 {
		return false, fmt.Errorf("Aucun utilisateur sélectionné trouvé pour la mise à jour de l'EULA")
	}

	return true, nil
}

// ------------------------------------------------ //

func UpdateUserTheme(db *sql.DB, value string) (bool, error) {

	if value != "dark" && value != "light" {
		return false, errors.New("ERROR : Wrong value")
	}

	updateQuery := `UPDATE USER SET theme = ? WHERE selected = true`

	result, err := db.Exec(updateQuery, value)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la mise à jour du thème : %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}

	if rowsAffected == 0 {
		return false, fmt.Errorf("Aucun utilisateur sélectionné trouvé pour la mise à jour du thème")
	}

	return true, nil
}

// ------------------------------------------------ //

// DeleteOldData purges, for the selected user only, the past schedule and
// events, and the grades / absences of the years before the current one.
func DeleteOldData(db *sql.DB) error {
	user, err := GetUser(db)
	if err != nil {
		return fmt.Errorf("impossible de sélectionner l'utilisateur actuellement connecté : %w", err)
	}

	Log.Infos(fmt.Sprintf("Deleting old data for user : %d", user.ID))

	year, err := strconv.Atoi(user.Year)
	if err != nil {
		return fmt.Errorf("année invalide pour l'utilisateur (%q) : %w", user.Year, err)
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	agendaLimit := today.Format("2006-01-02T15:04:05.000Z") // AGENDA date format
	eventLimit := today.Format("2006-01-02 15:04:05")       // EVENTS date format

	return withTx(db, func(tx *sql.Tx) error {
		queries := []struct {
			label string
			query string
			args  []any
		}{
			{"agenda", `DELETE FROM AGENDA WHERE user_id = ? AND start_date < ?`, []any{user.ID, agendaLimit}},
			{"valeurs des notes", `DELETE FROM GRADESVALUE WHERE note_id IN (SELECT note_id FROM NOTES WHERE user_id = ? AND year < ?)`, []any{user.ID, year}},
			{"notes", `DELETE FROM NOTES WHERE user_id = ? AND year < ?`, []any{user.ID, year}},
			{"absences", `DELETE FROM ABSENCES WHERE user_id = ? AND CAST(abs_year AS INTEGER) < ?`, []any{user.ID, year}},
			{"évènements", `DELETE FROM EVENTS WHERE user_id = ? AND start_date < ?`, []any{user.ID, eventLimit}},
		}
		for _, q := range queries {
			if _, err := tx.Exec(q.query, q.args...); err != nil {
				return fmt.Errorf("erreur lors de la suppression (%s) : %w", q.label, err)
			}
		}
		return nil
	})
}

func SavePreset(db *sql.DB, presetName string, value string, presetType string) bool {
	user, err := GetUser(db)

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible de sélectionner l'utilisateur actuellement connecté : %v", err))
		return false
	}

	query := `
		INSERT INTO PRESET (user_id, name, value, type)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, name, type) DO UPDATE SET value=excluded.value
	`
	_, err = db.Exec(query, user.ID, presetName, value, presetType)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when connecting the user : %v", err))
		return false
	}
	return true
}

func GetPresetByName(db *sql.DB, presetName string) (Preset, error) {
	user, err := GetUser(db)
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible de sélectionner l'utilisateur actuellement connecté : %v", err))
		return Preset{}, fmt.Errorf("Impossible de récupérer l'utilisateur : %v", err)
	}

	query := `
        SELECT id, name, value, type
        FROM PRESET
        WHERE user_id = ? AND name = ?
        LIMIT 1
    `
	var p Preset
	row := db.QueryRow(query, user.ID, presetName)
	err = row.Scan(&p.ID, &p.Name, &p.Value, &p.Type)
	if err != nil {
		if err == sql.ErrNoRows {
			return Preset{}, fmt.Errorf("Aucun preset trouvé pour ce nom")
		}
		return Preset{}, fmt.Errorf("Erreur lors de la récupération du preset par son nom : %v", err)
	}
	return p, nil
}

func GetPresetByID(db *sql.DB, id int) (Preset, error) {

	query := `
        SELECT id, name, value, type
        FROM PRESET
        WHERE id = ?
        LIMIT 1
    `
	var p Preset
	row := db.QueryRow(query, id)
	err := row.Scan(&p.ID, &p.Name, &p.Value, &p.Type)
	if err != nil {
		if err == sql.ErrNoRows {
			return Preset{}, fmt.Errorf("Aucun preset trouvé pour ce nom")
		}
		return Preset{}, fmt.Errorf("Erreur lors de la récupération du preset par son id : %v", err)
	}
	return p, nil
}
