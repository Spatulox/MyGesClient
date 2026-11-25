package structures

type UserSettings struct {
	ID       int64
	Username string
	Password string `json:"-"` // needed to log in to MyGes, never sent to the frontend
	Theme    string
	EULA     bool
	Year     string
	// Events are reminded this many minutes before they start (-1: never)
	ReminderMinutes int
	// Show the app in the Discord status of the user (Rich Presence)
	DiscordRPC bool
}
