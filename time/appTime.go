package appTime

import (
	"time"
)

func GetCurrentYear() int {
	return time.Now().Year()
}

func GetWeekDates() (time.Time, time.Time) {
	now := time.Now()
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

	// Calcul du samedi de la semaine en cours
	saturday := monday.AddDate(0, 0, 5)

	return monday, saturday
}
