package backend

import (
	. "MyGesClient/api"
	. "MyGesClient/log"
	. "MyGesClient/time"
	"database/sql"
	"errors"
	"fmt"

	. "MyGesClient/structures"

	. "MyGesClient/db"
)

// Function called by the front end
// ------------------------------------------------ //

/*
Verifie if the user exists on myges
*/
func (a *App) VerifyUser(username string, password string) (string, error) {

	Log.Debug(fmt.Sprintf("VerifyUser"))
	// Check the api if this is the right informations
	/*userApi, err := GESLogin(username, password)

	if err != nil {
		Log.Error("Impossible to connect to Myges")
		return createMessage("Impossible to connect to MyGes, bad username or password"), err
	}*/

	err := a.initUser()
	if err != nil {
		Log.Error(fmt.Sprintf("Wrong username or password: %v", err))
		return "", fmt.Errorf("Wrong username or password: %v", err)
	}

	// If correct infos
	// Create the local user
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	a.dbWg.Add(1)
	defer a.dbWg.Done()

	Log.Debug(fmt.Sprintf("CheckUserExist"))
	res, err := CheckUserExist(a.db, username)
	if err != nil {
		Log.Error(fmt.Sprintf("User already exist : %v", err))
		return "", err
	}

	if res == true {
		return "", fmt.Errorf("L'utilisateur existe déjà, impossible de créer un compte")
	}

	Log.Debug(fmt.Sprintf("CreateUser"))
	user, err := CreateUser(a.db, username, password)
	if !user {
		Log.Error(fmt.Sprintf("Impossible to save your info in local DB : %v", err))
		return createMessage("Impossible to save your info in local DB"), err
	}

	Log.Debug(fmt.Sprintf("InitPart()"))

	errour := 0
	if err := a.initAPI(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrAPIInit
	}

	if err := a.initYear(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrYearsRequest
	}

	if errour != 0 {
		a.stopInitIfInternetFunc()
		a.initIfInternet()
	}

	Log.Infos("Your datas have beed correctely saved")

	// Doing a GlobalRefresh to hav data stored
	//year := GetCurrentYear()
	monday, saturday := GetWeekDates()
	refresh, err := a.globalRefresh(fmt.Sprintf("%d", a.year), monday.Format("2006-01-02"), saturday.Format("2006-01-02"))
	//refresh, err := a.globalRefresh("2024", "2024-09-23", "2024-09-28")
	if err != nil {
		return createMessage("Error when fetching your datas :/"), err
	}
	println(refresh)

	return createMessage("Your datas have been correctely saved"), nil
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

	if a.getAPI() == nil {
		return createMessage("Internal error"), fmt.Errorf("Impossible to retrieve your profile no internet connexion")
	}

	a.profileMutex.Lock()
	if a.isFetchingProfile {
		a.profileMutex.Unlock()
		return createMessage("Waiting for the previous profile fetch to end"), errors.New("profile fetch already in progress")
	}
	a.isFetchingProfile = true
	a.profileMutex.Unlock()

	defer func() {
		a.profileMutex.Lock()
		a.isFetchingProfile = false
		a.profileMutex.Unlock()
	}()

	Log.Infos("Refreshing Profile")
	api := a.getAPI()
	return api.GetProfile()
}

func (a *App) GetYears() (string, error) {
	api := a.getAPI()
	if api == nil {
		return createMessage("Internal error"), fmt.Errorf("GESapi instance is nil")
	}
	return api.GetYears()
}

func (a *App) DeconnectUser() error {
	a.deleteAPI()
	a.deleteAPIUser()
	return DeconnectUser(a.db)
}

// Update the local password, but check the new right password in myges
func (a *App) UpdateUserPassword(username string, password string) (bool, error) {

	// A.initUser() init the user from the DB, not from the api
	// Check the api if this is the right informations
	userApi, err := GESLogin(username, password)

	if err != nil {
		Log.Error("Impossible to connect to Myges")
		return false, fmt.Errorf("Impossible to connect to MyGes, bad username or password")
	}

	a.setAPI(userApi)
	boolean, err := UpdateUserPassword(a.db, username, password)

	user, err2 := GetUser(a.db)
	if err2 != nil {
		return false, err2
	}

	a.setAPIUser(user)

	return boolean, err
}

func (a *App) GetRegisteredUsers() ([]UserSettings, error) {
	return GetRegisteredUsers(a.db)
}

func (a *App) ConnectUser(username string, password string) (UserSettings, error) {

	if ConnectUser(a.db, username, password) {
		a.initUser()
		/*user, err := GetUser(a.db)
		if err != nil {
			Log.Error(fmt.Sprintf("Impossible to select the user : %v", err))
			return UserSettings{}, fmt.Errorf("This user don't exist : %v", err)
		}
		a.setAPIUser(user)
		return user, nil*/
	} else {
		Log.Error("Impossible to connect, make sure the account exist and username and password are correct")
		return UserSettings{}, fmt.Errorf("Impossible to connect, make sure the account exist and username and password are correct")
	}

	errour := 0
	if err := a.initAPI(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrAPIInit
	}

	if err := a.initYear(); err != nil {
		a.handleStartupError("API initialization", err)
		errour += ErrYearsRequest
	}

	if errour != 0 {
		a.stopInitIfInternetFunc()
		a.initIfInternet()
	}

	return a.getAPIUser(), nil
}

func (a *App) DeleteOldData() bool {
	Log.Debug("Deleting !!!")
	return DeleteOldData(a.db)
}
