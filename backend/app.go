package backend

import (
	. "MyGesClient/api"
	. "MyGesClient/db"
	. "MyGesClient/log"
	. "MyGesClient/structures"
	. "MyGesClient/time"
	"context"
	"database/sql"
	"fmt"
	"github.com/hugolgst/rich-go/client"
	_ "modernc.org/sqlite"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"time"
)

var STARTFINISH = 0

// App struct
type App struct {
	ctx  context.Context
	db   *sql.DB
	api  *GESapi
	user UserSettings
}

// -------------------------------------------------------------------------- //

// NewApp creates a new App application struct
func NewApp() *App {
	Log.Infos("Creating App")
	return &App{}
}

// -------------------------------------------------------------------------- //

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
	Log.Infos("Initializing App")
	a.ctx = ctx

	var err error
	a.db, err = InitDBConnexion()
	if err != nil {
		Log.Error(fmt.Sprintf("Failed to initialize DB : %s", err))
		STARTFINISH = -1
		return
	}
	Log.Infos("DB connection Initialized")

	if err := a.db.Ping(); err != nil {
		Log.Error(fmt.Sprintf("Failed to ping DB %v", err))
		STARTFINISH = -1
		return
	}

	userLocal, err := GetUser(a.db)

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to initialize the user, the database is may be empty ? %v", err))
		STARTFINISH = -1
		return
	}

	a.user = userLocal
	Log.Infos("User Initialized")

	userApi, err := GESLogin(a.user.Username, a.user.Password)

	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to initialize the API part %v", err))
		STARTFINISH = -1
		return
	}

	a.api = userApi
	Log.Infos("API connection Initialized")
	year := GetCurrentYear()
	monday, saturday := GetWeekDates()

	// Global refresh needs the date and the year
	// Date are for the week to refresh the schedule
	// Year is to refresh the grades
	STARTFINISH = 1

	Log.Infos("Launching go routines")
	go a.runEveryXMinutes(ctx, 60, func() {
		// Votre tâche périodique ici
		msg, err := a.globalRefresh(fmt.Sprintf("%d", year), monday.Format("2006-01-02"), saturday.Format("2006-01-02"))
		//msg, err := a.globalRefresh("2024", "2024-09-23", "2024-09-28")
		if err != nil {
			Log.Error(fmt.Sprintf("Impossible to to a Global Refresh on Startup : %v", err))
			STARTFINISH = -1
			return
		}
		Log.Infos(msg)
	})

	go a.runEveryXMinutes(ctx, 7, func() {
		monday2 := monday.Format("2006-01-02")
		saturday2 := saturday.Format("2006-01-02")
		_, err := a.RefreshAgenda(&monday2, &saturday2)
		if err != nil {
			return
		}
	})
}

// -------------------------------------------------------------------------- //

func (a *App) Cleanup() {
	if a.db != nil {
		a.db.Close()
	}
}

// -------------------------------------------------------------------------- //

func (a *App) GetStartStatus() int {
	return STARTFINISH
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

/*func (a *App) GetPageContent(page string) (string, error) {
	page = strings.Split(page, ".html")[0]
	Log.Infos("frontend/" + page + ".html")
	content, err := os.ReadFile("frontend/" + page + ".html")
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to get the content of the page %d : %v", page, err))
		return "", err
	}
	return string(content), nil
}*/

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
				Url:   "https://github.com/Spatulox/AlternativMygesClient/releases",
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

func (a *App) GetCourses(year string) (string, error) {
	matched, err := regexp.MatchString(`^20\d{2}$`, year)
	if err != nil {
		Log.Error(fmt.Sprintf("erreur lors de la vérification du format de l'année: %v", err))
		return "", fmt.Errorf("erreur lors de la vérification du format de l'année: %v", err)
	}
	if !matched {
		Log.Error(fmt.Sprintf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", year))
		return "", fmt.Errorf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", year)
	}

	return a.api.GetCourses(year)
}
