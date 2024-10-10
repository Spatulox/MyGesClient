package db

import "database/sql"
import . "MyGesClient/structures"
import . "MyGesClient/log"

func SaveAbsencesToDB(grades string, db *sql.DB) {
	Log.Infos("Saving Absences to DB")
}

func GetDBUserAbsences(year string, db *sql.DB) ([]Absences, error) {
	Log.Infos("INFO : Fetching local DB for Absences")
	Log.Infos("INFO : Fetched Absences")
	return nil, nil
}
