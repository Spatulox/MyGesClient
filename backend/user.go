package backend

import (
	. "MyGesClient/api"
	. "MyGesClient/log"
	"database/sql"
	"errors"
	"fmt"
)
import . "MyGesClient/structures"
import . "MyGesClient/db"

// Function called by the front end
// ------------------------------------------------ //

/*
Verifie if the user exists on myges
*/
func (a *App) VerifyUser(username string, password string) (string, error) {

	// Check the api if this is the right informations
	userApi, err := GESLogin(username, password)

	if err != nil {
		Log.Error("Impossible to connect to Myges")
		return createErrorMessage("Impossible to connect to MyGes, bad username or password"), err
	}

	a.api = userApi

	// If correct infos
	// Create the local user
	user, err := CreateUser(a.db, username, password)
	if !user {
		Log.Error(fmt.Sprintf("Impossible to save your info in local DB : %v", err))
		return createErrorMessage("Impossible to save your info in local DB"), err
	}

	// Get the local user
	userLocal, err := GetUser(a.db)
	if err != nil {
		Log.Error(fmt.Sprintf("Impossible to get your local infos %v", err))
		return createErrorMessage("Impossible to get your local infos"), err
	}
	a.user = userLocal
	Log.Infos("Your datas have beed correctely saved")
	return createErrorMessage("Your datas have been correctely saved"), nil
}

func (a *App) GetUserData() (*UserSettings, error) {

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

// ------------------------------------------------ //

func (a *App) GetProfile() (string, error) {
	if FETCHINGPROFILE == 1 {
		return createErrorMessage("Waiting for the previous profile fetch to end"), errors.New("Waiting for the previous profile fetch to end")
	}
	FETCHINGPROFILE = 1
	defer func() { FETCHINGPROFILE = 0 }()
	Log.Infos("Refreshing Profile")

	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil for RefreshProfile")
	}

	return api.GetProfile() // Retourne le profil via GESapi
}

func (a *App) GetYears() (string, error) {
	api := a.api
	if api == nil {
		return createErrorMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	return api.GetYears()
}
