package backend

import (
	. "MyGesClient/api"
	"MyGesClient/credentials"
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	. "MyGesClient/time"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	_ "modernc.org/sqlite"
)

type StartupStatus int

const (
	StatusNotStarted StartupStatus = iota
	StatusInProgress
	StatusIncompleteNoUsers
	StatusIncompleteNoInternet
	StatusCompleted
	StatusFailed
	StatusPasswordMissing // the password is neither in the keyring nor in the DB: the user must type it again
)

// Startup error flags, combined with |
const (
	ErrDBInit = 1 << iota
	ErrUserInit
	ErrAPIInit
	ErrYearsRequest
	ErrPasswordInit
)

// Without a network, an account or a password, the app still starts (offline
// mode, account creation or password prompt). Only a DB failure is fatal.
const allowedStartupErrors = ErrUserInit | ErrAPIInit | ErrYearsRequest | ErrPasswordInit

// App struct
type App struct {
	ctx                context.Context
	year               string   // current school year, use getYear / setYear
	years              []string // years listed by MyGes, use getKnownYears / setKnownYears
	db                 *sql.DB
	creds              *credentials.Store // passwords, in the OS keyring when available
	dbMutex            sync.Mutex
	dbWg               sync.WaitGroup
	api                *GESapi
	apiRWMutex         sync.RWMutex
	user               UserSettings
	startupStatus      atomic.Int32 // StartupStatus
	yearMutex          sync.RWMutex // protects year and years
	isFetchingGrades   atomic.Bool
	isFetchingAbsences atomic.Bool
	isFetchingSchedule atomic.Bool

	bgMutex            sync.Mutex    // protects stopInitIfInternet
	stopInitIfInternet chan struct{} // closed to stop the running initIfInternet loop
	bgTasksOnce        sync.Once     // background tasks must only be started once
}

// -------------------------------------------------------------------------- //

// NewApp creates a new App application struct
func NewApp() *App {
	Log.Infos("Creating App")
	return &App{}
}

// -------------------------------------------------------------------------- //

func (a *App) GetStartupStatus() StartupStatus {
	return StartupStatus(a.startupStatus.Load())
}

func (a *App) setStartupStatus(status StartupStatus) {
	a.startupStatus.Store(int32(status))
}

// Thread safe accessors for the school year
func (a *App) getYear() string {
	a.yearMutex.RLock()
	defer a.yearMutex.RUnlock()
	return a.year
}

func (a *App) setYear(year string) {
	a.yearMutex.Lock()
	defer a.yearMutex.Unlock()
	a.year = year
}

func (a *App) CheckOpenDb() bool {
	if a.db == nil {
		Log.Error("Not connected to DB")
		return false
	}

	if err := a.db.Ping(); err != nil {
		Log.Error("Failed to ping DB")
		return false
	}

	return true
}

// -------------------------------------------------------------------------- //

// Thread safe methode to set / get the api "token"
func (a *App) getAPI() *GESapi {
	a.apiRWMutex.RLock()
	defer a.apiRWMutex.RUnlock()
	return a.api
}

func (a *App) setAPI(api *GESapi) {
	a.apiRWMutex.Lock()
	defer a.apiRWMutex.Unlock()
	a.api = api
}

func (a *App) deleteAPI() {
	a.apiRWMutex.Lock()
	defer a.apiRWMutex.Unlock()
	a.api = nil
}

// -------------------------------------------------------------------------- //
// Thread safe methode to set / get the api "user"
func (a *App) getAPIUser() UserSettings {
	a.apiRWMutex.RLock()
	defer a.apiRWMutex.RUnlock()
	return a.user
}

func (a *App) setAPIUser(user UserSettings) {
	a.apiRWMutex.Lock()
	defer a.apiRWMutex.Unlock()
	a.user = user
}

func (a *App) deleteAPIUser() {
	a.apiRWMutex.Lock()
	defer a.apiRWMutex.Unlock()
	a.user = UserSettings{}
}

func (a *App) stopInitIfInternetFunc() {
	a.bgMutex.Lock()
	defer a.bgMutex.Unlock()
	if a.stopInitIfInternet != nil {
		close(a.stopInitIfInternet)
		a.stopInitIfInternet = nil
	}
}

// -------------------------------------------------------------------------- //

