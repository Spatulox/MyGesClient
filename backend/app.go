package backend

import (
	. "MyGesClient/api"
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	. "MyGesClient/time"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/hugolgst/rich-go/client"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	_ "modernc.org/sqlite"
)

type StartupStatus int

const (
	StatusNotStarted StartupStatus = iota
	StatusInProgress
	StatusCompleted
	StatusIncompleteNoUsers
	StatusIncompleteNoInternet
	StatusFailed
)

const (
	ErrDBInit       = 1
	ErrUserInit     = 10
	ErrAPIInit      = 100
	ErrYearsRequest = 1000
	ErrYearsParsing = 10000
)

// App struct
type App struct {
	ctx                context.Context
	year               string
	db                 *sql.DB
	dbMutex            sync.Mutex
	dbWg               sync.WaitGroup
	api                *GESapi
	apiRWMutex         sync.RWMutex
	user               UserSettings
	startupStatus      StartupStatus
	profileMutex       sync.Mutex
	isFetchingProfile  bool
	gradesMutex        sync.Mutex
	isFetchingGrades   bool
	absencesMutex      sync.Mutex
	isFetchingAbsences bool
	scheduleMutex      sync.Mutex
	isFetchingSchedule bool
	stopInitIfInternet chan struct{}
}

// -------------------------------------------------------------------------- //

// NewApp creates a new App application struct
func NewApp() *App {
	Log.Infos("Creating App")
	return &App{}
}

// -------------------------------------------------------------------------- //

func (a *App) GetStartupStatus() StartupStatus {
	return a.startupStatus
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
	a.startupStatus = StatusInProgress
	errour := 0

	if err := a.initDB(); err != nil {
		a.handleStartupError("DB initialization", err)
		errour += ErrDBInit
	}

	if err := a.initUser(); err != nil {
		a.handleStartupError("User initialization", err)
		errour += ErrUserInit
	}

	if err := a.initAPI(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrAPIInit
	}

	if err := a.initYear(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrYearsRequest
	}

	if errour != 0 {

		allowedErrors := ErrYearsParsing | ErrAPIInit | ErrUserInit

		// Vérifiez si les erreurs actuelles sont uniquement celles autorisées
		if errour & ^allowedErrors == 0 {
			// Les seules erreurs présentes sont celles autorisées, l'application peut démarrer
			fmt.Println("Starting app without critic errors (No internet or no account)")
		} else {
			errorMessage := fmt.Sprintf("L'application n'a pas pu démarrer. Error code : %d", errour)
			_, err := runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "Erreur de démarrage",
				Message: errorMessage,
			})
			if err != nil {
				return
			}
			runtime.Quit(ctx)
		}

		if errour&ErrUserInit != 0 {
			a.startupStatus = StatusIncompleteNoUsers
			Log.Infos("No Users")
			Log.Infos("Startup incomplete.")
		} else {
			a.startupStatus = StatusIncompleteNoInternet
			Log.Infos("No Internet")
			Log.Infos("Startup incomplete, searching for internet...")

			// Search for internet
			a.initIfInternet()

		}
	} else {
		a.startBackgroundTasks()
		a.startupStatus = StatusCompleted
		Log.Infos("Startup completed successfully")
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
	return nil
}

func (a *App) initUser() error {
	userLocal, err := GetUser(a.db)
	if err != nil {
		return fmt.Errorf("impossible to initialize the user: %w", err)
	}
	a.setAPIUser(userLocal)
	Log.Infos("User Initialized")
	return nil
}

func (a *App) initAPI() error {
	userApiLocal := a.getAPIUser()
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
	if api != nil {
		years, err := api.GetYears()
		if err != nil {
			a.handleStartupError("Years initialization request", err)
			year, err := GetLastYearInDB(a.db)
			if err != nil {
				return fmt.Errorf("impossible to retrieve the year", err)
			}
			Log.Infos("Local Year Retrieved")
			a.year = year

		} else {
			a.year, err = a.getLatestYear(years)
			if err != nil {
				a.handleStartupError("Years initialization parsing", err)
				return fmt.Errorf("impossible parse the retrieved year", err)
			}
		}

		boolean, err := UpdateUserLastYear(a.db, a.year)
		if !boolean || err != nil {
			Log.Error("Error : Impossible to update the last year for the user : %v", err)
			return nil
		}
	} else {
		year, err := GetLastYearInDB(a.db)
		if err != nil {
			return fmt.Errorf("impossible to retrieve the year", err)
		}
		Log.Infos("Local Year Retrieved")
		a.year = year
	}
	return nil
}

