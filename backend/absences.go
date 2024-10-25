package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"errors"
	"fmt"
)

func (a *App) ReturnRefreshAbsencesState() int {
	return FETCHINGABSENCES
}

func (a *App) GetAbsences(year string) ([]LocalAbsences, error) {
	return GetDBUserAbsences(year, a.db)
}

func (a *App) RefreshAbsences(year string) ([]LocalAbsences, error) {
	if FETCHINGABSENCES == 1 {
		return nil, errors.New("Waiting for the previous grades fetch to end")
	}
	FETCHINGABSENCES = 1
	defer func() { FETCHINGABSENCES = 0 }()
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
