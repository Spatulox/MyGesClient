package db

import (
	"database/sql"
	"fmt"
	_ "github.com/mattn/go-sqlite3"
	_ "modernc.org/sqlite"
	"os"
)

type UserSettings struct {
	ID       int64
	Username string
	Password string
	Theme    string
	EULA     bool
}

func InitDB() (*sql.DB, error) {
	cwd, err := os.Getwd()

	println("Current working directory:", cwd)
	db, err := sql.Open("sqlite3", "./db.sqlite")
	if err != nil {
		fmt.Printf("Error opening database: %v\n", err)
		return nil, err
	}
	return db, nil
}

func GetUser(db *sql.DB) (UserSettings, error) {
	var user UserSettings
	query := `SELECT id, username, password, theme, eula FROM USER LIMIT 1`
	err := db.QueryRow(query).Scan(&user.ID, &user.Username, &user.Password, &user.Theme, &user.EULA)
	if err != nil {
		return UserSettings{}, err
	}
	return user, nil
}
