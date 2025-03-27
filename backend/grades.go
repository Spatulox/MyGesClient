package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"errors"
	"fmt"
)

func (a *App) ReturnRefreshGradesState() bool {
	return a.isFetchingGrades
}

func (a *App) GetGrades() ([]LocalGrades, error) {
	return GetDBUserGrades(a.year, a.db)
}

/*
 * Refresh the Grades by asking the MyGes DB, and store it inside the LocalDB and sent back the fresh datas
 */
func (a *App) RefreshGrades() ([]LocalGrades, error) {

	if a.getAPI() == nil {
		return []LocalGrades{}, fmt.Errorf("GES instance is nil")
	}

	a.gradesMutex.Lock()
	if a.isFetchingGrades {
		a.gradesMutex.Unlock()
		return nil, errors.New("waiting for the previous grades fetch to end")
	}
	a.isFetchingGrades = true
	a.gradesMutex.Unlock()

	defer func() {
		a.gradesMutex.Lock()
		a.isFetchingGrades = false
		a.gradesMutex.Unlock()
	}()
	Log.Infos("Refreshing Grades")

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshGrades")
	}

	grades, err := api.GetGrades(a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("Something went wrong wen fetching grades %v", err))
	}

	// Curr year, but if your begin the school year in 2024, you need to request 2024 grades for 2025 year grades
	if grades == "null" {
		return []LocalGrades{}, nil
	}

	err = DeleteGradesForYear(a.db, a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("%v", err))
		return nil, err
	}

	SaveGradesToDB(grades, a.db)

	userGrades, err := GetDBUserGrades(a.year, a.db)
	if err != nil {
		return nil, err
	}
	return userGrades, nil
}

func DeleteGradesForYear(db *sql.DB, year string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("erreur lors du début de la transaction : %v", err)
	}
	defer tx.Rollback() // En cas d'erreur, la transaction sera annulée

	user, _ := GetUser(db)

	// Supprimer d'abord les entrées dans GRADESVALUE
	_, err = tx.Exec(`
        DELETE FROM GRADESVALUE
        WHERE note_id IN (SELECT note_id FROM NOTES WHERE year = ? AND user_id = ?)
    `, year, user.ID)
	if err != nil {
		return fmt.Errorf("erreur lors de la suppression des GRADESVALUE : %v", err)
	}

	// Ensuite, supprimer les entrées dans NOTES
	result, err := tx.Exec(`
        DELETE FROM NOTES WHERE year = ? AND user_id = ?
    `, year, user.ID)
	if err != nil {
		Log.Infos(fmt.Sprintf("erreur lors de la suppression des NOTES : %v", err))
	}

	// Vérifier si des lignes ont été affectées
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		Log.Infos(fmt.Sprintf("erreur lors de la récupération des lignes affectées : %v", err))
	}

	if rowsAffected == 0 {
		Log.Infos(fmt.Sprintf("aucune note trouvée pour l'année %s", year))
	}

	// Valider la transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("erreur lors de la validation de la transaction : %v", err)
	}

	Log.Infos("Grades and GradesValue successfully deleted")
	return nil
}
