package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	. "MyGesClient/time"
	"database/sql"
	"errors"
	"fmt"
	_ "modernc.org/sqlite"
	"os"
)

// ------------------------------------------------ //

func InitDBConnexion() (*sql.DB, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'obtention du répertoire de travail: %v", err)
	}

	println("Current working directory:", cwd)

	if err := createDB(); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", "./db.sqlite")
	if err != nil {
		fmt.Printf("Error opening database: %v\n", err)
		return nil, err
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
	_, err := db.Exec("SELECT * FROM USER WHERE username = ?", username)
	if err != nil {
		return false, fmt.Errorf("Erreur lors du check si l'utilisateurs %s existe : %w", username, err)
	}
	return true, nil
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

func GetUser(db *sql.DB) (UserSettings, error) {
	var user UserSettings
	query := `SELECT user_id, username, password, theme, eula FROM USER WHERE selected = true`
	err := db.QueryRow(query).Scan(&user.ID, &user.Username, &user.Password, &user.Theme, &user.EULA)
	if err != nil {
		return UserSettings{}, err
	}
	return user, nil
}

// ------------------------------------------------ //

func GetRegisteredUsers(db *sql.DB) ([]UserSettings, error) {
	query := `SELECT user_id, username, password, theme, eula FROM USER` // WHERE selected = 0`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []UserSettings
	for rows.Next() {
		var user UserSettings
		err := rows.Scan(&user.ID, &user.Username, &user.Password, &user.Theme, &user.EULA)
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

	// Delete Grades
	selectGradeValueQuery := `SELECT note_id FROM NOTES WHERE year <= ? AND user_id = ?`
	year := GetCurrentYear()
	year -= 1

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