// Execute any function in parameter every x minutes
func (a *App) runEveryXMinutes(ctx context.Context, x time.Duration, f func()) {
	ticker := time.NewTicker(x * time.Minute)
	defer ticker.Stop()

	f() // Exécuter immédiatement

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			f()
		}
	}
}

// -------------------------------------------------------------------------- //

// startup is called when the app starts. The context is saved
// so we can call the runtime methods

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.setStartupStatus(StatusInProgress)
	startupErrors := 0

	if err := a.initDB(); err != nil {
		a.handleStartupError("DB initialization", err)
		startupErrors |= ErrDBInit
	} else {
		// Events are local: the reminders work offline and without a password
		a.startReminders()
	}
	refreshAutostartPath()

	if err := a.initUser(); err != nil {
		a.handleStartupError("User initialization", err)
		if isPasswordError(err) {
			startupErrors |= ErrPasswordInit
		} else {
			startupErrors |= ErrUserInit
		}
	}

	// Without a password, a login attempt would only be rejected by MyGes
	if startupErrors&(ErrUserInit|ErrPasswordInit) == 0 {
		if err := a.initAPI(); err != nil {
			a.handleStartupError("API initialization", err)
			startupErrors |= ErrAPIInit
		}
	}

	if err := a.initYear(); err != nil {
		a.handleStartupError("Year initialization", err)
		startupErrors |= ErrYearsRequest
	}

	switch {
	case startupErrors == 0:
		a.startBackgroundTasks()
		a.setStartupStatus(StatusCompleted)
		Log.Infos("Startup completed successfully")

	case startupErrors&^allowedStartupErrors != 0:
		a.setStartupStatus(StatusFailed)
		errorMessage := fmt.Sprintf("L'application n'a pas pu démarrer. Error code : %d", startupErrors)
		if _, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.ErrorDialog,
			Title:   "Erreur de démarrage",
			Message: errorMessage,
		}); err != nil {
			return
		}
		runtime.Quit(ctx)

	case startupErrors&ErrUserInit != 0:
		Log.Infos("Starting app without critic errors (no account)")
		a.setStartupStatus(StatusIncompleteNoUsers)

	case startupErrors&ErrPasswordInit != 0:
		Log.Infos("Starting app without critic errors (password missing), waiting for the user to type it again")
		a.setStartupStatus(StatusPasswordMissing)

	default:
		Log.Infos("Starting app without critic errors (no internet), searching for internet...")
		a.setStartupStatus(StatusIncompleteNoInternet)
		a.initIfInternet()
	}
}

func (a *App) Shutdown(ctx context.Context) {
	Log.Infos("App is shutting down...")

	Log.Infos("Waiting for DB processus")
	a.dbWg.Wait()
	Log.Infos("DB OK")

	if a.db != nil {
		Log.Infos("Closing DB connexion")
		a.db.Close()
	}
}

func (a *App) initDB() error {
	var err error
	a.db, err = InitDBConnexion()
	if err != nil {
		return fmt.Errorf("failed to initialize DB: %w", err)
	}
	if err := a.db.Ping(); err != nil {
		return fmt.Errorf("failed to ping DB: %w", err)
	}
	Log.Infos("DB connection Initialized")

	a.creds = credentials.New(a.db)
	// Passwords saved by older versions (or while the keyring was unavailable)
	// are moved to the keyring. Not fatal: they stay usable from the DB.
	// In the background: a keyring waiting for an unlock prompt must not
	// delay the startup (the selected account is moved by initUser anyway).
	a.dbWg.Add(1)
	go func() {
		defer a.dbWg.Done()
		if err := a.creds.MigrateAll(); err != nil {
			Log.Error(fmt.Sprintf("Impossible to move the passwords to the OS keyring: %v", err))
		}
	}()
	return nil
}

// isPasswordError reports whether err means the password of the user could
// not be retrieved (the user has to type it again).
func isPasswordError(err error) bool {
	return errors.Is(err, credentials.ErrPasswordMissing) || errors.Is(err, credentials.ErrKeyringUnavailable)
}

// initUser loads the selected account and its password. The account is set
// even when the password cannot be retrieved, so the local data stays usable.
func (a *App) initUser() error {
	userLocal, err := GetUser(a.db)
	if err != nil {
		return fmt.Errorf("impossible to initialize the user: %w", err)
	}
	userLocal.Password, err = a.creds.GetPassword(userLocal.Username)
	a.setAPIUser(userLocal)
	if err != nil {
		return fmt.Errorf("impossible to retrieve the password of the user: %w", err)
	}
	Log.Infos("User Initialized")
	return nil
}

