package backend

import (
	. "MyGesClient/log"
	"fmt"
	"sync"
	"time"
)

func createMessage(message string) string {
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
	var wg sync.WaitGroup
	errChan := make(chan error, 3)

	wg.Add(3)

	// Fonction helper pour gérer les erreurs
	handleError := func(operation string, err error) {
		if err != nil {
			Log.Error(fmt.Sprintf("Impossible to refresh %s", operation))
			Log.Error(err.Error())
			errChan <- fmt.Errorf("%s: %w", operation, err)
		}
	}

	// Rafraîchir l'agenda
	go func() {
		defer wg.Done()
		_, err := a.RefreshAgenda(&start, &end)
		handleError("schedule", err)
		//Log.Debug("RefreshSchedule ok")
	}()

	// Rafraîchir les notes
	go func() {
		defer wg.Done()
		_, err := a.RefreshGrades()
		handleError("grades", err)
		//Log.Debug("RefreshGrades ok")
	}()

	// Rafraîchir les absences
	go func() {
		defer wg.Done()
		_, err := a.RefreshAbsences()
		handleError("absences", err)
		//Log.Debug("RefreshAbsences ok")
	}()

	// Attendre que toutes les goroutines terminent
	//Log.Debug("coucou21")
	wg.Wait()
	close(errChan)

	// Collecter toutes les erreurs
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}
	//Log.Debug("coucou")
	if len(errors) > 0 {
		return createMessage("Refresh partially completed with errors"), fmt.Errorf("multiple errors occurred: %v", errors)
	}
	//Log.Debug("coucou12Z")
	return createMessage("Refresh finished successfully!"), nil
}

// ------------------------------------------------ //
