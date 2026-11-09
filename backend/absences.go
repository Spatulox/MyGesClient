package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"errors"
	"fmt"
)

func (a *App) ReturnRefreshAbsencesState() bool {
	return a.isFetchingAbsences.Load()
}

func (a *App) GetAbsences() ([]LocalAbsences, error) {
	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}
	return GetDBUserAbsences(a.db, user.ID, a.getYear())
}

func (a *App) RefreshAbsences() ([]LocalAbsences, error) {

	if a.getAPI() == nil {
		return []LocalAbsences{}, fmt.Errorf("GES instance is nil")
	}

	if !a.isFetchingAbsences.CompareAndSwap(false, true) {
		return nil, errors.New("waiting for the previous absences fetch to end")
	}
	defer a.isFetchingAbsences.Store(false)

	year := a.getYear()

	Log.Infos("Refreshing Absences")

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshAbsences")
	}

	absences, err := api.GetAbsences(year)
	if err != nil {
		return nil, fmt.Errorf("récupération des absences depuis MyGes : %w", err)
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}

	if err := ReplaceAbsences(a.db, user.ID, year, absences); err != nil {
		return nil, err
	}

	return GetDBUserAbsences(a.db, user.ID, year)
}
