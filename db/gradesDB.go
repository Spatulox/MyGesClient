package db

import "database/sql"
import . "MyGesClient/structures"

func SaveGradesToDB(grades string, db *sql.DB) {

}

func GetDBUserGrades(year string, db *sql.DB) ([]Grades, error) {
	return nil, nil
}
