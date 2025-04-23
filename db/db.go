package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	. "MyGesClient/time"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"sync"

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

func CreateUser(db *sql.DB, username string, password string) (bool, error) {
	// Désélectionner tous les utilisateurs existants
	_, err := db.Exec("UPDATE USER SET selected = false")
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'update des utilisateurs existants (selected column) : %w", err)
	}

	// Insérer le nouvel utilisateur
	result, err := db.Exec("INSERT INTO USER (username, password, selected) VALUES (?, ?, true)", username, password)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'insertion du nouvel utilisateur : %w", err)
	}

	// Récupérer l'ID du nouvel utilisateur
	_, err = result.LastInsertId()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la récupération de l'ID du nouvel utilisateur : %w", err)
	}
	return true, nil
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
	_, err := db.Exec("UPDATE USER SET password = ? WHERE username = ?", username, password)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'update de l'utilisateurs %s : %w", username, err)
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

func ConnectUser(db *sql.DB, username string, password string) bool {
	updateQuery := `UPDATE USER SET selected = true WHERE username = ? AND password = ?`

	_, err := db.Exec(updateQuery, username, password)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when connecting the user : %v", err))
		return false
	}
	return true
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

func DeleteOldData(db *sql.DB) bool {
	user, err := GetUser(db)

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible de sélectionner l'utilisateur actuellement connecté : %v", err))
		return false
	}

	Log.Infos(fmt.Sprintf("Deleting old data for user : %d", user.ID))

	currDate := GetTodayDate()

	// Delete Schedule
	deleteQuery := `DELETE FROM AGENDA WHERE user_id = ? and start_date < ?`
	_, err = db.Exec(deleteQuery, user.ID, currDate)
	if err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la deletion de l'agenda : %w", err))
		return false
	}

	// Prepare year date
	yearStr, err := GetLastYearInDB(db)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when retrieving the last year from DB for the user : %w", err))
		return false
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when asting year str => int : %w", err))
		return false
	}
	year -= 1

	// Delete Grades
	selectGradeValueQuery := `SELECT note_id FROM NOTES WHERE year <= ? AND user_id = ?`

	_, err = db.Exec(selectGradeValueQuery, year, user.ID)
	if err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la selection de valeurs des notes : %w", err))
		return false
	}

	deleteGradeValueQuery := `DELETE FROM GRADESVALUE WHERE note_id = ?`

	_, err = db.Exec(deleteGradeValueQuery, user.ID)
	if err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la deletion de valeurs des notes : %w", err))
		return false
	}

	deleteGradeQuery := `DELETE FROM NOTES WHERE year = ?`

	_, err = db.Exec(deleteGradeQuery, year)
	if err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la deletion des notes : %w", err))
		//return false
	}

	// Delete EVENTS
	deleteEventQuery := `DELETE FROM EVENTS WHERE start_date < ?`
	_, err = db.Exec(deleteEventQuery, currDate)
	if err != nil {
		Log.Error(fmt.Sprintf("Erreur lors de la deletion des évènements : %w", err))
		//return false
	}

	return true
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
