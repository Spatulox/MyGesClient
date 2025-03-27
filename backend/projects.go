package backend

import "fmt"

func (a *App) GetProjects() (string, error) {
	api := a.getAPI()
	return api.GetProjects(a.year)
}

func (a *App) GetProjectById(id int64) (string, error) {
	api := a.getAPI()
	return api.GetProject(id)
}

func (a *App) QuitProjectGroup(rc_id int64, project_id int64, group_id int64) (bool, error) {
	api := a.getAPI()
	_, err := api.QuitProjectGroup(rc_id, project_id, group_id)
	if err != nil {
		return false, fmt.Errorf("Error when leaving group")
	}
	return true, nil
}

func (a *App) JoinProjectGroup(rc_id int64, project_id int64, group_id int64) (bool, error) {
	api := a.getAPI()
	_, err := api.JoinProjectGroup(rc_id, project_id, group_id)
	if err != nil {
		return false, fmt.Errorf("%v", err)
	}

	return true, nil
}
