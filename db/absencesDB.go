package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	. "MyGesClient/structures"

	. "MyGesClient/log"
)

func SaveAbsencesToDB(abs string, db *sql.DB) bool {
	Log.Infos("Saving Absences to DB")

	// Decode the JSON string into a map
	var data map[string]interface{}
	err := json.Unmarshal([]byte(abs), &data)
	if err != nil {
		Log.Error("Error decoding JSON:", err)
		return false
	}

	// Check if "result" exists and is a slice
	result, ok := data["items"].([]interface{})
	if !ok {
		Log.Error("Invalid or missing 'result' in JSON data")
		return false
	}

	// Convert the data to []Absences
	var absences []Absences
	for _, item := range result {
		absence, err := mapToAbsences(item.(map[string]interface{}))
		if err != nil {
			Log.Error("Error mapping item to Absences:", err)
			continue
		}
		absences = append(absences, absence)
	}

	// Here, you would typically insert the absences into your database
	// This is a placeholder for the actual database insertion logic
	user, err := GetUser(db)
	if err != nil {
		Log.Error("Impossible to select the user before saving absences")
		return false
	}

	for _, absence := range absences {
		err := insertAbsenceIntoDB(db, absence, user.ID)
		if err != nil {
			Log.Error("Error inserting absence into DB:", err)
			// Decide whether to continue or return based on your error handling strategy
		}
	}

	Log.Infos("Absences saved to DB successfully")
	return true

}

func GetDBUserAbsences(year string, db *sql.DB) ([]LocalAbsences, error) {
	Log.Infos("INFO : Fetching local DB for Absences")
	Log.Infos("INFO : Fetched Absences")

	query := `
        SELECT DISTINCT abs_cours, abs_date, abs_justified, abs_trimester_name, abs_year
        FROM ABSENCES
        WHERE abs_year = ? AND user_id = ?
        ORDER BY abs_date ASC
    `

	user, err := GetUser(db)
	if err != nil {
		return nil, fmt.Errorf("Impossible to retrieve the user id when getting events")
	}

	// Exécuter la requête
	rows, err := db.Query(query, year, user.ID)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	var absences []LocalAbsences
	for rows.Next() {
		var abs LocalAbsences
		var timestamp string
		err := rows.Scan(&abs.CourseName, &timestamp, &abs.Justified, &abs.TrimesterName, &abs.Year)
		if err != nil {
			return nil, fmt.Errorf("error scanning row: %v", err)
		}

		// Convertir le timestamp string en float64
		timestampFloat, err := strconv.ParseFloat(timestamp, 64)
		if err != nil {
			return nil, fmt.Errorf("error parsing timestamp: %v", err)
		}

		// Convertir en nanosecondes et créer un time.Time
		t := time.Unix(0, int64(timestampFloat*1e6))

		// Formater la date comme vous le souhaitez
		abs.Date = t.Format("2006-01-02 15:04:05")

		absences = append(absences, abs)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %v", err)
	}

	return absences, nil
}

func mapToAbsences(m map[string]interface{}) (Absences, error) {
	// Assuming Absences is your struct type
	return Absences{
		CourseName:    m["course_name"].(string),
		Date:          m["date"].(float64),
		Justified:     m["justified"].(bool),
		Links:         []string{}, // Assuming it's always an empty slice
		Trimester:     int(m["trimester"].(float64)),
		TrimesterName: m["trimester_name"].(string),
		Type:          m["type"].(string),
		Year:          int(m["year"].(float64)),
	}, nil
}

func insertAbsenceIntoDB(db *sql.DB, absence Absences, userId int64) error {
	// This is a placeholder for the actual insertion logic
	// You would typically use db.Exec or db.Query here to insert the data
	// For example:

	_, err := db.Exec("INSERT INTO ABSENCES (abs_cours, abs_date, abs_justified, abs_trimester, abs_trimester_name, abs_type, abs_year, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		absence.CourseName, absence.Date, absence.Justified, absence.Trimester, absence.TrimesterName, absence.Type, absence.Year, userId)
	return err
}
