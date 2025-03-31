package appTime

import (
	. "MyGesClient/log"
	"fmt"
	"time"
)

func GetCurrentYear() int {
	return time.Now().Year()
}

func GetTodayDate() time.Time {
	now := time.Now()
	now.Format("2006-01-02T15:04:05.000Z")
	return now
}

func GetWeekDates() (time.Time, time.Time) {
	now := time.Now().UTC()
	weekday := now.Weekday()

	// Si c'est dimanche, on prend la semaine suivante
	if weekday == time.Sunday {
		now = now.AddDate(0, 0, 1)
		weekday = time.Monday
	}

	// Calcul du lundi de la semaine en cours
	daysUntilMonday := int(time.Monday - weekday)
	if daysUntilMonday > 0 {
		daysUntilMonday -= 7
	}
	monday := now.AddDate(0, 0, daysUntilMonday)

	// Monday at 00:00
	monday = time.Date(monday.Year(), monday.Month(), monday.Day(), 0, 0, 0, 0, time.UTC)

	// Calcul du dimanche de la semaine en cours
	sunday := monday.AddDate(0, 0, 6)
	// sunday at 5 am
	sunday = time.Date(sunday.Year(), sunday.Month(), sunday.Day(), 5, 0, 0, 0, time.UTC)

	Log.Debug(fmt.Sprintf("%v : %v", monday, sunday))

	return monday, sunday
}
