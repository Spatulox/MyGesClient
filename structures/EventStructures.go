package structures

import "time"

type Event struct {
	Id          int       `json:"event_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	StartDate   time.Time `json:"start_date"`
	EndDate     time.Time `json:"end_date"`
	Color       string    `json:"color"`
}
