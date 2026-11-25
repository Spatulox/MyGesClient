package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"
)

func SaveEventDB(db *sql.DB, name string, description *string, startDate string, endDate string, color string) error {
	// Préparer la requête SQL
	query := `INSERT INTO EVENTS (event_name, event_description, start_date, end_date, color, user_id) VALUES (?, ?, ?, ?, ?, ?)`

	// Préparer le statement
	stmt, err := db.Prepare(query)
	if err != nil {
		return fmt.Errorf("erreur lors de la préparation de la requête : %v", err)
	}
	defer stmt.Close()

	// Convertir les dates en format SQL
	startDateTime, err := time.Parse("2006-01-02T15:04:05.000Z", startDate)
	if err != nil {
		return fmt.Errorf("erreur lors de la conversion de la date de début : %v", err)
	}

	endDateTime, err := time.Parse("2006-01-02T15:04:05.000Z", endDate)
	if err != nil {
		return fmt.Errorf("erreur lors de la conversion de la date de fin : %v", err)
	}

	user, err := GetUser(db)
	if err != nil {
		Log.Error("Impossible to retrieve the user for the event saving")
		return fmt.Errorf("Impossible to retrieve the user for the event saving")
	}

	// Formater les dates sans le fuseau horaire
	formattedStartDate := startDateTime.Format("2006-01-02 15:04:05")
	formattedEndDate := endDateTime.Format("2006-01-02 15:04:05")

	if !strings.HasPrefix(color, "#") {
		preset, err := GetPresetByName(db, color)
		if err != nil {
			return fmt.Errorf("erreur lors de la récupération du preset : %v", err)
		}
		_, err = stmt.Exec(name, description, formattedStartDate, formattedEndDate, preset.ID, user.ID)
		if err != nil {
			return fmt.Errorf("erreur lors de l'insertion dans la base de données : %v", err)
		}
	} else {
		_, err = stmt.Exec(name, description, formattedStartDate, formattedEndDate, color, user.ID)
		if err != nil {
			return fmt.Errorf("erreur lors de l'insertion dans la base de données : %v", err)
		}
	}
	return nil
}

func GetEventDB(db *sql.DB) ([]Event, error) {
	// Définir la requête SQL
	query := `
        SELECT event_id, event_name, event_description, start_date, end_date, color
        FROM EVENTS
        WHERE start_date BETWEEN datetime('now') AND datetime('now', '+7 days') AND user_id = ?
        ORDER BY start_date ASC
    `

	user, err := GetUser(db)
	if err != nil {
		return nil, fmt.Errorf("Impossible to retrieve the user id when getting events")
	}

	// Exécuter la requête
	rows, err := db.Query(query, user.ID)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	// Slice pour stocker les événements
	var events []Event

	// Parcourir les résultats
	for rows.Next() {
		var event Event
		var description sql.NullString
		var startDateStr, endDateStr string
		var colorStr string

		err := rows.Scan(
			&event.Id,
			&event.Name,
			&description,
			&startDateStr,
			&endDateStr,
			&colorStr,
		)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la lecture d'un événement : %v", err)
		}

		// Convertir les dates de string à time.Time
		event.StartDate, err = time.Parse("2006-01-02 15:04:05", startDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de début : %v", err)
		}
		event.EndDate, err = time.Parse("2006-01-02 15:04:05", endDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de fin : %v", err)
		}

		// Gérer la description qui peut être NULL
		if description.Valid {
			event.Description = description.String
		}

		if strings.HasPrefix(colorStr, "#") {
			event.Color = colorStr
		} else {
			// Tenter de convertir en int
			presetID, err := strconv.Atoi(colorStr)
			if err != nil {
				return nil, fmt.Errorf("la valeur color '%s' n'est ni un code couleur ni un ID valide", colorStr)
			}
			preset, err := GetPresetByID(db, presetID)
			if err != nil {
				Log.Error(fmt.Sprintf("erreur lors de la récupération du preset (id=%d) : %v", presetID, err))
				event.Color = "#FFFFFF"
			} else {
				event.Color = preset.Value
			}
		}

		events = append(events, event)
	}

	// Vérifier s'il y a eu des erreurs pendant l'itération
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("erreur lors du parcours des résultats : %v", err)
	}

	return events, nil
}

