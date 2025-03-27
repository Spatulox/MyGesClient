package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"errors"
	"fmt"
)

func (a *App) ReturnRefreshAbsencesState() bool {
	return a.isFetchingAbsences
}

func (a *App) GetAbsences() ([]LocalAbsences, error) {
	return GetDBUserAbsences(a.year, a.db)
}

func (a *App) RefreshAbsences() ([]LocalAbsences, error) {

	if a.getAPI() == nil {
		return []LocalAbsences{}, fmt.Errorf("GES instance is nil")
	}

	a.absencesMutex.Lock()
	if a.isFetchingAbsences {
		a.absencesMutex.Unlock()
		return nil, errors.New("waiting for the previous absences fetch to end")
	}
	a.isFetchingAbsences = true
	a.absencesMutex.Unlock()

	defer func() {
		a.absencesMutex.Lock()
		a.isFetchingAbsences = false
		a.absencesMutex.Unlock()
	}()
	Log.Infos("Refreshing Absences")

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshAbsences")
	}

	absences, err := api.GetAbsences(a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("Something went wrong wen fetching grades %v", err))
	}

	if absences == "null" {
		return []LocalAbsences{}, nil
	}

	err = DeleteAbsencesForYear(a.db, a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("%v", err))
		return nil, err
	}
	SaveAbsencesToDB(absences, a.db)

	userAbs, err := GetDBUserAbsences(a.year, a.db)
	if err != nil {
		return nil, err
	}
	return userAbs, nil
}

// -------------------------------------------------------------------------- //

func DeleteAbsencesForYear(db *sql.DB, year string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("erreur lors du début de la transaction : %v", err)
	}
	defer tx.Rollback() // En cas d'erreur, la transaction sera annulée

	user, err := GetUser(db)
	if err != nil {
		return fmt.Errorf("erreur lors de la récupération de l'utilisateur : %v", err)
	}

	// Supprimer les entrées dans ABSENCES
	result, err := tx.Exec(`
        DELETE FROM ABSENCES 
        WHERE abs_year = ? AND user_id = ?
    `, year, user.ID)
	if err != nil {
		return fmt.Errorf("erreur lors de la suppression des ABSENCES : %v", err)
	}

	// Vérifier si des lignes ont été affectées
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		Log.Infos(fmt.Sprintf("erreur lors de la récupération des lignes affectées : %v", err))
	}

	if rowsAffected == 0 {
		Log.Infos(fmt.Sprintf("aucune absence trouvée pour l'année %s", year))
	} else {
		Log.Infos(fmt.Sprintf("%d absences supprimées pour l'année %s", rowsAffected, year))
	}

	// Valider la transaction
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("erreur lors de la validation de la transaction : %v", err)
	}

	Log.Infos("Absences successfully deleted")
	return nil
}
