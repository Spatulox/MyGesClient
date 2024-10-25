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
	Log.Infos("Get events (7+)")
	return GetEventDB(a.db)
}

func (a *App) GetEventsLike(eventName string) ([]Event, error) {
	Log.Infos("Get events by name")
	return GetEventByNameDB(a.db, eventName)
}

func (a *App) GetAllEvents() ([]Event, error) {
	Log.Infos("Get all events")
	return GetAllEventDB(a.db)
}

func (a *App) DeleteEvent(eventId int) bool {
	_, err := DeleteEvent(a.db, eventId)
	if err != nil {
		Log.Error(fmt.Sprintf("%v", err))
		return false
	}
	return true
}
