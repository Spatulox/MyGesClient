package db

import (
	"database/sql"
	"fmt"
)

// GetDBUserYears returns the school years that have grades or absences in the
// local cache for the given user, most recent first ("2025" = 2025-2026).
// Used offline, when MyGes cannot list the years.
func GetDBUserYears(db *sql.DB, userID int64) ([]string, error) {
	rows, err := db.Query(`
		SELECT CAST(year AS TEXT) AS y FROM NOTES WHERE user_id = ?
		UNION
		SELECT CAST(abs_year AS TEXT) FROM ABSENCES WHERE user_id = ?
		ORDER BY y DESC`, userID, userID)
	if err != nil {
		return nil, fmt.Errorf("requête des années locales : %w", err)
	}
	defer rows.Close()

	years := []string{}
	for rows.Next() {
		var year string
		if err := rows.Scan(&year); err != nil {
			return nil, fmt.Errorf("lecture d'une année locale : %w", err)
		}
		years = append(years, year)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lecture des années locales : %w", err)
	}
	return years, nil
}
