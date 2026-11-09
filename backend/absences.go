package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
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

	if err := ReplaceAbsences(a.db, user.ID, a.year, absences); err != nil {
		return nil, err
	}

	return GetDBUserAbsences(a.year, a.db)
}
