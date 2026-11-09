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

type absencesResponse struct {
	Items []Absences `json:"items"`
}

// ReplaceAbsences atomically replaces the absences of the given user and year
// with the ones contained in absJSON (MyGes "absences" response). The JSON is
// decoded before anything is deleted, so invalid data never wipes local data.
func ReplaceAbsences(db *sql.DB, userID int64, year string, absJSON string) error {
	var response absencesResponse
	if err := json.Unmarshal([]byte(absJSON), &response); err != nil {
		return fmt.Errorf("décodage JSON des absences : %w", err)
	}

	return withTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`DELETE FROM ABSENCES WHERE abs_year = ? AND user_id = ?`, year, userID); err != nil {
			return fmt.Errorf("suppression des ABSENCES : %w", err)
		}

		stmt, err := tx.Prepare(`
			INSERT INTO ABSENCES (abs_cours, abs_date, abs_justified, abs_trimester, abs_trimester_name, abs_type, abs_year, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête ABSENCES : %w", err)
		}
		defer stmt.Close()

		for _, a := range response.Items {
			if _, err := stmt.Exec(a.CourseName, a.Date, a.Justified, a.Trimester, a.TrimesterName, a.Type, a.Year, userID); err != nil {
				return fmt.Errorf("insertion dans ABSENCES : %w", err)
			}
		}
		Log.Infos("Absences saved to DB successfully")
		return nil
	})
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
