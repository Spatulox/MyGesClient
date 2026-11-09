package db

import (
	"database/sql"
	"encoding/json"
	"fmt"

	. "MyGesClient/structures"

	. "MyGesClient/log"
)

type gradesResponse struct {
	Result []Grades `json:"items"`
}

// ReplaceGrades atomically replaces the grades of the given user and year with
// the ones contained in gradesJSON (MyGes "grades" response). The JSON is
// decoded before anything is deleted, so invalid data never wipes local data.
func ReplaceGrades(db *sql.DB, userID int64, year string, gradesJSON string) error {
	var response gradesResponse
	if err := json.Unmarshal([]byte(gradesJSON), &response); err != nil {
		return fmt.Errorf("décodage JSON des notes : %w", err)
	}

	return withTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`
			DELETE FROM GRADESVALUE
			WHERE note_id IN (SELECT note_id FROM NOTES WHERE year = ? AND user_id = ?)`, year, userID); err != nil {
			return fmt.Errorf("suppression des GRADESVALUE : %w", err)
		}
		if _, err := tx.Exec(`DELETE FROM NOTES WHERE year = ? AND user_id = ?`, year, userID); err != nil {
			return fmt.Errorf("suppression des NOTES : %w", err)
		}

		stmtNotes, err := tx.Prepare(`
			INSERT INTO NOTES (bonus, coef, course_name, ects, exam, trimestre, year, teacher_name, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête NOTES : %w", err)
		}
		defer stmtNotes.Close()

		stmtGrades, err := tx.Prepare(`INSERT INTO GRADESVALUE (note_id, grade_value) VALUES (?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête GRADESVALUE : %w", err)
		}
		defer stmtGrades.Close()

		for _, item := range response.Result {
			teacherName := fmt.Sprintf("%s %s", item.TeacherLastName, item.TeacherFirstName)
			res, err := stmtNotes.Exec(item.Bonus, item.Coef, item.CourseName, item.ECTS, item.Exam,
				item.Trimester, item.Year, teacherName, userID)
			if err != nil {
				return fmt.Errorf("insertion dans NOTES : %w", err)
			}
			noteID, err := res.LastInsertId()
			if err != nil {
				return fmt.Errorf("récupération de l'ID de la note : %w", err)
			}
			for _, grade := range item.Grades {
				if _, err := stmtGrades.Exec(noteID, grade); err != nil {
					return fmt.Errorf("insertion dans GRADESVALUE : %w", err)
				}
			}
		}
		Log.Infos("INFO : Grades saved into local DB")
		return nil
	})
}

// GetDBUserGrades returns the grades of the given user for the given year.
func GetDBUserGrades(db *sql.DB, userID int64, year string) ([]LocalGrades, error) {
	Log.Infos("INFO : Fetching local DB for grades")

	rows, err := db.Query(`
		SELECT n.note_id, n.bonus, n.coef, n.course_name, n.ects, n.exam, n.trimestre, n.year,
		       n.teacher_name, g.grade_value
		FROM NOTES n
		LEFT JOIN GRADESVALUE g ON g.note_id = n.note_id
		WHERE n.year = ? AND n.user_id = ?
		ORDER BY n.trimestre, n.course_name, n.note_id, g.rowid`, year, userID)
	if err != nil {
		return nil, fmt.Errorf("requête des notes : %w", err)
	}
	defer rows.Close()

	var grades []LocalGrades
	lastNoteID := -1
	for rows.Next() {
		var g LocalGrades
		var noteID int
		var examNull sql.NullFloat64
		var gradeValue sql.NullFloat64

		if err := rows.Scan(&noteID, &g.Bonus, &g.Coef, &g.CourseName, &g.ECTS, &examNull,
			&g.Trimester, &g.Year, &g.TeacherName, &gradeValue); err != nil {
			return nil, fmt.Errorf("lecture d'une ligne de notes : %w", err)
		}

		if noteID != lastNoteID {
			if examNull.Valid {
				exam := examNull.Float64
				g.Exam = &exam
			}
			grades = append(grades, g)
			lastNoteID = noteID
		}
		if gradeValue.Valid {
			last := &grades[len(grades)-1]
			last.Grades = append(last.Grades, gradeValue.Float64)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("lecture des notes : %w", err)
	}

	Log.Infos("INFO : Local Fetched Grades")
	return grades, nil
}
