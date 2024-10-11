package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"fmt"
)

func (a *App) SaveEvents(name string, description *string, startDate string, endDate string, color string) error {
	Log.Infos("Saving Events")
	err := SaveEventDB(a.db, name, description, startDate, endDate, color)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when saving events : %v", err))
		return err
	}

	return nil
}

// Only get the events for the 7 next following dates
func (a *App) GetEvents() ([]Event, error) {
	Log.Infos("Get events")
	return GetEventDB(a.db)
}
