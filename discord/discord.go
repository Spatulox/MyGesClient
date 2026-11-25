// Package discord shows the activity of the app in the Discord status of the
// user (Discord Rich Presence), through the local IPC socket of the Discord
// client.
//
// Adapted from github.com/hugolgst/rich-go (MIT, see LICENSE), to find the
// socket of every Discord install: native, Flatpak or Snap on Linux, any user
// id, and discord-ipc-0 to discord-ipc-9 (several Discord clients).
package discord

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"sync"
)

// Activity is the status shown in Discord.
type Activity struct {
	Details    string // what the user is doing
	State      string
	LargeImage string // asset key of the large image
	LargeText  string // text shown when hovering the large image
	SmallImage string
	SmallText  string
	Buttons    []*Button // at most 2, open an URL
}

// Button is a clickable button of the activity.
type Button struct {
	Label string
	Url   string
}

// ErrNotFound is returned by Login when no Discord client is running.
var ErrNotFound = errors.New("aucun client Discord trouvé")

var (
	mu   sync.Mutex
	conn net.Conn // nil when logged out
)

// Login connects to the Discord client and identifies the app with
// clientID. It does nothing if already logged in.
func Login(clientID string) error {
	mu.Lock()
	defer mu.Unlock()
	if conn != nil {
		return nil
	}

	c, err := openSocket()
	if err != nil {
		return err
	}
	payload, err := json.Marshal(handshake{V: "1", ClientID: clientID})
	if err != nil {
		c.Close()
		return err
	}
	if err := send(c, opHandshake, payload); err != nil {
		c.Close()
		return fmt.Errorf("handshake Discord : %w", err)
	}
	conn = c
	return nil
}

// Logout closes the connection. Discord removes the activity of the app as
// soon as its connection is closed. It does nothing if not logged in.
func Logout() error {
	mu.Lock()
	defer mu.Unlock()
	return closeLocked()
}

// IsLoggedIn reports whether the app is connected to the Discord client.
func IsLoggedIn() bool {
	mu.Lock()
	defer mu.Unlock()
	return conn != nil
}

// SetActivity replaces the activity shown in Discord. It does nothing if not
// logged in. If Discord was closed, the connection is dropped (Login can be
// called again later).
func SetActivity(activity Activity) error {
	mu.Lock()
	defer mu.Unlock()
	if conn == nil {
		return nil
	}

	payload, err := json.Marshal(frame{
		Cmd:   "SET_ACTIVITY",
		Args:  args{Pid: os.Getpid(), Activity: mapActivity(activity)},
		Nonce: nonce(),
	})
	if err != nil {
		return err
	}
	if err := send(conn, opFrame, payload); err != nil {
		closeLocked()
		return fmt.Errorf("activité Discord : %w", err)
	}
	return nil
}

func closeLocked() error {
	if conn == nil {
		return nil
	}
	err := conn.Close()
	conn = nil
	return err
}

// nonce returns a random UUID v4, the identifier of a command
func nonce() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf) // never fails (crypto/rand)
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:])
}

// JSON payloads of the Discord IPC protocol

type handshake struct {
	V        string `json:"v"`
	ClientID string `json:"client_id"`
}

type frame struct {
	Cmd   string `json:"cmd"`
	Args  args   `json:"args"`
	Nonce string `json:"nonce"`
}

type args struct {
	Pid      int              `json:"pid"`
	Activity *payloadActivity `json:"activity"`
}

type payloadActivity struct {
	Details string           `json:"details,omitempty"`
	State   string           `json:"state,omitempty"`
	Assets  payloadAssets    `json:"assets,omitempty"`
	Buttons []*payloadButton `json:"buttons,omitempty"`
}

type payloadAssets struct {
	LargeImage string `json:"large_image,omitempty"`
	LargeText  string `json:"large_text,omitempty"`
	SmallImage string `json:"small_image,omitempty"`
	SmallText  string `json:"small_text,omitempty"`
}

type payloadButton struct {
	Label string `json:"label,omitempty"`
	Url   string `json:"url,omitempty"`
}

func mapActivity(a Activity) *payloadActivity {
	p := &payloadActivity{
		Details: a.Details,
		State:   a.State,
		Assets: payloadAssets{
			LargeImage: a.LargeImage,
			LargeText:  a.LargeText,
			SmallImage: a.SmallImage,
			SmallText:  a.SmallText,
		},
	}
	for _, b := range a.Buttons {
		p.Buttons = append(p.Buttons, &payloadButton{Label: b.Label, Url: b.Url})
	}
	return p
}
