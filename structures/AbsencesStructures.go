package structures

type Absences struct {
	CourseName    string   `json:"course_name"`
	Date          float64  `json:"date"`
	Justified     bool     `json:"justified"`
	Links         []string `json:"links"`
	Trimester     int      `json:"trimester"`
	TrimesterName string   `json:"trimester_name"`
	Type          string   `json:"type"`
	Year          int      `json:"year"`
}