func (a *App) initAPI() error {
	userApiLocal := a.getAPIUser()
	if userApiLocal.Password == "" {
		return errors.New("impossible to initialize the API part: no password for the user")
	}
	userApi, err := GESLogin(userApiLocal.Username, userApiLocal.Password)
	if err != nil {
		return fmt.Errorf("impossible to initialize the API part: %w", err)
	}
	Log.Infos(fmt.Sprintf("USER API initalize : %v", userApi))
	a.setAPI(userApi)
	Log.Infos("API connection Initialized")
	return nil
}

func (a *App) initYear() error {
	api := a.getAPI()
	if api == nil {
		year, err := GetLastYearInDB(a.db)
		if err != nil {
			return fmt.Errorf("impossible to retrieve the year: %w", err)
		}
		Log.Infos("Local Year Retrieved")
		a.setYear(year)
		return nil
	}

	var year string
	yearsJSON, err := api.GetYears()
	if err != nil {
		a.handleStartupError("Years initialization request", err)
		year, err = GetLastYearInDB(a.db)
		if err != nil {
			return fmt.Errorf("impossible to retrieve the year: %w", err)
		}
		Log.Infos("Local Year Retrieved")
	} else {
		years, err := parseYears(yearsJSON)
		if err != nil {
			return fmt.Errorf("impossible to parse the retrieved year: %w", err)
		}
		year = years[0]
		a.setKnownYears(years)
	}
	a.setYear(year)

	if ok, err := UpdateUserLastYear(a.db, year); !ok || err != nil {
		Log.Error(fmt.Sprintf("Error : Impossible to update the last year for the user : %v", err))
	}
	return nil
}

// initIfInternet waits for the network to come back, then initializes the API
// and starts the background tasks. Only one such loop runs at a time: calling
// it again stops the previous one.
func (a *App) initIfInternet() {
	a.bgMutex.Lock()
	if a.stopInitIfInternet != nil {
		close(a.stopInitIfInternet)
	}
	stop := make(chan struct{})
	a.stopInitIfInternet = stop
	a.bgMutex.Unlock()

	ctx := a.ctx
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				Log.Infos("Application context cancelled, stopping internet check")
				return
			case <-stop:
				Log.Infos("initIfInternet goroutine stopped manually")
				return
			case <-ticker.C:
				Log.Infos("Cheking internet connection")
				if !a.CheckInternetConnection() {
					Log.Infos("No internet")
					continue
				}
				if a.connectAPI() {
					a.bgMutex.Lock()
					if a.stopInitIfInternet == stop {
						a.stopInitIfInternet = nil
					}
					a.bgMutex.Unlock()
					return
				}
			}
		}
	}()
}

// connectAPI initializes the API session and the year, then starts the
// background tasks. Returns false if MyGes could not be reached.
func (a *App) connectAPI() bool {
	if err := a.initAPI(); err != nil {
		a.handleStartupError("API initialization", err)
		return false
	}
	if err := a.initYear(); err != nil {
		a.handleStartupError("Year initialization", err)
		return false
	}
	a.startBackgroundTasks()
	a.setStartupStatus(StatusCompleted)
	return true
}

// connectOrWaitForInternet connects to MyGes, or starts waiting for the
// network if it is unreachable.
func (a *App) connectOrWaitForInternet() {
	if !a.connectAPI() {
		a.setStartupStatus(StatusIncompleteNoInternet)
		a.initIfInternet()
	}
}

// handleStartupError only logs: the status is set by the caller, so a
// temporary failure (e.g. token renewal without network) does not leave the
// app in StatusFailed forever.
func (a *App) handleStartupError(step string, err error) {
	Log.Error(fmt.Sprintf("Startup failed during %s: %v", step, err))
}

// -------------------------------------------------------------------------- //

// currentWeekBounds returns the Monday and Sunday of the current week as "2006-01-02".
func currentWeekBounds() (string, string) {
	monday, sunday := GetWeekDates()
	return monday.Format("2006-01-02"), sunday.Format("2006-01-02")
}

