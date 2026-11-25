package backend

import "testing"

func TestFormatVersion(t *testing.T) {
	cases := map[string]string{
		"":                              "dev",
		"dev":                           "dev",
		"v1.4.0_alpha":                  "1.4.0 (alpha)",
		"v1.4.0_beta":                   "1.4.0 (bêta)",
		"v1.4.0_rc":                     "1.4.0 (rc)",
		"v1.4.0_release":                "1.4.0",
		"v1.4.0":                        "1.4.0",
		"v1.3.2_beta-13-g6202d81":       "1.3.2 (bêta) + 13 commits (6202d81)",
		"v1.3.2_beta-1-g6202d81":        "1.3.2 (bêta) + 1 commit (6202d81)",
		"v1.4.0_release-dirty":          "1.4.0, modifications locales",
		"v1.3.2_beta-13-g6202d81-dirty": "1.3.2 (bêta) + 13 commits (6202d81), modifications locales",
		"beta_1.2":                      "beta_1.2",
		"  v1.4.0_beta\n":               "1.4.0 (bêta)",
	}
	for tag, want := range cases {
		if got := FormatVersion(tag); got != want {
			t.Errorf("FormatVersion(%q) = %q; want %q", tag, got, want)
		}
	}
}
