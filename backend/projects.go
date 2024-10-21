package backend

func (a *App) GetProjects(year string) (string, error) {
	return a.api.GetProjects(year)
}

func (a *App) GetProjectById(id int64) (string, error) {
	return a.api.GetProject(id)
}