// refreshCurrentWeek refreshes the schedule of the current week, the grades and the absences.
func (a *App) refreshCurrentWeek() (string, error) {
	monday, sunday := currentWeekBounds()
	return a.globalRefresh(monday, sunday)
}

// startBackgroundTasks starts the periodic refreshes. It is safe to call
// several times (Startup, initIfInternet, account creation, connection):
// the tasks are only started once.
func (a *App) startBackgroundTasks() {
	a.bgTasksOnce.Do(a.runBackgroundTasks)
}

func (a *App) runBackgroundTasks() {
	// GlobalRefresh (Schedule / Grades / Absences...)
	Log.Infos("Launching go routines")
	go a.runEveryXMinutes(a.ctx, 60, func() {
		msg, err := a.refreshCurrentWeek()
		if err != nil {
			Log.Error(fmt.Sprintf("Global Refresh failed: %v", err))
		} else {
			Log.Infos(msg)
		}
	})

	// RefreshingSchedule
	go a.runEveryXMinutes(a.ctx, 7, func() {
		// The week is computed at each tick: the app can stay open across several weeks
		monday, sunday := currentWeekBounds()
		if _, err := a.RefreshAgenda(&monday, &sunday); err != nil {
			Log.Error(fmt.Sprintf("Agenda Refresh failed: %v", err))
		}
	})

	go a.runEveryXMinutes(a.ctx, 60, func() {
		Log.Infos("Updating the MyGes connection Token")

		maxChecks := 5
		checkInterval := time.Minute

		for i := 0; i < maxChecks; i++ {
			if a.CheckInternetConnection() {
				if err := a.initAPI(); err == nil {
					if err := a.initYear(); err == nil {
						return
					} else {
						a.handleStartupError("Year initialization error : ", err)
					}
				} else {
					a.handleStartupError("API initialization error :", err)
				}
			}

			if i < maxChecks-1 {
				select {
				case <-a.ctx.Done():
					return
				case <-time.After(checkInterval):
				}
			}
		}
	})
}

// -------------------------------------------------------------------------- //

func (a *App) GetStartStatus() StartupStatus {
	return a.GetStartupStatus()
}

// -------------------------------------------------------------------------- //

func (a *App) CheckInternetConnection() bool {
	// Définir un délai d'attente pour la requête
	internetClient := http.Client{
		Timeout: 5 * time.Second,
	}

	// Effectuer une requête GET vers un site connu
	resp, err := internetClient.Get("http://www.google.com")
	if err != nil {
		return false // Une erreur signifie qu'il n'y a pas de connexion
	}
	defer resp.Body.Close()

	// Vérifier le statut de la réponse
	return resp.StatusCode == http.StatusOK
}

// -------------------------------------------------------------------------- //

func (a *App) CheckXTimeInternetConnection(attempts int) bool {
	// Définir un délai d'attente pour la requête
	internetClient := http.Client{
		Timeout: 5 * time.Second,
	}

	// Effectuer des tentatives de connexion
	for i := 0; i < attempts; i++ {
		resp, err := internetClient.Get("http://www.google.com")
		if err == nil {
			defer resp.Body.Close() // Fermer le corps de la réponse
			// Vérifier le statut de la réponse
			if resp.StatusCode == http.StatusOK {
				return true // Connexion réussie
			}
		}
		// Attendre un court moment avant la prochaine tentative
		time.Sleep(2 * time.Second) // Optionnel : ajustez le délai si nécessaire
	}

	return false // Retourne false si aucune connexion n'est établie après les tentatives
}

// -------------------------------------------------------------------------- //

// GetCourses returns the courses of the current school year (MyGes JSON).
func (a *App) GetCourses() (string, error) {
	return a.GetCoursesForYear("")
}

// GetCoursesForYear returns the courses of the given school year ("2024" for
// 2024-2025, "" for the current one), as MyGes JSON. Not cached locally.
func (a *App) GetCoursesForYear(year string) (string, error) {
	year, err := a.resolveYear(year)
	if err != nil {
		return "", err
	}
	if !yearFormat.MatchString(year) {
		Log.Error(fmt.Sprintf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", year))
		return "", fmt.Errorf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", year)
	}

	api := a.getAPI()
	if api == nil {
		return "", fmt.Errorf("GESapi instance is nil")
	}
	return api.GetCourses(year)
}

func (a *App) GetPresetByName(presetName string) (Preset, error) {
	return GetPresetByName(a.db, presetName)
}
