package db

import "database/sql"
import . "MyGesClient/structures"
import . "MyGesClient/log"

func SaveGradesToDB(grades string, db *sql.DB) {
	Log.Infos("INFO : Saving grades into local DB")
	print(grades)
	Log.Infos("INFO : Grades saved into local DB")
}

func GetDBUserGrades(year string, db *sql.DB) ([]Grades, error) {
	Log.Infos("INFO : Fetching local DB for grades")
	Log.Infos("INFO : Fetched Grades")
	return nil, nil
}
