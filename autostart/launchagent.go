package autostart

import (
	"bytes"
	"encoding/xml"
	"fmt"
)

// launchAgentLabel identifies the service for launchd (macOS).
const launchAgentLabel = "io.github.spatulox.MyGesClient.service"

// launchAgentPlist returns the LaunchAgent that starts the background service
// with the session of the user (macOS). Kept out of autostart_darwin.go so
// that it is tested on every OS.
//
//   - RunAtLoad: started when launchd loads it, i.e. at login;
//   - KeepAlive false: not restarted when it exits (the option was turned
//     off in the GUI);
//   - LimitLoadToSessionType Aqua: only in a graphical session, where the
//     notifications can be shown.
func launchAgentPlist(exePath string) string {
	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>%s</string>
	<key>ProgramArguments</key>
	<array>
		<string>%s</string>
		<string>%s</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<false/>
	<key>ProcessType</key>
	<string>Background</string>
	<key>LimitLoadToSessionType</key>
	<string>Aqua</string>
</dict>
</plist>
`, xmlEscape(launchAgentLabel), xmlEscape(exePath), xmlEscape(ServiceFlag))
}

func xmlEscape(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s)) // never fails on a bytes.Buffer
	return b.String()
}
