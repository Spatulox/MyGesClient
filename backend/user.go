package backend

import "database/sql"
import . "MyGesClient/structures"
import . "MyGesClient/db"

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
