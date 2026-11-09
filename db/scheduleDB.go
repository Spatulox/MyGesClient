package db

import (
	. "MyGesClient/structures"
	"database/sql"
	"encoding/json"
	"fmt"
)

// ReplaceAgenda atomically replaces the schedule of the given user between
// start and end (AGENDA date format) with the one contained in agendaJSON.
// The JSON is decoded before anything is deleted, so invalid data never wipes
// local data, and a failing insert rolls back the deletion.
func ReplaceAgenda(db *sql.DB, userID int64, start string, end string, agendaJSON string) error {
	var agendas []AgendaRecieved
	if err := json.Unmarshal([]byte(agendaJSON), &agendas); err != nil {
		return fmt.Errorf("décodage JSON de l'agenda : %w", err)
	}

	return withTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec(`DELETE FROM AGENDA WHERE start_date >= ? AND end_date <= ? AND user_id = ?`,
			start, end, userID); err != nil {
			return fmt.Errorf("suppression de l'agenda : %w", err)
		}

		stmtAgenda, err := tx.Prepare(`
			INSERT OR REPLACE INTO AGENDA (agenda_id, agenda_name, type, modality, start_date, end_date, comment, room_id, discip_id, user_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête AGENDA : %w", err)
		}
		defer stmtAgenda.Close()

		stmtRoom, err := tx.Prepare(`
			INSERT OR REPLACE INTO SALLES (room_id, room_name, campus, color)
			VALUES (?, ?, ?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête SALLES : %w", err)
		}
		defer stmtRoom.Close()

		stmtTeacher, err := tx.Prepare(`
			INSERT OR REPLACE INTO PROFS (teacher_id, teacher_name)
			VALUES (?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête PROFS : %w", err)
		}
		defer stmtTeacher.Close()

		stmtDiscipline, err := tx.Prepare(`
			INSERT OR REPLACE INTO DISCIPLINES (discip_id, discip_name, teacher_id, coef, trimestre)
			VALUES (?, ?, ?, ?, ?)`)
		if err != nil {
			return fmt.Errorf("préparation de la requête DISCIPLINES : %w", err)
		}
		defer stmtDiscipline.Close()

		for _, agenda := range agendas {
			discipline := agenda.Discipline

			if _, err := stmtTeacher.Exec(discipline.TeacherID, discipline.Teacher); err != nil {
				return fmt.Errorf("insertion du professeur : %w", err)
			}

			// trimestre is NOT NULL in the schema but MyGes may send null
			trimester := ""
			if discipline.Trimester != nil {
				trimester = *discipline.Trimester
			}
			if _, err := stmtDiscipline.Exec(discipline.TeacherID, discipline.DisciplineName, discipline.TeacherID,
				discipline.Coef, trimester); err != nil {
				return fmt.Errorf("insertion de la discipline : %w", err)
			}

			for _, room := range agenda.Rooms {
				if _, err := stmtRoom.Exec(room.RoomID, room.RoomName, room.Campus, room.Color); err != nil {
					return fmt.Errorf("insertion de la salle : %w", err)
				}
			}

			var roomID any
			if len(agenda.Rooms) > 0 {
				roomID = agenda.Rooms[0].RoomID
			}

			if _, err := stmtAgenda.Exec(
				agenda.AgendaID,
				agenda.AgendaName,
				agenda.Type,
				agenda.Modality,
				agenda.StartDate.Format(),
				agenda.EndDate.Format(),
				agenda.Comment,
				roomID,
				discipline.TeacherID,
				userID,
			); err != nil {
				return fmt.Errorf("insertion du cours : %w", err)
			}
		}
		return nil
	})
}

// ------------------------------------------------ //

func GetDBUserAgenda(db *sql.DB, start string, end string) ([]LocalAgenda, error) {
	var agendas []LocalAgenda

	query := `SELECT a.agenda_name, a.type, a.modality, a.start_date, a.end_date, a.comment,
       s.room_name, s.campus, s.color, 
       d.coef, d.trimestre, p.teacher_name
FROM AGENDA a
     LEFT JOIN SALLES s ON a.room_id = s.room_id
     JOIN DISCIPLINES d ON a.discip_id = d.discip_id
     JOIN PROFS p ON d.teacher_id = p.teacher_id
WHERE start_date >= ? AND end_date <= ? 
GROUP BY a.agenda_id
ORDER BY a.start_date ASC
`

	rows, err := db.Query(query, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var agenda LocalAgenda
		var room LocalRoom
		var discipline Discipline

		if err := rows.Scan(
			&agenda.AgendaName,
			&agenda.Type,
			&agenda.Modality,
			&agenda.StartDate,
			&agenda.EndDate,
			&agenda.Comment,
			&room.RoomName,
			&room.Campus,
			&room.Color,
			&discipline.Coef,
			&discipline.Trimester,
			&discipline.Teacher.TeacherName,
		); err != nil {
			return nil, err
		}

		// Assigner la salle et la discipline à l'agenda
		agenda.Room = room
		agenda.Discipline = discipline

		// Ajouter l'agenda à la liste
		agendas = append(agendas, agenda)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return agendas, nil
}
