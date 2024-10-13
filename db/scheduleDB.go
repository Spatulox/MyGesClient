package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"encoding/json"
)

func SaveAgendaToDB(agenda string, db *sql.DB) {
	// Lire et parser le JSON
	var agendas []AgendaRecieved
	err := json.Unmarshal([]byte(agenda), &agendas)
	if err != nil {
		Log.Error(err.Error())
	}

	// Commencer une transaction
	tx, err := db.Begin()
	if err != nil {
		Log.Error(err.Error())
	}

	// Préparer les déclarations SQL
	stmtAgenda, err := tx.Prepare(`
		INSERT OR REPLACE INTO AGENDA (agenda_id, agenda_name, type, modality, start_date, end_date, comment, room_id, discip_id, user_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
	}
	defer stmtAgenda.Close()

	stmtRoom, err := tx.Prepare(`
		INSERT OR REPLACE INTO SALLES (room_id, room_name, campus, color)
		VALUES (?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
	}
	defer stmtRoom.Close()

	stmtTeacher, err := tx.Prepare(`
		INSERT OR REPLACE INTO PROFS (teacher_id, teacher_name)
		VALUES (?, ?)
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
	}
	defer stmtTeacher.Close()

	stmtDiscipline, err := tx.Prepare(`
		INSERT OR REPLACE INTO DISCIPLINES (discip_id, discip_name, teacher_id, coef, trimestre)
		VALUES (?, ?, ?, ?, ?)
	`)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
	}
	defer stmtDiscipline.Close()

	// Récupérer l'utilisateur
	userID, err := GetUser(db)
	if err != nil {
		tx.Rollback()
		Log.Error(err.Error())
	}

	// Insérer les données
	for _, agenda := range agendas {

		// Insert TEACHER
		_, err = stmtTeacher.Exec(
			agenda.Discipline.TeacherID,
			agenda.Discipline.Teacher,
		)
		if err != nil {
			tx.Rollback()
			Log.Error("TEACHER : " + err.Error())
		}

		// Insérer la discipline
		_, err = stmtDiscipline.Exec(
			agenda.Discipline.TeacherID,
			agenda.Discipline.DisciplineName,
			agenda.Discipline.TeacherID,
			agenda.Discipline.Coef,
			agenda.Discipline.Trimester,
		)

		_, err = stmtDiscipline.Exec(
			agenda.Discipline.TeacherID,
			agenda.Discipline.DisciplineName,
			agenda.Discipline.TeacherID,
			// Vérifiez si Coef est nil avant de l'utiliser
			func() *float32 {
				if agenda.Discipline.Coef != nil {
					return agenda.Discipline.Coef // Retourne le pointeur si non nil
				}
				return nil // Retourne nil si Coef est nil
			}(),
			func() *string {
				if agenda.Discipline.Trimester != nil {
					return agenda.Discipline.Trimester // Retourne le pointeur si non nil
				}
				return nil // Retourne nil si Coef est nil
			}(),
		)
		if err != nil {
			tx.Rollback()
			Log.Error("DISCIPLINE : " + err.Error())
		}

		// Insérer chaque salle associée à l'agenda
		for _, room := range agenda.Rooms {
			_, err = stmtRoom.Exec(
				room.RoomID,
				room.RoomName,
				room.Campus,
				room.Color,
			)
			if err != nil {
				tx.Rollback()
				Log.Error("ROOMS : " + err.Error())
			}
		}

		var roomID interface{}
		// Vérifier si des salles sont disponibles
		if len(agenda.Rooms) > 0 {
			roomID = agenda.Rooms[0].RoomID
		} else {
			roomID = nil // Ou une autre valeur par défaut, comme sql.NullInt64{}
		}

		// Insérer l'agenda
		_, err = stmtAgenda.Exec(
			agenda.AgendaID,
			agenda.AgendaName,
			agenda.Type,
			agenda.Modality,
			agenda.StartDate.Format(),
			agenda.EndDate.Format(),
			agenda.Comment,
			roomID, // Utiliser la première salle pour l'exemple
			agenda.Discipline.TeacherID,
			userID.ID,
		)
		if err != nil {
			tx.Rollback()
			Log.Error("AGENDA : " + err.Error())
		}
	}

	// Valider la transaction
	err = tx.Commit()
	if err != nil {
		Log.Error(err.Error())
	}

	if len(agendas) > 0 {
		Log.Infos("Données insérées avec succès")
	}
}

// ------------------------------------------------ //

func GetDBUserAgenda(db *sql.DB, start string, end string) ([]LocalAgenda, error) {
	var agendas []LocalAgenda

	/*query := `
			SELECT a.agenda_name, a.type, a.modality, a.start_date, a.end_date, a.comment,
	       		 s.room_name, s.campus, s.color, d.coef, d.trimestre, p.teacher_name
			FROM AGENDA a
				 LEFT JOIN SALLES s ON a.room_id = s.room_id OR a.room_id IS NULL
				 JOIN DISCIPLINES d ON a.discip_id = d.discip_id
				 JOIN PROFS p ON d.teacher_id = p.teacher_id
			WHERE start_date >= ? AND end_date <= ? ORDER BY a.start_date ASC
		`*/

	/*query := `SELECT a.agenda_name, a.type, a.modality, a.start_date, a.end_date, a.comment,
	       MAX(s.room_name) as room_name, MAX(s.campus) as campus, MAX(s.color) as color,
	       d.coef, d.trimestre, p.teacher_name
	FROM AGENDA a
	     LEFT JOIN SALLES s ON a.room_id = s.room_id OR a.room_id IS NULL
	     JOIN DISCIPLINES d ON a.discip_id = d.discip_id
	     JOIN PROFS p ON d.teacher_id = p.teacher_id
	WHERE start_date >= ? AND end_date <= ?
	GROUP BY a.agenda_id, d.discip_id, p.teacher_id
	ORDER BY a.start_date ASC
				`*/

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
