package backend

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
)

func (a *App) SaveEvents(name string, description *string, startDate string, endDate string, color string) {
	Log.Infos("Saving Events")
	SaveEventDB()
}

func (a *App) GetEvents(currDate string) {
	Log.Infos("Get events")
	GetEventDB()
}
