package structures

type Grades struct {
	Bonus            int       `json:"bonus"`
	Coef             string    `json:"coef"`
	CourseName       string    `json:"course"`
	ECTS             string    `json:"ects"`
	Exam             *float64  `json:"exam"`
	Grades           []float64 `json:"grades"`
	Trimester        int       `json:"trimester"`
	Year             int       `json:"year"`
	TeacherCivility  string    `json:"teacher_civility"`
	TeacherFirstName string    `json:"teacher_first_name"`
	TeacherLastName  string    `json:"teacher_last_name"`
}

type LocalGrades struct {
	Bonus       int       `json:"bonus"`
	Coef        string    `json:"coef"`
	CourseName  string    `json:"course"`
	ECTS        string    `json:"ects"`
	Exam        *float64  `json:"exam"`
	Grades      []float64 `json:"grades"`
	Trimester   int       `json:"trimester"`
	Year        int       `json:"year"`
	TeacherName string    `json:"teacher_civility"`
}