func GetAllEventDB(db *sql.DB) ([]Event, error) {
	// Définir la requête SQL
	query := `
        SELECT event_id, event_name, event_description, start_date, end_date, color
        FROM EVENTS
        WHERE start_date >= datetime('now') AND user_id = ?
        ORDER BY start_date ASC
    `

	query = `
			SELECT 
			e.event_id,
			e.event_name,
			e.event_description,
			e.start_date,
			e.end_date,
			CASE 
				WHEN e.color NOT LIKE '#%' THEN p.value
				ELSE e.color
			END AS color
		FROM EVENTS e
		LEFT JOIN PRESET p ON e.color = p.id
		WHERE e.start_date >= datetime('now') 
		AND e.user_id = ?
		ORDER BY e.start_date ASC
	`

	user, err := GetUser(db)
	if err != nil {
		return nil, fmt.Errorf("Impossible to retrieve the user id when getting events")
	}

	// Exécuter la requête
	rows, err := db.Query(query, user.ID)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	// Slice pour stocker les événements
	var events []Event

	// Parcourir les résultats
	for rows.Next() {
		var event Event
		var description sql.NullString
		var startDateStr, endDateStr string

		err := rows.Scan(
			&event.Id,
			&event.Name,
			&description,
			&startDateStr,
			&endDateStr,
			&event.Color,
		)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la lecture d'un événement : %v", err)
		}

		// Convertir les dates de string à time.Time
		event.StartDate, err = time.Parse("2006-01-02 15:04:05", startDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de début : %v", err)
		}
		event.EndDate, err = time.Parse("2006-01-02 15:04:05", endDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de fin : %v", err)
		}

		// Gérer la description qui peut être NULL
		if description.Valid {
			event.Description = description.String
		}

		events = append(events, event)
	}

	// Vérifier s'il y a eu des erreurs pendant l'itération
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("erreur lors du parcours des résultats : %v", err)
	}

	return events, nil
}

func DeleteEvent(db *sql.DB, event_id int) (bool, error) {
	query := `DELETE FROM EVENTS WHERE event_id = ?`

	// Exécuter la requête
	rows, err := db.Query(query, event_id)
	if err != nil {
		return false, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	return true, nil
}

func GetEventByNameDB(db *sql.DB, eventName string) ([]Event, error) {
	query := `
        SELECT event_id, event_name, event_description, start_date, end_date, color
		FROM EVENTS
		WHERE start_date >= datetime('now')
		  AND user_id = ?
		  AND event_name LIKE '%' || ? || '%'
		ORDER BY start_date ASC
    `

	user, err := GetUser(db)
	if err != nil {
		return nil, fmt.Errorf("Impossible to retrieve the user id when getting events")
	}

	// Exécuter la requête
	rows, err := db.Query(query, user.ID, eventName)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	events, err := parseEvents(rows)
	if err != nil {
		return nil, err
	}

	return events, nil
}

func parseEvents(rows *sql.Rows) ([]Event, error) {

	// Slice pour stocker les événements
	var events []Event
	var err error

	// Parcourir les résultats
	for rows.Next() {
		var event Event
		var description sql.NullString
		var startDateStr, endDateStr string

		err := rows.Scan(
			&event.Id,
			&event.Name,
			&description,
			&startDateStr,
			&endDateStr,
			&event.Color,
		)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la lecture d'un événement : %v", err)
		}

		// Convertir les dates de string à time.Time
		event.StartDate, err = time.Parse("2006-01-02 15:04:05", startDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de début : %v", err)
		}
		event.EndDate, err = time.Parse("2006-01-02 15:04:05", endDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de fin : %v", err)
		}

		// Gérer la description qui peut être NULL
		if description.Valid {
			event.Description = description.String
		}

		events = append(events, event)
	}

	// Vérifier s'il y a eu des erreurs pendant l'itération
	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("erreur lors du parcours des résultats : %v", err)
	}

	return events, nil

}

