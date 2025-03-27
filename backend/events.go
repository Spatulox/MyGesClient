package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"fmt"
)

func (a *App) SaveEvents(name string, description *string, startDate string, endDate string, color string) error {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
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
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	return GetEventDB(a.db)
}

func (a *App) GetEventsLike(eventName string) ([]Event, error) {
	Log.Infos("Get events by name")
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	return GetEventByNameDB(a.db, eventName)
}

func (a *App) GetAllEvents() ([]Event, error) {
	Log.Infos("Get all events")
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	return GetAllEventDB(a.db)
}

func (a *App) DeleteEvent(eventId int) bool {
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	_, err := DeleteEvent(a.db, eventId)
	if err != nil {
		Log.Error(fmt.Sprintf("%v", err))
		return false
	}
	return true
}
