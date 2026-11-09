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

func (a *App) GetGrades() ([]LocalGrades, error) {
	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}
	return GetDBUserGrades(a.db, user.ID, a.getYear())
}

/*
 * Refresh the Grades by asking the MyGes DB, and store it inside the LocalDB and sent back the fresh datas
 */
func (a *App) RefreshGrades() ([]LocalGrades, error) {

	if a.getAPI() == nil {
		return []LocalGrades{}, fmt.Errorf("GES instance is nil")
	}

	if !a.isFetchingGrades.CompareAndSwap(false, true) {
		return nil, errors.New("waiting for the previous grades fetch to end")
	}
	defer a.isFetchingGrades.Store(false)

	year := a.getYear()

	Log.Infos("Refreshing Grades")

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
