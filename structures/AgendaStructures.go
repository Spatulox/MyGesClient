package structures

import "time"

type JSONTime float64

/*type Room struct {
	RoomID   int    `json:"room_id"`
	RoomName string `json:"name"`
	Campus   string `json:"campus"`
	Color    string `json:"color,omitempty"`
}

type Teacher struct {
	TeacherID   int    `json:"teacher_id"`
	TeacherName string `json:"teacher"`
}

type Discipline struct {
	DisciplineID   string `json:"discip_id"`
	DisciplineName string `json:"discip_name"`
	Teacher        Teacher
	Coef           float32 `json:"coef"`
	Trimester      int     `json:"trimester"`
}*/

// Structure to parse the Myges result

type Room struct {
	RoomID   int    `json:"room_id"`
	RoomName string `json:"name"`
	Campus   string `json:"campus"`
	Color    string `json:"color,omitempty"`
}

type Teacher struct {
	TeacherID   int    `json:"teacher_id"`
	TeacherName string `json:"teacher"`
}

// Online MyGes DB

type DisciplineRecieved struct {
	DisciplineName string   `json:"name"`
	Teacher        string   `json:"teacher"`
	TeacherID      int      `json:"teacher_id"`
	Coef           *float32 `json:"coef"`
	Ects           *float32 `json:"ects"`
	Trimester      *string  `json:"trimester"`
}

type AgendaRecieved struct {
	AgendaID   int                `json:"reservation_id"`
	AgendaName string             `json:"name"`
	Type       string             `json:"type"`
	Modality   string             `json:"modality"`
	StartDate  JSONTime           `json:"start_date"`
	EndDate    JSONTime           `json:"end_date"`
	Comment    string             `json:"comment"`
	Rooms      []Room             `json:"rooms"`
	Discipline DisciplineRecieved `json:"discipline"`
	Teacher    string             `json:"teacher"`
}

// Local DB Structure

type LocalAgenda struct {
	AgendaID   int        `json:"agenda_id"`
	AgendaName string     `json:"agenda_name"`
	Type       string     `json:"type"`
	Modality   string     `json:"modality"`
	StartDate  string     `json:"start_date"`
	EndDate    string     `json:"end_date"`
	Comment    string     `json:"comment"`
	Room       LocalRoom  `json:"room"`
	Discipline Discipline `json:"discipline"`
}

type LocalRoom struct {
	RoomID   int    `json:"room_id"`
	RoomName string `json:"name"`
	Campus   string `json:"campus"`
	Color    string `json:"color,omitempty"`
}

type Discipline struct {
	Teacher   Teacher
	Coef      *float32 `json:"coef"`
	Trimester int      `json:"trimester"`
}

func (t JSONTime) Format() string {
	unix := int64(t) / 1000 // Convertir millisecondes en secondes
	tm := time.Unix(unix, 0)
	return tm.Format("2006-01-02T15:04:05.000Z")
}
