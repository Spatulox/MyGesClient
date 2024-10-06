package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"errors"
	"fmt"
)

func (a *App) GetGrades(year string) (string, error) {
	return "coucou", nil
	//return GetDBUserGrades(a.db)
}

/*
 * Refresh the Grades by asking the MyGes DB, and store it inside the LocalDB and sent back the fresh datas
 */
func (a *App) RefreshGrades(year string) ([]Grades, error) {
	if FETCHINGGRADES == 1 {
		return nil, errors.New("Waiting for the previous grades fetch to end")
	}
	FETCHINGGRADES = 1
	defer func() { FETCHINGGRADES = 0 }()
	Log.Infos("Refreshing Grades")

	api := a.api
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshGrades")
	}

	grades, err := api.GetGrades(year)
	if err != nil {
		Log.Error(fmt.Sprintf("Something went wrong wen fetching grades %v", err))
	}

	SaveGradesToDB(grades, a.db)

	userGrades, err := GetDBUserGrades(year, a.db)
	if err != nil {
		return nil, err
	}
	return userGrades, nil
}
