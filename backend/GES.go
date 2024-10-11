package backend

import (
	. "MyGesClient/log"
	"fmt"
	"time"
)

var FETCHINGSCHEDULE = 0
var FETCHINGGRADES = 0
var FETCHINGPROFILE = 0
var FETCHINGABSENCES = 0

func createErrorMessage(message string) string {
	return fmt.Sprintf("{\"message\":\"%s\"}", message)
}

func checkDateFormat(date string) (string, error) {
	// Définir le layout d'entrée
	inputLayout := "2006-01-02" // Format de la date d'entrée
	// Définir le layout de sortie
	outputLayout := "2006-01-02T15:04:05.000Z" // Format de la date de sortie

	// Analyser la chaîne de date
	parsedTime, err := time.Parse(inputLayout, date)
	if err != nil {
		return "", fmt.Errorf("impossible to parse the date: %v", err)
	}

	// Ajouter l'heure, les minutes, les secondes et définir le fuseau horaire UTC
	parsedTime = time.Date(parsedTime.Year(), parsedTime.Month(), parsedTime.Day(), 0, 0, 0, 0, time.UTC)

	formattedDate := parsedTime.Format(outputLayout)

	return formattedDate, nil
}

// ------------------------------------------------ //

/*
 * Refresh the local DB by asking the MyGes DB, and store it inside the LocalDB
 */
func (a *App) globalRefresh(year string, start string, end string) (string, error) {
	/*start2 := "2024-09-23"
	end2 := "2024-09-28"*/
	_, err := a.RefreshAgenda(&start, &end)
	if err != nil {
		Log.Error(err.Error())
		return createErrorMessage("Impossible to refresh the schedule :/"), err
	}
	_, err = a.RefreshGrades(year)
	if err != nil {
		Log.Error(err.Error())
		return createErrorMessage("Impossible to refresh grade :/"), err
	}
	_, err = a.RefreshAbsences(year)
	if err != nil {
		Log.Error(err.Error())
		return createErrorMessage("Impossible to refresh the profile :/"), err
	}

	return createErrorMessage("Refresh finished !"), nil
}

// ------------------------------------------------ //
