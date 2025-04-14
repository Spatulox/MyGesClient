package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

func (a *App) ReturnRefreshScheduleState() bool {
	return a.isFetchingSchedule
}

/*
 * Public function to Get the Local Agenda
 */
func (a *App) GetAgenda(start *string, end *string) ([]LocalAgenda, error) {
	var startDate, endDate time.Time
	var err error

	if start != nil && end != nil {
		startDate, err = parseAndAdjustDate(*start, true) // true pour début de journée
		if err != nil {
			return []LocalAgenda{}, fmt.Errorf("Impossible to parse start date: %v", err)
		}
		endDate, err = parseAndAdjustDate(*end, false) // false pour fin de journée
		if err != nil {
			return []LocalAgenda{}, fmt.Errorf("Impossible to parse end date: %v", err)
		}
	} else {
		// Utiliser la semaine en cours si start ou end n'est pas fourni
		now := time.Now()
		startDate = now.AddDate(0, 0, -int(now.Weekday())+1) // Lundi de la semaine courante
		startDate = time.Date(startDate.Year(), startDate.Month(), startDate.Day(), 0, 0, 0, 0, time.Local)
		endDate = startDate.AddDate(0, 0, 5) // Samedi
		endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 0, 0, 0, time.Local)
	}

	startDateStr := startDate.Format("2006-01-02T15:04:05.000Z")
	endDateStr := endDate.Format("2006-01-02T15:04:05.000Z")

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()
	return GetDBUserAgenda(a.db, startDateStr, endDateStr)
}

/*
 * Refresh the Schedule bu asking the MyGes DB, and store it inside the LocalDB and send back the fresh datas
 */
func (a *App) RefreshAgenda(start *string, end *string) ([]LocalAgenda, error) {

	if a.getAPI() == nil {
		return []LocalAgenda{}, fmt.Errorf("GES instance is nil")
	}

	a.scheduleMutex.Lock()
	//Log.Debug("scheduleMutex locked")
	if a.isFetchingSchedule {
		//Log.Debug("isFetchingSchedule is true, returning early")
		a.scheduleMutex.Unlock()
		//Log.Debug("scheduleMutex unlocked")
		return nil, errors.New("waiting for the previous schedule fetch to end")
	}
	a.isFetchingSchedule = true
	//Log.Debug("isFetchingSchedule set to true")
	a.scheduleMutex.Unlock()
	//Log.Debug("scheduleMutex unlocked2")

	defer func() {
		//Log.Debug("scheduleMutex locked2")
		a.scheduleMutex.Lock()
		a.isFetchingSchedule = false
		//Log.Debug("isFetchingSchedule set to false")
		a.scheduleMutex.Unlock()
		//Log.Debug("scheduleMutex unlocked")
	}()

	var startDate, endDate string
	var startInt, endInt error

	if start != nil && end != nil {
		startDate, startInt = checkDateFormat(*start)
		endDate, endInt = checkDateFormat(*end)

		if startInt != nil || endInt != nil {
			Log.Infos(fmt.Sprintf("start : %s, end : %s\n", *start, *end))
			Log.Infos(fmt.Sprintf("erreur startInt %v\n erreur end int %v\n", startInt, endInt))
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

	api := a.getAPI()
	if api == nil {
		return nil, fmt.Errorf("GESapi instance is nil for RefreshSchedule")
	}

	agenda, err := api.GetAgenda(startDate, endDate)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when retrieving schedule : %s", err.Error()))
		return nil, err
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()
	if agenda != "" {
		// ---- Delete all data in AGENDA ---- //
		_, err = deleteAgendaData(startDate, endDate, a.db)
		if err != nil {
			return nil, err
		}

		// ---- Add all data in AGENDA ---- //
		SaveAgendaToDB(agenda, a.db)
	} else {
		Log.Error("Impossible to save Schedule to DB, nothing have been sent back")
		return nil, fmt.Errorf("Impossible to save Schedule to DB, nothing have been sent back")
	}

	// ---- Get all data in AGENDA ---- //

	userAgenda, err := GetDBUserAgenda(a.db, startDate, endDate)
	if err != nil {
		return nil, err
	}
	return userAgenda, nil
}

func deleteAgendaData(startDate string, endDate string, db *sql.DB) ([]LocalAgenda, error) {
	tx, err := db.Begin()
	if err != nil {
		Log.Error(err.Error())
	}

	user, _ := GetUser(db)

	stmtDeleteAgenda, err := tx.Prepare(`
		DELETE FROM AGENDA WHERE start_date >= ? AND end_date <= ? AND user_id = ?
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
		return nil, nil
	}
	defer stmtDeleteAgenda.Close()

	_, err = stmtDeleteAgenda.Exec(startDate, endDate, user.ID)
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

	return []LocalAgenda{}, nil
}

func parseAndAdjustDate(dateStr string, isStart bool) (time.Time, error) {
	// Essayer de parser la date dans différents formats
	layouts := []string{
		"2006-01-02T15:04:05.000Z",
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		// Ajoutez d'autres formats si nécessaire
	}

	var parsedTime time.Time
	var err error

	for _, layout := range layouts {
		parsedTime, err = time.Parse(layout, dateStr)
		if err == nil {
			break
		}
	}

	if err != nil {
		return time.Time{}, err
	}

	// Ajuster l'heure selon qu'il s'agit de la date de début ou de fin
	if isStart {
		return time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(), 0, 0, 0, 0, time.Local), nil
	}
	return time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(), 23, 0, 0, 0, time.Local), nil
}
