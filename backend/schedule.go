package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"errors"
	"fmt"
	"time"
)

/*
 * Public function to Get the Local Agenda
 */
func (a *App) GetAgenda(start *string, end *string) ([]LocalAgenda, error) {

	var startDate, endDate string
	var startInt, endInt error

	if start != nil && end != nil {
		startDate, startInt = checkDateFormat(*start)
		endDate, endInt = checkDateFormat(*end)

		if startInt != nil || endInt != nil {
			return []LocalAgenda{}, errors.New("Impossible to parse date (start or end date in GetAgenda)")
		}
	} else {
		// Utiliser la semaine en cours si start ou end n'est pas fourni
		now := time.Now()
		monday := now.AddDate(0, 0, -int(now.Weekday())+1)
		saturday := monday.AddDate(0, 0, 5)

		startDate = monday.Format("2006-01-02T15:04:05.000Z")
		endDate = saturday.Format("2006-01-02T15:04:05.000Z")
	}

	println(startDate, endDate)
	return GetDBUserAgenda(a.db, startDate, endDate)
}

/*
 * Refresh the Schedule bu asking the MyGes DB, and store it inside the LocalDB and send back the fresh datas
 */
func (a *App) RefreshAgenda(start *string, end *string) ([]LocalAgenda, error) {
	if FETCHINGSCHEDULE == 1 {
		return nil, errors.New("Waiting for the previous schedule fetch to end")
	}
	FETCHINGSCHEDULE = 1
	defer func() { FETCHINGSCHEDULE = 0 }()
	Log.Infos("Refreshing Schedule")

	var startDate, endDate string
	var startInt, endInt error

	if start != nil && end != nil {
		startDate, startInt = checkDateFormat(*start)
		endDate, endInt = checkDateFormat(*end)

		if startInt != nil || endInt != nil {
			fmt.Printf("start : %s, end : %s\n", *start, *end)
			fmt.Printf("erreur startInt %v\n erreur end int %v\n", startInt, endInt)
			return nil, errors.New("Impossible to parse date (start or end date in RefreshAgenda in if)")
		}

	} else {
		// Utiliser la semaine en cours si start ou end n'est pas fourni
		now := time.Now()
		monday := now.AddDate(0, 0, -int(now.Weekday())+1)
		saturday := monday.AddDate(0, 0, 5)

		startDate = monday.Format("2006-01-02T15:04:05.000Z")
		endDate = saturday.Format("2006-01-02T15:04:05.000Z")
	}

	if startInt != nil || endInt != nil {
		return nil, errors.New("Impossible to parse date (start or end date in RefreshAgenda in else)")
	}

	api := a.api
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshSchedule")
	}

	agenda, err := api.GetAgenda(startDate, endDate)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when retrieving schedule : %s", err.Error()))
		return nil, err
	}

	// ---- Delete all data in AGENDA ---- //
	tx, err := a.db.Begin()
	if err != nil {
		Log.Error(err.Error())
	}

	stmtDeleteAgenda, err := tx.Prepare(`
		DELETE FROM AGENDA WHERE start_date >= ? AND end_date <= ?
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
		return nil, nil
	}
	defer stmtDeleteAgenda.Close()

	_, err = stmtDeleteAgenda.Exec(startDate, endDate)
	if err != nil {
		tx.Rollback()
		Log.Error("DELETE AGENDA : " + err.Error())
		return nil, nil
	}
	// Valider la transaction
	err = tx.Commit()
	if err != nil {
		Log.Error(err.Error())
	}
	
	// ---- Add all data in AGENDA ---- //

	SaveAgendaToDB(agenda, a.db)

	// ---- Get all data in AGENDA ---- //

	userAgenda, err := GetDBUserAgenda(a.db, startDate, endDate)
	if err != nil {
		return nil, err
	}
	return userAgenda, nil
}
