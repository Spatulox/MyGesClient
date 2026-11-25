package autostart

import (
	"encoding/xml"
	"strings"
	"testing"
)

// plistDoc is the subset of a plist read back by the test: the keys and
// values of the top level dict, in order.
type plistDoc struct {
	Dict struct {
		Items []struct {
			XMLName xml.Name
			Value   string   `xml:",chardata"`
			Strings []string `xml:"string"`
		} `xml:",any"`
	} `xml:"dict"`
}

func parsePlist(t *testing.T, content string) map[string][]string {
	t.Helper()
	var doc plistDoc
	dec := xml.NewDecoder(strings.NewReader(content))
	dec.Strict = true
	if err := dec.Decode(&doc); err != nil {
		t.Fatalf("invalid plist: %v\n%s", err, content)
	}

	values := map[string][]string{}
	var key string
	for _, item := range doc.Dict.Items {
		switch item.XMLName.Local {
		case "key":
			key = item.Value
		case "string":
			values[key] = []string{item.Value}
		case "array":
			values[key] = item.Strings
		case "true", "false":
			values[key] = []string{item.XMLName.Local}
		}
	}
	return values
}

func TestLaunchAgentPlist(t *testing.T) {
	for _, exe := range []string{
		"/Applications/MyGesClient.app/Contents/MacOS/MyGesClient",
		"/Users/a b/Apps/R&D <test>/MyGesClient.app/Contents/MacOS/MyGesClient",
	} {
		values := parsePlist(t, launchAgentPlist(exe))

		if got := values["Label"]; len(got) != 1 || got[0] != launchAgentLabel {
			t.Errorf("Label = %v", got)
		}
		if got := values["ProgramArguments"]; len(got) != 2 || got[0] != exe || got[1] != ServiceFlag {
			t.Errorf("ProgramArguments = %q; want [%q %q]", got, exe, ServiceFlag)
		}
		for key, want := range map[string]string{
			"RunAtLoad":              "true",
			"KeepAlive":              "false",
			"ProcessType":            "Background",
			"LimitLoadToSessionType": "Aqua",
		} {
			if got := values[key]; len(got) != 1 || got[0] != want {
				t.Errorf("%s = %v; want %s", key, got, want)
			}
		}
	}
}
