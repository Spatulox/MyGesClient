package structures

type UserSettings struct {
	ID       int64
	Username string
	Password string `json:"-"` // needed to log in to MyGes, never sent to the frontend
	Theme    string
	EULA     bool
	Year     string
}
