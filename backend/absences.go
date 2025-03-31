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
	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()
	return GetDBUserAbsences(a.year, a.db)
}

func (a *App) RefreshAbsences() ([]LocalAbsences, error) {

	if a.getAPI() == nil {
		return []LocalAbsences{}, fmt.Errorf("GES instance is nil")
	}

	a.absencesMutex.Lock()
	//Log.Debug("absenceMutex locked")
	if a.isFetchingAbsences {
		//Log.Debug("isFetchingAbsences is true, returning early")
		a.absencesMutex.Unlock()
		//Log.Debug("absencesMutex unlocked")
		return nil, errors.New("waiting for the previous absences fetch to end")
	}
	a.isFetchingAbsences = true
	//Log.Debug("isFetchingAbsences set to true")
	a.absencesMutex.Unlock()
	//Log.Debug("absencesMutex unlocked2")

	defer func() {
		//Log.Debug("absencesMutex locked2")
		a.absencesMutex.Lock()
		a.isFetchingAbsences = false
		//Log.Debug("isFetchingAbsences set to false")
		a.absencesMutex.Unlock()
		//Log.Debug("absencesMutex unlocked3")
	}()

	Log.Infos("Refreshing Absences")

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshAbsences")
	}

	absences, err := api.GetAbsences(a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("Something went wrong wen fetching absences %v", err))
	}

	if absences == "null" {
		return []LocalAbsences{}, nil
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	err = DeleteAbsencesForYear(a.db, a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("%v", err))
		return nil, err
	}
	if !SaveAbsencesToDB(absences, a.db) {
		Log.Error("impossible to save absences in the db...")
	}

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
