package backend

import (
	"slices"
	"testing"
)

func TestParseYearsMostRecentFirst(t *testing.T) {
	years, err := parseYears(`{"items":[2023,2025,2024,2025]}`)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(years, []string{"2025", "2024", "2023"}) {
		t.Fatalf("years = %v", years)
	}
	if _, err := parseYears(`{"items":[]}`); err == nil {
		t.Fatal("expected an error without years")
	}
}

func TestResolveYear(t *testing.T) {
	a := &App{}
	a.setYear("2025")

	// Before MyGes listed the years (offline): any well formed year
	for year, want := range map[string]string{"": "2025", "2025": "2025", "2023": "2023"} {
		if got, err := a.resolveYear(year); err != nil || got != want {
			t.Errorf("resolveYear(%q) = %q, %v; want %q", year, got, err, want)
		}
	}
	for _, bad := range []string{"2025-2026", "25", "1970", "../2025"} {
		if _, err := a.resolveYear(bad); err == nil {
			t.Errorf("resolveYear(%q) accepted", bad)
		}
	}

	a.setKnownYears([]string{"2025", "2024"})
	if got, err := a.resolveYear("2024"); err != nil || got != "2024" {
		t.Errorf("resolveYear(2024) = %q, %v", got, err)
	}
	if _, err := a.resolveYear("2023"); err == nil {
		t.Error("resolveYear(2023) accepted a year MyGes did not list")
	}

	// The current year is returned as is, even while still undefined
	a.setYear("1970")
	if got, err := a.resolveYear(""); err != nil || got != "1970" {
		t.Errorf("resolveYear(\"\") = %q, %v; want the current year unchanged", got, err)
	}
}
