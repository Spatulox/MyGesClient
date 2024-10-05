package backend

import (
	"errors"
	"fmt"
	"time"
)

func createErrorMessage(message string) string {
	return fmt.Sprintf("{'message':'%s'}", message)
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
	api := a.api
	println(api)
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil") // Vérifiez si l'instance est valide
	}
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

	start, startInt := checkDateFormat(start)
	end, endInt := checkDateFormat(end)

	if startInt != nil || endInt != nil {
		return createErrorMessage("Impossible to parse date"), errors.New("Impossible to parse date")
	}

	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	return api.GetAgenda(start, end)
}

func (a *App) GetGrades(year string) (string, error) {
	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	return api.GetGrades(year)
}
