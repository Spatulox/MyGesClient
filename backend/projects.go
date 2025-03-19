package backend

import "fmt"

func (a *App) GetProjects() (string, error) {
	return a.api.GetProjects(a.year)
}

func (a *App) GetProjectById(id int64) (string, error) {
	return a.api.GetProject(id)
}

func (a *App) QuitProjectGroup(rc_id int64, project_id int64, group_id int64) (bool, error) {
	_, err := a.api.QuitProjectGroup(rc_id, project_id, group_id)
	if err != nil {
		return false, fmt.Errorf("Error when leaving group")
	}
	return true, nil
}

func (a *App) JoinProjectGroup(rc_id int64, project_id int64, group_id int64) (bool, error) {
	_, err := a.api.JoinProjectGroup(rc_id, project_id, group_id)
	if err != nil {
		return false, fmt.Errorf("%v", err)
	}

	return true, nil
}
