package api

import (
	. "MyGesClient/log"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const (
	authorizeURL = "https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app"
	httpTimeout  = 15 * time.Second
)

// apiBaseURL is a variable so tests can point it to a local server.
var apiBaseURL = "https://api.kordis.fr"

// ErrUnauthorized is returned when MyGes rejects the credentials or the token
// (expired / revoked), so callers can tell it apart from a network error.
var ErrUnauthorized = errors.New("MyGes : identifiants ou token invalides")

// httpClient is shared by every API call. Without a timeout, a server that
// never answers would block the refreshes forever.
var httpClient = &http.Client{Timeout: httpTimeout}

// loginClient does not follow redirects: the token is in the Location header.
var loginClient = &http.Client{
	Timeout: httpTimeout,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

type AccessToken struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   string `json:"expires_in"`
	Scope       string `json:"scope"`
	UID         string `json:"uid"`
}

type GESapi struct {
	token         *AccessToken
	requestConfig map[string]interface{}
}

// AgendaRoom représente une salle dans l'agenda
type agendaRoom struct {
	RoomID    int    `json:"room_id"`
	Name      string `json:"name"`
	Floor     string `json:"floor"`
	Campus    string `json:"campus"`
	Color     string `json:"color"`
	Latitude  string `json:"latitude"`
	Longitude string `json:"longitude"`
}

// AgendaDiscipline représente une discipline dans l'agenda
type agendaDiscipline struct {
	Coef             interface{} `json:"coef"`
	ECTS             interface{} `json:"ects"`
	Name             string      `json:"name"`
	Teacher          string      `json:"teacher"`
	Trimester        string      `json:"trimester"`
	Year             *int        `json:"year,omitempty"`
	HasDocuments     interface{} `json:"has_documents"`
	HasGrades        interface{} `json:"has_grades"`
	NbStudents       int         `json:"nb_students"`
	RcID             *int        `json:"rc_id,omitempty"`
	SchoolID         *int        `json:"school_id,omitempty"`
	StudentGroupID   *int        `json:"student_group_id,omitempty"`
	StudentGroupName string      `json:"student_group_name"`
	SyllabusID       interface{} `json:"syllabus_id"`
	TeacherID        int         `json:"teacher_id"`
	TrimesterID      *int        `json:"trimester_id,omitempty"`
}

// AgendaItem représente un élément de l'agenda
type agendaItem struct {
	ReservationID         int              `json:"reservation_id"`
	Rooms                 []agendaRoom     `json:"rooms"`
	Type                  string           `json:"type"`
	Modality              string           `json:"modality"`
	Author                int              `json:"author"`
	CreateDate            *int64           `json:"create_date,omitempty"`
	StartDate             int64            `json:"start_date"`
	EndDate               int64            `json:"end_date"`
	State                 string           `json:"state"`
	Comment               interface{}      `json:"comment"`
	Classes               interface{}      `json:"classes"`
	Name                  string           `json:"name"`
	Discipline            agendaDiscipline `json:"discipline"`
	Teacher               string           `json:"teacher"`
	Promotion             string           `json:"promotion"`
	PrestationType        int              `json:"prestation_type"`
	IsElectronicSignature bool             `json:"is_electronic_signature"`
}

func mapToStruct(m map[string]interface{}, v interface{}) error {
	jsonData, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(jsonData, v)
}

func convertToJSON(data map[string]interface{}) (string, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("erreur lors de la conversion en JSON : %w", err)
	}
	return string(jsonData), nil
}

// --------------------------------------------------------------------------------------- //

func GESLogin(username, password string) (*GESapi, error) {
	token, err := generateAccessToken(username, password)
	if err != nil {
		return nil, err
	}
	return &GESapi{token: token}, nil
}

func generateAccessToken(username string, password string) (*AccessToken, error) {
	credentials := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", username, password)))

	req, err := http.NewRequest("GET", authorizeURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Authorization", fmt.Sprintf("Basic %s", credentials))

	resp, err := loginClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("connexion à MyGes impossible : %w", err)
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return nil, fmt.Errorf("%w : mauvais nom d'utilisateur ou mot de passe", ErrUnauthorized)
	case resp.StatusCode != http.StatusFound:
		return nil, fmt.Errorf("réponse inattendue de MyGes lors de la connexion : %s", resp.Status)
	}

	location, err := url.Parse(resp.Header.Get("Location"))
	if err != nil || location.Fragment == "" {
		return nil, errors.New("token absent de la réponse de MyGes")
	}

	properties, err := url.ParseQuery(location.Fragment)
	if err != nil {
		return nil, fmt.Errorf("token MyGes illisible : %w", err)
	}
	if properties.Get("access_token") == "" {
		return nil, errors.New("token absent de la réponse de MyGes")
	}

	return &AccessToken{
		AccessToken: properties.Get("access_token"),
		TokenType:   properties.Get("token_type"),
		ExpiresIn:   properties.Get("expires_in"),
		Scope:       properties.Get("scope"),
		UID:         properties.Get("uid"),
	}, nil
}

// --------------------------------------------------------------------------------------- //

func (ges *GESapi) GetYears() (string, error) { return ges.getJSON("/me/years") }

func (ges *GESapi) GetProfile() (string, error) { return ges.getJSON("/me/profile") }

