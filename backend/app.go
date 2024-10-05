package backend

import (
	. "MyGesClient/db"
	"context"
	"database/sql"
	"fmt"
	"github.com/hugolgst/rich-go/client"
	_ "modernc.org/sqlite"
	"os"
	"path/filepath"
	"strings"
)

// App struct
type App struct {
	ctx context.Context
	db  *sql.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

func (a *App) CheckOpenDb() bool {
	if a.db == nil {
		println("ERROR : Not connected to DB")
		return false
	}

	if err := a.db.Ping(); err != nil {
		println("ERROR : Failed to ping DB")
		return false
	}

	return true
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	var err error
	a.db, err = InitDB()
	if err != nil {
		println("Failed to initialize database:", err)
		return
	}

	if err := a.db.Ping(); err != nil {
		println("Failed to ping database:", err)
		return
	}
}

func (a *App) Cleanup() {
	if a.db != nil {
		a.db.Close()
	}
}

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

func (a *App) GetPageContent(page string) (string, error) {
	page = strings.Split(page, ".html")[0]
	content, err := os.ReadFile("frontend/" + page + ".html")
	if err != nil {
		return "", err
	}
	return string(content), nil
}

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
