package backend

import (
	. "MyGesClient/db"
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strconv"
)

// A school year is named by the calendar year it starts in, as MyGes does in
// /me/years and /me/{year}/...: "2025" is 2025-2026.
var yearFormat = regexp.MustCompile(`^20\d{2}$`)

// parseYears reads the /me/years response ({"items":[2025,2024]}) and returns
// the years, most recent first, without duplicates.
func parseYears(jsonData string) ([]string, error) {
	var response struct {
		Items []int `json:"items"`
	}
	if err := json.Unmarshal([]byte(jsonData), &response); err != nil {
		return nil, err
	}
	if len(response.Items) == 0 {
		return nil, fmt.Errorf("no years found in the data")
	}

	ints := slices.Clone(response.Items)
	slices.Sort(ints)
	ints = slices.Compact(ints)
	slices.Reverse(ints)

	years := make([]string, len(ints))
	for i, year := range ints {
		years[i] = strconv.Itoa(year)
	}
	return years, nil
}

func (a *App) getKnownYears() []string {
	a.yearMutex.RLock()
	defer a.yearMutex.RUnlock()
	return slices.Clone(a.years)
}

func (a *App) setKnownYears(years []string) {
	a.yearMutex.Lock()
	defer a.yearMutex.Unlock()
	a.years = slices.Clone(years)
}

// resolveYear returns the school year to use for a request. "" means the
// current year, returned as is (unchecked, as before the year selector: it may
// still be "" or the "1970" default while offline). Any other year must be
// well formed and, when MyGes listed the years of the student, one of them:
// another year is refused without calling MyGes (it may answer 403, which the
// API layer reports as invalid credentials).
func (a *App) resolveYear(year string) (string, error) {
	current := a.getYear()
	if year == "" || year == current {
		return current, nil
	}
	if !yearFormat.MatchString(year) {
		return "", fmt.Errorf("format d'année invalide: %s. Le format attendu est YYYY (ex: 2024)", year)
	}
	if known := a.getKnownYears(); len(known) > 0 && !slices.Contains(known, year) {
		return "", fmt.Errorf("année %s inconnue de MyGes pour cet étudiant", year)
	}
	return year, nil
}

// GetCurrentYear returns the current school year ("2025" for 2025-2026): the
// most recent year listed by MyGes, or the last one known locally when offline.
func (a *App) GetCurrentYear() string {
	return a.getYear()
}

// GetSchoolYears returns the school years the student can browse, most recent
// first ("2025" for 2025-2026). They come from MyGes (/me/years, read at
// login and every hour). Offline, they are the years cached locally, plus the
// current year.
func (a *App) GetSchoolYears() ([]string, error) {
	if years := a.getKnownYears(); len(years) > 0 {
		return years, nil
	}

	a.dbWg.Add(1)
	a.dbMutex.Lock()
	defer a.dbMutex.Unlock()
	defer a.dbWg.Done()

	user, err := GetUser(a.db)
	if err != nil {
		return nil, fmt.Errorf("récupération de l'utilisateur : %w", err)
	}
	years, err := GetDBUserYears(a.db, user.ID)
	if err != nil {
		return nil, err
	}
	if current := a.getYear(); yearFormat.MatchString(current) && !slices.Contains(years, current) {
		years = append(years, current)
		slices.Sort(years)
		slices.Reverse(years)
	}
	return years, nil
}