func (a *App) initIfInternet() {
	ctx := a.ctx
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				Log.Infos("Application context cancelled, stopping internet check")
				return
			case <-a.stopInitIfInternet:
				Log.Infos("initIfInternet goroutine stopped manually")
				return
			case <-ticker.C:
				Log.Infos("Cheking internet connection")
				if a.CheckInternetConnection() {
					var errApi, errYear error

					if errApi = a.initAPI(); errApi == nil {
						Log.Infos("Internet connection restored, initAPI OK")
					} else {
						a.handleStartupError("API initialization", errApi)
					}

					if errYear = a.initYear(); errYear == nil {
						Log.Infos("Internet connection restored, initYear OK")
					} else {
						a.handleStartupError("API initialization", errYear)
					}

					if errApi == nil && errYear == nil {
						a.startBackgroundTasks()
						a.startupStatus = StatusCompleted
						return
					}
				} else {
					Log.Infos("No internet")
				}
			}
		}
	}()
}

func (a *App) handleStartupError(step string, err error) {
	a.startupStatus = StatusFailed
	Log.Error(fmt.Sprintf("Startup failed during %s: %v", step, err))
}

func (a *App) getLatestYear(jsonData string) (string, error) {
	type Years struct {
		Items []int `json:"items"`
	}
	var years Years
	err := json.Unmarshal([]byte(jsonData), &years)
	if err != nil {
		return "0", err
	}

	if len(years.Items) == 0 {
		return "0", fmt.Errorf("no years found in the data")
	}

	latestYear := years.Items[0]
	for _, year := range years.Items {
		if year > latestYear {
			latestYear = year
		}
	}
	return strconv.Itoa(latestYear), nil
}

// -------------------------------------------------------------------------- //

func (a *App) startBackgroundTasks() {

	monday, sunday := GetWeekDates()

	// GlobalRefresh (Schedule / Grades / Absences...)
	Log.Infos("Launching go routines")
	go a.runEveryXMinutes(a.ctx, 60, func() {
		msg, err := a.globalRefresh(fmt.Sprintf("%d", a.year), monday.Format("2006-01-02"), sunday.Format("2006-01-02"))
		if err != nil {
			Log.Error(fmt.Sprintf("Global Refresh failed: %v", err))
		} else {
			Log.Infos(msg)
		}
	})

	// RefreshingSchedule
	go a.runEveryXMinutes(a.ctx, 7, func() {
		monday2 := monday.Format("2006-01-02")
		sunday2 := sunday.Format("2006-01-02")
		if _, err := a.RefreshAgenda(&monday2, &sunday2); err != nil {
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
				time.Sleep(checkInterval)
			}
		}
	})
}

// -------------------------------------------------------------------------- //

func (a *App) GetStartStatus() StartupStatus {
	return a.startupStatus
}

// -------------------------------------------------------------------------- //

func (a *App) GetParentDir() string {
	execPath, err := os.Executable()
	if err != nil {
		return ""
	}

	// Obtient le répertoire contenant l'exécutable
	dir := filepath.Dir(execPath)

	// Remonte d'un niveau pour obtenir le répertoire parent
	parentDir := filepath.Dir(dir)

	return parentDir
}

func (a *App) WriteLogFile(filePath string, content string) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("Erreur lors de la création du répertoire: %w", err)
	}

	// Ouvrir le fichier en mode append (ou le créer s'il n'existe pas)
	file, err := os.OpenFile(filePath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("Erreur lors de l'ouverture du fichier: %w", err)
	}
	defer file.Close()

	logEntry := fmt.Sprintf("%s", content)

	// Écrire dans le fichier
	if _, err := file.WriteString(logEntry); err != nil {
		return fmt.Errorf("Erreur lors de l'écriture dans le fichier: %w", err)
	}

	return nil
}

// -------------------------------------------------------------------------- //

func (a *App) InitDiscordRPC() error {
	err := client.Login("1196836862447329351")
	if err != nil {
		return err
	}

	err = client.SetActivity(client.Activity{
		Details:    "Unofficial MyGes Client",
		State:      "Dashboard",
		LargeImage: "ges_logo",
		LargeText:  "GES_logo",
		Buttons: []*client.Button{
			{
				Label: "Obtenez le logiciel",
				Url:   "https://github.com/Spatulox/MyGesClient/releases",
			},
		},
	})
	return err
}

// -------------------------------------------------------------------------- //

func (a *App) UpdateDiscordRPC(details string, state string) error {
	return client.SetActivity(client.Activity{
		Details:    details,
		State:      state,
		LargeImage: "ges_logo",
		LargeText:  "GES_logo",
	})
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

func (a *App) GetCourses() (string, error) {

	if a.year == "" {
		return "", fmt.Errorf("Year is undefined")
	}

	matched, err := regexp.MatchString(`^20\d{2}$`, a.year)
	if err != nil {
		Log.Error(fmt.Sprintf("erreur lors de la vérification du format de l'année: %v", err))
		return "", fmt.Errorf("erreur lors de la vérification du format de l'année: %v", err)
	}
	if !matched {
		Log.Error(fmt.Sprintf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", a.year))
		return "", fmt.Errorf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", a.year)
	}

	return a.api.GetCourses(a.year)
}
