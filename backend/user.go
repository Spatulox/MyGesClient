package backend

import (
	. "MyGesClient/api"
	"database/sql"
	"fmt"
)
import . "MyGesClient/structures"
import . "MyGesClient/db"

// Function called by the front end
// ------------------------------------------------ //

func (a *App) VerifyUser(username string, password string) (string, error) {

	// Check the api if this is the right informations
	userApi, err := GESLogin(username, password)

	if err != nil {
		println("Impossible to connect to MyGes")
		return createErrorMessage("Impossible to connect to MyGes, bad username or password"), err
	}

	a.api = userApi

	// If correct infos
	// Create the local user
	user, err := CreateUser(a.db, username, password)
	if !user {
		println("Impossible to save your info in local DB")
		println(err)
		return createErrorMessage("Impossible to save your info in local DB"), err
	}

	// Get the local user
	userLocal, err := GetUser(a.db)
	if err != nil {
		println("Impossible to get your local infos")
		return createErrorMessage("Impossible to get your local infos"), err
	}
	a.user = userLocal

	return createErrorMessage("Your datas have been correctely saved"), nil
}

func (a *App) CreateUser(username string, password string) (*UserSettings, error) {

	user, err := GetUser(a.db)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (a *App) UpdateUserEula() (bool, error) {

	_, err := UpdateUserEula(a.db)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (a *App) UpdateUserTheme(value string) (bool, error) {
	_, err := UpdateUserTheme(a.db, value)
	if err != nil {
		return false, err
	}
	return true, nil
}
