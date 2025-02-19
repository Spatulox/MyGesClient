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

func (a *App) GetAbsences(year string) ([]LocalAbsences, error) {
	return GetDBUserAbsences(year, a.db)
}

func (a *App) RefreshAbsences(year string) ([]LocalAbsences, error) {
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
	Log.Infos("Refreshing Grades")

	api := a.api
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshGrades")
	}

	grades, err := api.GetAbsences(year)
	if err != nil {
		Log.Error(fmt.Sprintf("Something went wrong wen fetching grades %v", err))
	}

	SaveAbsencesToDB(grades, a.db)

	userAbs, err := GetDBUserAbsences(year, a.db)
	if err != nil {
		return nil, err
	}
	return userAbs, nil
}