func GetEventPresets(db *sql.DB) ([]Preset, error) {
	query := `
        SELECT id, name, value, type
		FROM PRESET
		WHERE user_id = ?
		AND type = "event"
    `

	user, err := GetUser(db)
	if err != nil {
		return nil, fmt.Errorf("Impossible to retrieve the user id when getting events")
	}

	// Exécuter la requête
	rows, err := db.Query(query, user.ID)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'exécution de la requête : %v", err)
	}
	defer rows.Close()

	var presets []Preset
	for rows.Next() {
		var p Preset
		if err := rows.Scan(&p.ID, &p.Name, &p.Value, &p.Type); err != nil {
			return nil, fmt.Errorf("erreur lors du scan d'un preset : %v", err)
		}
		presets = append(presets, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erreur lors de l'itération des résultats des presets : %v", err)
	}

	return presets, nil
}

// ------------------------------------------------ //

// reminderGrace is how late a reminder can still be sent after the
// reminder time, so that an event is not missed between two checks.
const reminderGrace = "-2 minutes"

// EventReminder is an event whose reminder is due.
type EventReminder struct {
	Id          int
	Name        string
	Description string
	StartDate   time.Time // UTC
}

// GetEventsToRemindDB returns the events of the selected user whose reminder
// is due and has not been sent yet: they start within the reminder delay of
// the user (USER.reminder_minutes). Nothing is returned when the user turned
// the reminders off.
func GetEventsToRemindDB(db *sql.DB) ([]EventReminder, error) {
	// start_date is stored as UTC "YYYY-MM-DD HH:MM:SS", like datetime('now'),
	// so the dates can be compared as strings.
	query := `
		SELECT e.event_id, e.event_name, e.event_description, e.start_date
		FROM EVENTS e
		JOIN USER u ON u.user_id = e.user_id
		WHERE u.selected = true
		  AND u.reminder_minutes >= 0
		  AND e.reminded = false
		  AND e.start_date > datetime('now', ?)
		  AND e.start_date <= datetime('now', '+' || u.reminder_minutes || ' minutes')
		ORDER BY e.start_date ASC
	`
	rows, err := db.Query(query, reminderGrace)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la récupération des rappels : %w", err)
	}
	defer rows.Close()

	var reminders []EventReminder
	for rows.Next() {
		var r EventReminder
		var description sql.NullString
		var startDateStr string
		if err := rows.Scan(&r.Id, &r.Name, &description, &startDateStr); err != nil {
			return nil, fmt.Errorf("erreur lors de la lecture d'un rappel : %w", err)
		}
		r.StartDate, err = time.Parse("2006-01-02 15:04:05", startDateStr)
		if err != nil {
			return nil, fmt.Errorf("erreur lors de la conversion de la date de début : %w", err)
		}
		r.Description = description.String
		reminders = append(reminders, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("erreur lors du parcours des rappels : %w", err)
	}
	return reminders, nil
}

// ClaimEventReminderDB marks the reminder of an event as sent. It returns
// false when it was already marked: the GUI and the background service both
// check the reminders, only the one that claims it sends the notification.
func ClaimEventReminderDB(db *sql.DB, eventId int) (bool, error) {
	result, err := db.Exec(`UPDATE EVENTS SET reminded = true WHERE event_id = ? AND reminded = false`, eventId)
	if err != nil {
		return false, fmt.Errorf("erreur lors de la mise à jour du rappel : %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}
	return n == 1, nil
}
