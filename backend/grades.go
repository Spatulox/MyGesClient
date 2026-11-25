package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"errors"
	"fmt"
)

func (a *App) ReturnRefreshGradesState() bool {
	return a.isFetchingGrades.Load()
}

// GetGrades returns the cached grades of the current school year.
func (a *App) GetGrades() ([]LocalGrades, error) {
	return a.GetGradesForYear("")
}

// GetGradesForYear returns the cached grades of the given school year ("2024"
// for 2024-2025, "" for the current one). Empty until RefreshGradesForYear has
// fetched that year once.
func (a *App) GetGradesForYear(year string) ([]LocalGrades, error) {
	year, err := a.resolveYear(year)
	if err != nil {
		return nil, err
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}
	return GetDBUserGrades(a.db, user.ID, year)
}

/*
 * Refresh the Grades by asking the MyGes DB, and store it inside the LocalDB and sent back the fresh datas
 */
func (a *App) RefreshGrades() ([]LocalGrades, error) {
	return a.RefreshGradesForYear("")
}

// RefreshGradesForYear fetches the grades of the given school year ("" for the
// current one) from MyGes, replaces that year in the local cache (the other
// years are kept) and returns them.
func (a *App) RefreshGradesForYear(year string) ([]LocalGrades, error) {
	year, err := a.resolveYear(year)
	if err != nil {
		return nil, err
	}

	if a.getAPI() == nil {
		return []LocalGrades{}, fmt.Errorf("GES instance is nil")
	}

	if !a.isFetchingGrades.CompareAndSwap(false, true) {
		return nil, errors.New("waiting for the previous grades fetch to end")
	}
	defer a.isFetchingGrades.Store(false)

	Log.Infos(fmt.Sprintf("Refreshing Grades of %s", year))

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshGrades")
	}

	grades, err := api.GetGrades(year)
	if err != nil {
		return nil, fmt.Errorf("récupération des notes depuis MyGes : %w", err)
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}

	Log.Infos("Saving Grades")
	if err := ReplaceGrades(a.db, user.ID, year, grades); err != nil {
		return nil, err
	}

	Log.Infos("Getting Grades from local DB")
	return GetDBUserGrades(a.db, user.ID, year)
}
