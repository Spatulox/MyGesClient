package backend

import (
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
		fmt.Println("Erreur lors de l'analyse de la date :", err)
		return createErrorMessage("Impossible to parse the date"), errors.New("Impossible to parse the date")
	}

	formattedDate := parsedTime.Format(outputLayout)

	return formattedDate, nil
}

// ------------------------------------------------ //

func (a *App) GetProfile() (string, error) {
	if FETCHINGPROFILE == 1 {
		return createErrorMessage("Waiting for the previous profile fetch to end"), errors.New("Waiting for the previous profile fetch to end")
	}
	FETCHINGPROFILE = 1

	api := a.api
	println(api)
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil") // Vérifiez si l'instance est valide
	}
	FETCHINGPROFILE = 0
	return api.GetProfile() // Retourne le profil via GESapi
}

func (a *App) GetYears() (string, error) {
	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	return api.GetYears()
}

func (a *App) GetAgenda(start string, end string) (string, error) {

	if FETCHINGSCHEDULE == 1 {
		return createErrorMessage("Waiting for the previous schedule fetch to end"), errors.New("Waiting for the previous schedule fetch to end")
	}
	FETCHINGSCHEDULE = 1

	start, startInt := checkDateFormat(start)
	end, endInt := checkDateFormat(end)

	if startInt != nil || endInt != nil {
		return createErrorMessage("Impossible to parse date"), errors.New("Impossible to parse date")
	}

	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	FETCHINGSCHEDULE = 0
	return api.GetAgenda(start, end)
}

func (a *App) GetGrades(year string) (string, error) {

	if FETCHINGGRADES == 1 {
		return createErrorMessage("Waiting for the previous grades fetch to end"), errors.New("Waiting for the previous grades fetch to end")
	}
	FETCHINGGRADES = 1

	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	FETCHINGGRADES = 0
	return api.GetGrades(year)
}