func (ges *GESapi) GetAbsences(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/absences", year))
}

func (ges *GESapi) GetGrades(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/grades", year))
}

func (ges *GESapi) GetCourses(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/courses", year))
}

func (ges *GESapi) GetProjects(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/projects", year))
}

func (ges *GESapi) GetProject(id int64) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/projects/%d", id))
}

func (ges *GESapi) GetNews() (string, error) { return ges.getJSON("/me/news") }

func (ges *GESapi) GetBanners() (string, error) { return ges.getJSON("/me/news/banners") }

func (ges *GESapi) GetNewsPage(page string) (string, error) {
	return ges.getJSON("/me/news?page=" + url.QueryEscape(page))
}

func (ges *GESapi) GetYearClasses(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/classes", year))
}

func (ges *GESapi) GetYearTeacher(year string) (string, error) {
	return ges.getJSON(fmt.Sprintf("/me/%s/teachers", year))
}

func (ges *GESapi) JoinProjectGroup(projectRcId int64, projectId int64, projectGroupId int64) (string, error) {
	return ges.doJSON("POST", projectGroupPath(projectRcId, projectId, projectGroupId))
}

func (ges *GESapi) QuitProjectGroup(projectRcId int64, projectId int64, projectGroupId int64) (string, error) {
	return ges.doJSON("DELETE", projectGroupPath(projectRcId, projectId, projectGroupId))
}

func projectGroupPath(projectRcId int64, projectId int64, projectGroupId int64) string {
	return fmt.Sprintf("/me/courses/%d/projects/%d/groups/%d", projectRcId, projectId, projectGroupId)
}

// GetAgenda returns the schedule between start and end, both formatted as
// "2006-01-02T15:04:05.000Z".
func (ges *GESapi) GetAgenda(start string, end string) (string, error) {
	const layout = "2006-01-02T15:04:05.000Z"

	startTime, err := time.Parse(layout, start)
	if err != nil {
		return "", fmt.Errorf("date de début invalide pour GetAgenda : %w", err)
	}
	endTime, err := time.Parse(layout, end)
	if err != nil {
		return "", fmt.Errorf("date de fin invalide pour GetAgenda : %w", err)
	}

	result, err := ges.request("GET", fmt.Sprintf("/me/agenda?start=%d&end=%d", startTime.UnixMilli(), endTime.UnixMilli()), nil)
	if err != nil {
		return "", err
	}

	agendaItems := []agendaItem{}
	if items, ok := result["items"].([]interface{}); ok {
		for _, item := range items {
			if agendaItemVar, ok := item.(map[string]interface{}); ok {
				var ai agendaItem
				if err := mapToStruct(agendaItemVar, &ai); err != nil {
					return "", fmt.Errorf("erreur lors de la conversion d'un élément de l'agenda: %w", err)
				}
				agendaItems = append(agendaItems, ai)
			}
		}
	}

	jsonData, err := json.Marshal(agendaItems)
	if err != nil {
		return "", fmt.Errorf("erreur lors de la conversion des éléments d'agenda en JSON: %w", err)
	}
	return string(jsonData), nil
}

// --------------------------------------------------------------------------------------- //

// getJSON performs a GET request and returns the "result" field as JSON.
func (ges *GESapi) getJSON(path string) (string, error) {
	return ges.doJSON("GET", path)
}

func (ges *GESapi) doJSON(method, path string) (string, error) {
	result, err := ges.request(method, path, nil)
	if err != nil {
		return "", err
	}
	return convertToJSON(result)
}

func (ges *GESapi) request(method, path string, requestConfig map[string]interface{}) (map[string]interface{}, error) {
	if ges == nil {
		return nil, errors.New("GESapi object is nil")
	}
	if ges.token == nil {
		return nil, errors.New("GESapi token is nil")
	}

	Log.Infos(fmt.Sprintf("Requesting %s API for %s", method, path))

	var body io.Reader
	if requestConfig != nil {
		if data, ok := requestConfig["data"]; ok {
			jsonData, err := json.Marshal(data)
			if err != nil {
				return nil, fmt.Errorf("error marshaling request data: %w", err)
			}
			body = bytes.NewBuffer(jsonData)
		}
	}

	req, err := http.NewRequest(method, apiBaseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("%s %s", ges.token.TokenType, ges.token.AccessToken))
	if requestConfig != nil {
		if headers, ok := requestConfig["headers"].(map[string]string); ok {
			for key, value := range headers {
				req.Header.Set(key, value)
			}
		}
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%s %s : %w", method, path, err)
	}
	defer resp.Body.Close()

	switch {
	case resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden:
		return nil, fmt.Errorf("%s %s : %w", method, path, ErrUnauthorized)
	case resp.StatusCode < 200 || resp.StatusCode >= 300:
		return nil, fmt.Errorf("%s %s : MyGes a répondu %s", method, path, resp.Status)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("%s %s : réponse illisible : %w", method, path, err)
	}
	Log.Infos(fmt.Sprintf("%s finished", path))

	switch resultData := result["result"].(type) {
	case []interface{}:
		return map[string]interface{}{"items": resultData}, nil
	case map[string]interface{}:
		return resultData, nil
	}
	return nil, fmt.Errorf("%s %s : pas de champ 'result' dans la réponse", method, path)
}
