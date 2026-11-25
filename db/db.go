package db

import (
	. "MyGesClient/log"
	. "MyGesClient/structures"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"time"

	_ "modernc.org/sqlite"
)

// ------------------------------------------------ //

// Connection settings, applied by the driver to every pooled connection:
// foreign keys are enforced, and concurrent writers wait instead of failing
// with SQLITE_BUSY.
const dsnPragmas = "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)"

// OpenDB opens the SQLite database at path and makes sure its schema is up to date.
func OpenDB(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+dsnPragmas)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'ouverture de la base de données: %w", err)
	}
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("erreur lors de la connexion à la base de données: %w", err)
	}
	if err := initSchema(db); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

// AppDataDir returns the folder of the application data (<config dir>/MyGes),
// and creates it if needed.
func AppDataDir() (string, error) {
	appDataPath, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("erreur lors de l'obtention du dossier AppData: %w", err)
	}

	dir := filepath.Join(appDataPath, "MyGes")
	if err := prepareDataDir(dir); err != nil {
		return "", err
	}
	return dir, nil
}

// InitDBConnexion opens the application database, in <config dir>/MyGes/db.sqlite.
func InitDBConnexion() (*sql.DB, error) {
	dir, err := AppDataDir()
	if err != nil {
		return nil, err
	}
	dbPath := filepath.Join(dir, "db.sqlite")
	db, err := OpenDB(dbPath)
	if err != nil {
		return nil, err
	}
	restrictToOwner(dbPath, 0600)
	return db, nil
}

// prepareDataDir creates the application data folder, readable by its owner
// only. It holds the database, which may contain a password in clear text
// (when the OS keyring is unavailable, see the credentials package) and
// personal data.
func prepareDataDir(dir string) error {
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("erreur lors de la création du dossier MyGes: %w", err)
	}
	// MkdirAll leaves the permissions of an existing folder unchanged
	// (0755 for the folders created by older versions)
	restrictToOwner(dir, 0700)
	return nil
}

// restrictToOwner sets the Unix permissions of path. Not fatal: the app works
// without it. Skipped on Windows, where os.Chmod only toggles the read-only
// attribute (the ACL of %AppData% already restrict it to the user).
func restrictToOwner(path string, mode os.FileMode) {
	if runtime.GOOS == "windows" {
		return
	}
	if err := os.Chmod(path, mode); err != nil {
		Log.Error(fmt.Sprintf("Impossible to restrict the permissions of %s: %v", path, err))
	}
}

// ------------------------------------------------ //

// CreateUser creates a new account and makes it the only selected one.
// The password is not stored here: see the credentials package.
func CreateUser(db *sql.DB, username string) (bool, error) {
	err := withTx(db, func(tx *sql.Tx) error {
		if _, err := tx.Exec("UPDATE USER SET selected = false"); err != nil {
			return fmt.Errorf("Erreur lors de l'update des utilisateurs existants (selected column) : %w", err)
		}
		if _, err := tx.Exec("INSERT INTO USER (username, password, selected) VALUES (?, '', true)", username); err != nil {
			return fmt.Errorf("Erreur lors de l'insertion du nouvel utilisateur : %w", err)
		}
		return nil
	})
	return err == nil, err
}

func CheckUserExist(db *sql.DB, username string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM USER WHERE username = ?)", username).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("Erreur lors du check si l'utilisateur %s existe : %w", username, err)
	}
	return exists, nil
}

// ------------------------------------------------ //

// The USER.password column only holds a password when the OS keyring was not
// available to store it (see the credentials package). An empty value means
// "the password is in the keyring". These functions are meant to be used by
// the credentials package only.

// GetStoredPassword returns the password stored in the database for username,
// or "" if there is none.
func GetStoredPassword(db *sql.DB, username string) (string, error) {
	var password string
	err := db.QueryRow("SELECT password FROM USER WHERE username = ?", username).Scan(&password)
	if err != nil {
		return "", fmt.Errorf("Erreur lors de la lecture du mot de passe de %s : %w", username, err)
	}
	return password, nil
}

// SetStoredPassword stores password in the database for username ("" clears it).
func SetStoredPassword(db *sql.DB, username string, password string) error {
	result, err := db.Exec("UPDATE USER SET password = ? WHERE username = ?", password, username)
	if err != nil {
		return fmt.Errorf("Erreur lors de l'update de l'utilisateurs %s : %w", username, err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}
	if rowsAffected != 1 {
		return fmt.Errorf("Aucun compte local ne correspond à l'utilisateur %s", username)
	}
	return nil
}

// ListUsersWithStoredPassword returns the accounts whose password is still in the database.
func ListUsersWithStoredPassword(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT username FROM USER WHERE password <> ''")
	if err != nil {
		return nil, fmt.Errorf("Erreur lors de la lecture des comptes : %w", err)
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var username string
		if err := rows.Scan(&username); err != nil {
			return nil, err
		}
		users = append(users, username)
	}
	return users, rows.Err()
}

// Vacuum rebuilds the database file, so that deleted values (like a password
// moved to the keyring) do not stay in its free pages.
func Vacuum(db *sql.DB) error {
	if _, err := db.Exec("VACUUM"); err != nil {
		return fmt.Errorf("Erreur lors du VACUUM de la base : %w", err)
	}
	return nil
}

// ------------------------------------------------ //

func UpdateUserLastYear(db *sql.DB, year string) (bool, error) {
	_, err := db.Exec("UPDATE USER SET last_year = ? WHERE selected = true", year)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de l'update de l'année de l'utilisateurs : %w", err)
	}
	return true, nil
}

