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

// GetAbsences returns the cached absences of the current school year.
func (a *App) GetAbsences() ([]LocalAbsences, error) {
	return a.GetAbsencesForYear("")
}

// GetAbsencesForYear returns the cached absences of the given school year ("2024"
// for 2024-2025, "" for the current one). Empty until RefreshAbsencesForYear has
// fetched that year once.
func (a *App) GetAbsencesForYear(year string) ([]LocalAbsences, error) {
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
	return GetDBUserAbsences(a.db, user.ID, year)
}

func (a *App) RefreshAbsences() ([]LocalAbsences, error) {
	return a.RefreshAbsencesForYear("")
}

// RefreshAbsencesForYear fetches the absences of the given school year ("" for the
// current one) from MyGes, replaces that year in the local cache (the other
// years are kept) and returns them.
func (a *App) RefreshAbsencesForYear(year string) ([]LocalAbsences, error) {
	year, err := a.resolveYear(year)
	if err != nil {
		return nil, err
	}

	if a.getAPI() == nil {
		return []LocalAbsences{}, fmt.Errorf("GES instance is nil")
	}

	if !a.isFetchingAbsences.CompareAndSwap(false, true) {
		return nil, errors.New("waiting for the previous absences fetch to end")
	}
	defer a.isFetchingAbsences.Store(false)

	Log.Infos(fmt.Sprintf("Refreshing Absences of %s", year))

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
