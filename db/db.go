package db

import (
	. "MyGesClient/structures"
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

/*func GetDBUserGrades(db *sql.DB) (string, error) {
	return grades, nil
}*/