// ------------------------------------------------ //

func GetUser(db *sql.DB) (UserSettings, error) {
	var user UserSettings
	query := `SELECT user_id, username, theme, eula, last_year, reminder_minutes FROM USER WHERE selected = true`
	err := db.QueryRow(query).Scan(&user.ID, &user.Username, &user.Theme, &user.EULA, &user.Year, &user.ReminderMinutes)
	if err != nil {
		Log.Error(fmt.Sprintf("1 %v", err))
		return UserSettings{}, err
	}
	return user, nil
}

// ------------------------------------------------ //

func GetLastYearInDB(db *sql.DB) (string, error) {
	var year string
	query := `SELECT last_year FROM USER WHERE selected = true`
	err := db.QueryRow(query).Scan(&year)
	if err != nil {
		Log.Error(fmt.Sprintf("2 %v", err))
		return "1970", err
	}
	return year, nil
}

// ------------------------------------------------ //

func GetRegisteredUsers(db *sql.DB) ([]UserSettings, error) {
	query := `SELECT user_id, username, theme, eula, last_year, reminder_minutes FROM USER` // WHERE selected = 0`
	rows, err := db.Query(query)
	if err != nil {
		Log.Error(fmt.Sprintf("3 %v", err))
		return nil, err
	}
	defer rows.Close()

	var users []UserSettings
	for rows.Next() {
		var user UserSettings
		err := rows.Scan(&user.ID, &user.Username, &user.Theme, &user.EULA, &user.Year, &user.ReminderMinutes)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// ------------------------------------------------ //

func DeconnectUser(db *sql.DB) error {
	user, err := GetUser(db)
	if err != nil {
		return fmt.Errorf("Impossible to select the current user :/")
	}
	query := `UPDATE USER SET selected = 0 WHERE user_id = ?`
	_, err = db.Exec(query, user.ID)
	if err != nil {
		return err
	}

	return nil
}

// ------------------------------------------------ //

// ErrBadCredentials is returned when the username or the password is wrong.
var ErrBadCredentials = errors.New("nom d'utilisateur ou mot de passe incorrect")

// ConnectUser selects the account username and deselects every other account.
// The password must have been checked by the caller. Nothing changes if the
// account does not exist.
func ConnectUser(db *sql.DB, username string) error {
	return withTx(db, func(tx *sql.Tx) error {
		result, err := tx.Exec(`UPDATE USER SET selected = true WHERE username = ?`, username)
		if err != nil {
			return fmt.Errorf("Error when connecting the user : %w", err)
		}
		n, err := result.RowsAffected()
		if err != nil {
			return fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
		}
		if n != 1 {
			return ErrBadCredentials
		}
		if _, err := tx.Exec(`UPDATE USER SET selected = false WHERE username <> ?`, username); err != nil {
			return fmt.Errorf("Error when deselecting the other users : %w", err)
		}
		return nil
	})
}

// ------------------------------------------------ //

func UpdateUserEula(db *sql.DB) (bool, error) {
	updateQuery := `UPDATE USER SET eula = true WHERE selected = true`
	result, err := db.Exec(updateQuery)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la mise à jour de l'EULA : %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}

	if rowsAffected == 0 {
		return false, fmt.Errorf("Aucun utilisateur sélectionné trouvé pour la mise à jour de l'EULA")
	}

	return true, nil
}

// ------------------------------------------------ //

// Bounds of USER.reminder_minutes: ReminderDisabled turns the event
// reminders off, 0 reminds when the event starts, at most one day before.
const (
	ReminderDisabled   = -1
	ReminderMaxMinutes = 24 * 60
)

// UpdateUserReminderMinutes sets how many minutes before an event the
// selected user is reminded of it.
func UpdateUserReminderMinutes(db *sql.DB, minutes int) error {
	if minutes < ReminderDisabled || minutes > ReminderMaxMinutes {
		return fmt.Errorf("délai de rappel invalide : %d minutes", minutes)
	}

	result, err := db.Exec(`UPDATE USER SET reminder_minutes = ? WHERE selected = true`, minutes)
	if err != nil {
		return fmt.Errorf("Erreur lors de la mise à jour du délai de rappel : %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}
	if rowsAffected == 0 {
		return fmt.Errorf("Aucun utilisateur sélectionné trouvé pour la mise à jour du délai de rappel")
	}
	return nil
}

// ------------------------------------------------ //

func UpdateUserTheme(db *sql.DB, value string) (bool, error) {

	if value != "dark" && value != "light" {
		return false, errors.New("ERROR : Wrong value")
	}

	updateQuery := `UPDATE USER SET theme = ? WHERE selected = true`

	result, err := db.Exec(updateQuery, value)
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la mise à jour du thème : %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("Erreur lors de la vérification des lignes affectées : %w", err)
	}

	if rowsAffected == 0 {
		return false, fmt.Errorf("Aucun utilisateur sélectionné trouvé pour la mise à jour du thème")
	}

	return true, nil
}

// ------------------------------------------------ //

// DeleteOldData purges, for the selected user only, the past schedule and
// events, and the grades / absences of the years before the current one.
func DeleteOldData(db *sql.DB) error {
	user, err := GetUser(db)
	if err != nil {
		return fmt.Errorf("impossible de sélectionner l'utilisateur actuellement connecté : %w", err)
	}

	Log.Infos(fmt.Sprintf("Deleting old data for user : %d", user.ID))

	year, err := strconv.Atoi(user.Year)
	if err != nil {
		return fmt.Errorf("année invalide pour l'utilisateur (%q) : %w", user.Year, err)
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	agendaLimit := today.Format("2006-01-02T15:04:05.000Z") // AGENDA date format
	eventLimit := today.Format("2006-01-02 15:04:05")       // EVENTS date format

	return withTx(db, func(tx *sql.Tx) error {
		queries := []struct {
			label string
			query string
			args  []any
		}{
			{"agenda", `DELETE FROM AGENDA WHERE user_id = ? AND start_date < ?`, []any{user.ID, agendaLimit}},
			{"valeurs des notes", `DELETE FROM GRADESVALUE WHERE note_id IN (SELECT note_id FROM NOTES WHERE user_id = ? AND year < ?)`, []any{user.ID, year}},
			{"notes", `DELETE FROM NOTES WHERE user_id = ? AND year < ?`, []any{user.ID, year}},
			{"absences", `DELETE FROM ABSENCES WHERE user_id = ? AND CAST(abs_year AS INTEGER) < ?`, []any{user.ID, year}},
			{"évènements", `DELETE FROM EVENTS WHERE user_id = ? AND start_date < ?`, []any{user.ID, eventLimit}},
		}
		for _, q := range queries {
			if _, err := tx.Exec(q.query, q.args...); err != nil {
				return fmt.Errorf("erreur lors de la suppression (%s) : %w", q.label, err)
			}
		}
		return nil
	})
}

func SavePreset(db *sql.DB, presetName string, value string, presetType string) bool {
	user, err := GetUser(db)

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible de sélectionner l'utilisateur actuellement connecté : %v", err))
		return false
	}

	query := `
		INSERT INTO PRESET (user_id, name, value, type)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, name, type) DO UPDATE SET value=excluded.value
	`
	_, err = db.Exec(query, user.ID, presetName, value, presetType)
	if err != nil {
		Log.Error(fmt.Sprintf("Error when connecting the user : %v", err))
		return false
	}
	return true
}

func GetPresetByName(db *sql.DB, presetName string) (Preset, error) {
	user, err := GetUser(db)
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible de sélectionner l'utilisateur actuellement connecté : %v", err))
		return Preset{}, fmt.Errorf("Impossible de récupérer l'utilisateur : %v", err)
	}

	query := `
        SELECT id, name, value, type
        FROM PRESET
        WHERE user_id = ? AND name = ?
        LIMIT 1
    `
	var p Preset
	row := db.QueryRow(query, user.ID, presetName)
	err = row.Scan(&p.ID, &p.Name, &p.Value, &p.Type)
	if err != nil {
		if err == sql.ErrNoRows {
			return Preset{}, fmt.Errorf("Aucun preset trouvé pour ce nom")
		}
		return Preset{}, fmt.Errorf("Erreur lors de la récupération du preset par son nom : %v", err)
	}
	return p, nil
}

func GetPresetByID(db *sql.DB, id int) (Preset, error) {

	query := `
        SELECT id, name, value, type
        FROM PRESET
        WHERE id = ?
        LIMIT 1
    `
	var p Preset
	row := db.QueryRow(query, id)
	err := row.Scan(&p.ID, &p.Name, &p.Value, &p.Type)
	if err != nil {
		if err == sql.ErrNoRows {
			return Preset{}, fmt.Errorf("Aucun preset trouvé pour ce nom")
		}
		return Preset{}, fmt.Errorf("Erreur lors de la récupération du preset par son id : %v", err)
	}
	return p, nil
}
