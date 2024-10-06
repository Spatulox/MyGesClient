package backend

import (
	. "MyGesClient/log"
	"errors"
	"fmt"
	"time"
)

var FETCHINGSCHEDULE = 0
var FETCHINGGRADES = 0
var FETCHINGPROFILE = 0

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
func (a *App) GlobalRefresh(year string, start string, end string) (string, error) {
	_, err := a.RefreshAgenda(&start, &end)
	if err != nil {
		return createErrorMessage("Impossible to refresh the schedule :/"), err
	}
	_, err = a.RefreshGrades(year)
	if err != nil {
		return createErrorMessage("Impossible to refresh grade :/"), err
	}
	_, err = a.RefreshProfile()
	if err != nil {
		return createErrorMessage("Impossible to refresh the profile :/"), err
	}

	return createErrorMessage("Refresh finished !"), nil
}

// ------------------------------------------------ //

/*
 * Refresh the Profile by asking the MyGes DB, and store it inside the LocalDB and send back the fresh datas
 */
func (a *App) RefreshProfile() (string, error) {
	if FETCHINGPROFILE == 1 {
		return createErrorMessage("Waiting for the previous profile fetch to end"), errors.New("Waiting for the previous profile fetch to end")
	}
	FETCHINGPROFILE = 1
	defer func() { FETCHINGPROFILE = 0 }()
	Log.Infos("Refreshing Profile")

	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil for RefreshProfile")
	}

	return api.GetProfile() // Retourne le profil via GESapi
}

// ------------------------------------------------ //
