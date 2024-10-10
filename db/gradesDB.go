package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
)
import . "MyGesClient/structures"
import . "MyGesClient/log"

type gradesResponse struct {
	Result []Grades `json:"items"`
}

func SaveGradesToDB(grades string, db *sql.DB) {
	Log.Infos("INFO : Saving grades into local DB")
	fmt.Println(grades)

	var gradesResponseVar gradesResponse
	err := json.Unmarshal([]byte(grades), &gradesResponseVar)
	if err != nil {
		fmt.Println("Erreur lors du décodage JSON:", err)
		return
	}

	// Commencer une transaction
	tx, err := db.Begin()
	if err != nil {
		Log.Error("Erreur lors du début de la transaction:", err)
		return
	}
	defer tx.Rollback() // En cas d'erreur, annuler la transaction

	// Préparer les requêtes
	stmtNotes, err := tx.Prepare(`
        INSERT OR REPLACE INTO NOTES (bonus, coef, course_name, ects, exam, trimestre, year, teacher_name, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
	if err != nil {
		Log.Error("Erreur lors de la préparation de la requête NOTES:", err)
		return
	}
	defer stmtNotes.Close()

	user, _ := GetUser(db)

	stmtGrades, err := tx.Prepare(`
        INSERT OR REPLACE INTO GRADESVALUE (note_id, grade_value)
        VALUES (?, ?)
    `)
	if err != nil {
		Log.Error("Erreur lors de la préparation de la requête GRADESVALUE:", err)
		return
	}
	defer stmtGrades.Close()

	fmt.Printf("%d", len(gradesResponseVar.Result))

	for _, item := range gradesResponseVar.Result {

		teacherName := fmt.Sprintf("%s %s", item.TeacherLastName,
			item.TeacherFirstName)

		// Insérer dans NOTES
		res, err := stmtNotes.Exec(
			item.Bonus,
			item.Coef,
			item.CourseName,
			item.ECTS,
			item.Exam,
			item.Trimester,
			item.Year,
			teacherName,
			user.ID,
		)
		if err != nil {
			Log.Error("Erreur lors de l'insertion dans NOTES:", err)
			return
		}

		// Récupérer l'ID de la note insérée
		noteID, err := res.LastInsertId()
		if err != nil {
			Log.Error("Erreur lors de la récupération de l'ID de la note:", err)
			return
		}

		// Insérer les notes individuelles dans GRADESVALUE
		for _, grade := range item.Grades {
			_, err := stmtGrades.Exec(noteID, grade)
			if err != nil {
				Log.Error("Erreur lors de l'insertion dans GRADESVALUE:", err)
				return
			}
		}
	}

	// Valider la transaction
	err = tx.Commit()
	if err != nil {
		Log.Error("Erreur lors de la validation de la transaction:", err)
		return
	}

	Log.Infos("INFO : Grades saved into local DB")
}

func GetDBUserGrades(year string, db *sql.DB) ([]LocalGrades, error) {
	Log.Infos("INFO : Fetching local DB for grades")

	query := `
        SELECT n.note_id, n.bonus, n.coef, n.course_name, n.ects, n.exam, n.trimestre, n.year,
               n.teacher_name
        FROM NOTES n
        WHERE n.year = ?
        ORDER BY n.trimestre, n.course_name
    `

	rows, err := db.Query(query, year)
	if err != nil {
		Log.Error("Erreur lors de la requête des notes:", err)
		return nil, err
	}
	defer rows.Close()

	var grades []LocalGrades

	for rows.Next() {
		var g LocalGrades
		var noteID int
		var examNull sql.NullFloat64

		err := rows.Scan(
			&noteID,
			&g.Bonus,
			&g.Coef,
			&g.CourseName,
			&g.ECTS,
			&examNull,
			&g.Trimester,
			&g.Year,
			&g.TeacherName,
		)
		if err != nil {
			Log.Error("Erreur lors de la lecture d'une ligne de notes:", err)
			return nil, err
		}

		if examNull.Valid {
			g.Exam = &examNull.Float64
		}

		// Récupérer les notes individuelles pour ce cours
		gradesQuery := `
            SELECT grade_value
            FROM GRADESVALUE
            WHERE note_id = ?
        `
		gradeRows, err := db.Query(gradesQuery, noteID)
		if err != nil {
			Log.Error("Erreur lors de la requête des notes individuelles:", err)
			return nil, err
		}
		defer gradeRows.Close()

		for gradeRows.Next() {
			var gradeValue float64
			if err := gradeRows.Scan(&gradeValue); err != nil {
				Log.Error("Erreur lors de la lecture d'une note individuelle:", err)
				return nil, err
			}
			g.Grades = append(g.Grades, gradeValue)
		}

		grades = append(grades, g)
	}

	if err = rows.Err(); err != nil {
		Log.Error("Erreur après la lecture des lignes:", err)
		return nil, err
	}

	Log.Infos("INFO : Fetched Grades")
	return grades, nil
}
