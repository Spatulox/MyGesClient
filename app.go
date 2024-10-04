package main

import (
	. "MyGesClient/db"
	"context"
	"database/sql"
	_ "modernc.org/sqlite"
	"os"
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

func (a *App) startup(ctx context.Context) {
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

func (a *App) GetPageContent(page string) (string, error) {
	content, err := os.ReadFile("frontend/" + page)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func (a *App) GetUserData() (*UserSettings, error) {

	/*if !a.CheckOpenDb() {
		return nil, errors.New("Impossible")
	}*/

	user, err := GetUser(a.db)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Pas d'utilisateur trouvé
		}
		return nil, err // Autre erreur
	}
	return &user, nil
}
