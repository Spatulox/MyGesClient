package api

import (
	. "MyGesClient/log"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

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

const errMessage = "{'message':'Impossible to create a JSON with the result'}"

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
		return errMessage, fmt.Errorf("erreur lors de la conversion en JSON: %w", err)
	}
	return string(jsonData), nil
}

// --------------------------------------------------------------------------------------- //

func GESLogin(username, password string) (*GESapi, error) {
	token, err := generateAccessToken(username, password)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	if token == nil {
		fmt.Println("Something went wrong")
		return nil, fmt.Errorf("Credential is nil")
	}
	return &GESapi{token: token}, nil
}

func generateAccessToken(username string, password string) (*AccessToken, error) {

	credentials := base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", username, password)))

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest("GET", "https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Add("Authorization", fmt.Sprintf("Basic %s", credentials))

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		return nil, errors.New("Bad username or password")
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return nil, errors.New("Location header not found")
	}

	hashIndex := strings.Index(location, "#")
	if hashIndex == -1 {
		return nil, errors.New("Hash not found in location")
	}

	hash := location[hashIndex+1:]
	properties := make(map[string]string)

	for _, property := range strings.Split(hash, "&") {
		parts := strings.SplitN(property, "=", 2)
		if len(parts) == 2 {
			properties[parts[0]] = parts[1]
		}
	}

	return &AccessToken{
		AccessToken: properties["access_token"],
		TokenType:   properties["token_type"],
		ExpiresIn:   properties["expires_in"],
		Scope:       properties["scope"],
		UID:         properties["uid"],
	}, nil
}

// --------------------------------------------------------------------------------------- //

func (ges *GESapi) GetYears() (string, error) {
	url := "/me/years"
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetProfile() (string, error) {
	url := "/me/profile"
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetAgenda(start string, end string) (string, error) {

	layout := "2006-01-02T15:04:05.000Z"

	// Parser les chaînes en time.Time
	startTime, err := time.Parse(layout, start)
	if err != nil {
		log.Fatalf("Erreur lors du parsing de la date de début GetAgenda: %v", err)
		return "", err
	}

	endTime, err := time.Parse(layout, end)
	if err != nil {
		log.Fatalf("Erreur lors du parsing de la date de fin GetAgenda: %v", err)
		return "", err
	}

	// Convertir les time.Time en millisecondes Unix
	startMs := startTime.UnixMilli()
	endMs := endTime.UnixMilli()

	url := fmt.Sprintf("/me/agenda?start=%d&end=%d", startMs, endMs)

	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		//println("ERROR : Impossible to fetch agenda")
		return "", err
	}

	// Convertir le résultat en []AgendaItem
	var agendaItems []agendaItem
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

	// Convertir le slice d'AgendaItem en JSON
	jsonData, err := json.Marshal(agendaItems)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return "", fmt.Errorf("erreur lors de la conversion des éléments d'agenda en JSON: %w", err)
	}

	return string(jsonData), nil
}

func (ges *GESapi) GetAbsences(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/absences", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetGrades(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/grades", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetCourses(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/courses", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetProjects(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/projects", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetProject(id int64) (string, error) {
	url := fmt.Sprintf("/me/projects/%d", id)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetNews() (string, error) {
	url := "/me/news"
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetBanners() (string, error) {
	url := "/me/news/banners"
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetNewsPage(page string) (string, error) {
	url := fmt.Sprintf("/me/news?page=%s", page)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetYearClasses(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/classes", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) GetYearTeacher(year string) (string, error) {
	url := fmt.Sprintf("/me/%s/teachers", year)
	result, err := ges.get(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) JoinProjectGroup(projectRcId int64, projectId int64, projectGroupId int64) (string, error) {
	url := fmt.Sprintf("/me/courses/%d/projects/%d/groups/%d", projectRcId, projectId, projectGroupId)
	result, err := ges.post(url, nil)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

func (ges *GESapi) QuitProjectGroup(projectRcId int64, projectId int64, projectGroupId int64) (string, error) {
	url := fmt.Sprintf("/me/courses/%d/projects/%d/groups/%d", projectRcId, projectId, projectGroupId)
	result, err := ges.delete(url)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
		return errMessage, err
	}
	return convertToJSON(result)
}

// --------------------------------------------------------------------------------------- //

func (ges *GESapi) get(url string) (map[string]interface{}, error) {
	Log.Infos(fmt.Sprintf("Requesting GET API for %s", url))
	result, err := ges.request("GET", url, nil)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
	}
	Log.Infos(fmt.Sprintf("%s finished", url))
	return result, nil
}

func (ges *GESapi) post(url string, requestConfig map[string]interface{}) (map[string]interface{}, error) {
	Log.Infos(fmt.Sprintf("Requesting POST API for %s", url))
	result, err := ges.request("POST", url, requestConfig)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
	}
	Log.Infos(fmt.Sprintf("%s finished", url))
	return result, nil //ges.request("POST", url, requestConfig)
}

func (ges *GESapi) put(url string, requestConfig map[string]interface{}) (map[string]interface{}, error) {
	//return ges.request("PUT", url, requestConfig)
	Log.Infos(fmt.Sprintf("Requesting PUT API for %s", url))
	result, err := ges.request("PUT", url, requestConfig)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
	}
	Log.Infos(fmt.Sprintf("%s finished", url))
	return result, nil
}

func (ges *GESapi) delete(url string) (map[string]interface{}, error) {
	//return ges.request("DELETE", url, nil)
	Log.Infos(fmt.Sprintf("Requesting DELETE API for %s", url))
	result, err := ges.request("DELETE", url, nil)
	if err != nil {
		fmt.Printf("Stack trace:\n%+v\n", err)
	}
	Log.Infos(fmt.Sprintf("%s finished", url))
	return result, nil
}

func (ges *GESapi) request(method, url string, requestConfig map[string]interface{}) (map[string]interface{}, error) {
	client := &http.Client{}
	if ges == nil {
		return nil, errors.New("GESapi object is nil")
	}
	if ges.token == nil {
		return nil, errors.New("GESapi token is nil")
	}

	fullURL := fmt.Sprintf("https://api.kordis.fr%s", url)

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
	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set default headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("%s %s", ges.token.TokenType, ges.token.AccessToken))

	// Add custom headers from requestConfig
	if requestConfig != nil {
		if headers, ok := requestConfig["headers"].(map[string]string); ok {
			for key, value := range headers {
				req.Header.Set(key, value)
			}
		}
	}

	fmt.Printf("Sending request to: %s\n", fullURL)
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error sending request: %v\n", err)
		return nil, fmt.Errorf("error sending request: %w", err)
	}
	fmt.Printf("Response received. Status: %s\n", resp.Status)
	defer resp.Body.Close()

	var result map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		fmt.Printf("Error decoding JSON: %v\n", err)
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	// Getting result field
	if resultData, ok := result["result"].([]interface{}); ok {
		return map[string]interface{}{"items": resultData}, nil
	}

	if resultData, ok := result["result"].(map[string]interface{}); ok {
		return resultData, nil
	}

	return nil, fmt.Errorf("no 'result' field in response or it's not a map")
}
