package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func testAPI(t *testing.T, handler http.HandlerFunc) *GESapi {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	old := apiBaseURL
	apiBaseURL = server.URL
	t.Cleanup(func() { apiBaseURL = old })
	return &GESapi{token: &AccessToken{AccessToken: "t", TokenType: "bearer"}}
}

func TestRequestReportsUnauthorized(t *testing.T) {
	ges := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"invalid_token"}`))
	})
	_, err := ges.GetGrades("2025")
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("err = %v, want ErrUnauthorized", err)
	}
}

func TestRequestReportsServerError(t *testing.T) {
	ges := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})
	if _, err := ges.GetYears(); err == nil {
		t.Fatal("expected an error on HTTP 500")
	}
}

func TestGetJSONReturnsResult(t *testing.T) {
	ges := testAPI(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/me/2025/grades" {
			t.Errorf("path = %s", r.URL.Path)
		}
		w.Write([]byte(`{"result":[{"course":"Go"}]}`))
	})
	got, err := ges.GetGrades("2025")
	if err != nil {
		t.Fatal(err)
	}
	if got != `{"items":[{"course":"Go"}]}` {
		t.Fatalf("got %s", got)
	}
}

func TestGetAgendaRejectsBadDateWithoutExiting(t *testing.T) {
	ges := &GESapi{token: &AccessToken{}}
	if _, err := ges.GetAgenda("2025-01-01", "2025-01-07"); err == nil {
		t.Fatal("expected an error for a malformed date")
	}
}
