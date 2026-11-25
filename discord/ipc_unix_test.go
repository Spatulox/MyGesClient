//go:build !windows

package discord

import (
	"encoding/binary"
	"encoding/json"
	"io"
	"net"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestSocketPaths(t *testing.T) {
	env := map[string]string{"XDG_RUNTIME_DIR": "/run/user/1234", "TMPDIR": "/var/tmp/"}
	existing := map[string]bool{
		"/run/user/1234/snap.discord/discord-ipc-0":                            true,
		"/run/user/1234/.flatpak/com.discordapp.Discord/xdg-run/discord-ipc-0": true,
		"/run/user/1234/discord-ipc-1":                                         true,
		"/var/tmp/discord-ipc-0":                                               true,
		"/run/user/1000/discord-ipc-0":                                         true, // another user
	}

	got := socketPaths(func(k string) string { return env[k] }, 1234, func(p string) bool { return existing[p] })
	want := []string{
		"/run/user/1234/.flatpak/com.discordapp.Discord/xdg-run/discord-ipc-0",
		"/run/user/1234/snap.discord/discord-ipc-0",
		"/var/tmp/discord-ipc-0",
		"/run/user/1234/discord-ipc-1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("socketPaths() =\n%v\nwant\n%v", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
}

func TestSocketPathsWithoutXDGRuntimeDir(t *testing.T) {
	var tried []string
	socketPaths(func(string) string { return "" }, 1001, func(p string) bool {
		tried = append(tried, p)
		return false
	})
	if tried[0] != "/run/user/1001/discord-ipc-0" {
		t.Fatalf("first path tried = %s; want /run/user/1001/discord-ipc-0", tried[0])
	}
	for _, p := range tried {
		if strings.Contains(p, "/run/user/1000/") {
			t.Fatalf("path of another user tried: %s", p)
		}
	}
}

// fakeDiscord accepts one connection and records the messages it receives,
// answering each of them like Discord (a DISPATCH frame).
func fakeDiscord(t *testing.T, path string) <-chan []string {
	t.Helper()
	ln, err := net.Listen("unix", path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })

	received := make(chan []string, 1)
	go func() {
		var msgs []string
		defer func() { received <- msgs }()
		c, err := ln.Accept()
		if err != nil {
			return
		}
		defer c.Close()
		for {
			var header [2]int32
			if err := binary.Read(c, binary.LittleEndian, &header); err != nil {
				return // closed by Logout
			}
			body := make([]byte, header[1])
			if _, err := io.ReadFull(c, body); err != nil {
				return
			}
			msgs = append(msgs, string(body))
			answer := []byte(`{"cmd":"DISPATCH","evt":"READY"}`)
			binary.Write(c, binary.LittleEndian, [2]int32{opFrame, int32(len(answer))})
			c.Write(answer)
		}
	}()
	return received
}

func TestLoginSetActivityLogout(t *testing.T) {
	dir, err := os.MkdirTemp("", "dipc") // short path: unix socket paths are limited to ~100 bytes
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(dir) })
	t.Setenv("XDG_RUNTIME_DIR", dir)
	received := fakeDiscord(t, filepath.Join(dir, "discord-ipc-0"))

	if IsLoggedIn() {
		t.Fatal("logged in before Login")
	}
	if err := Login("42"); err != nil {
		t.Fatal(err)
	}
	if !IsLoggedIn() {
		t.Fatal("not logged in after Login")
	}
	if err := SetActivity(Activity{Details: "MyGes", State: "Notes"}); err != nil {
		t.Fatal(err)
	}
	if err := Logout(); err != nil {
		t.Fatal(err)
	}
	if IsLoggedIn() {
		t.Fatal("still logged in after Logout")
	}
	if err := SetActivity(Activity{State: "ignored"}); err != nil {
		t.Fatalf("SetActivity() after Logout = %v; want nil", err)
	}
	if err := Logout(); err != nil {
		t.Fatalf("second Logout() = %v", err)
	}

	msgs := <-received
	if len(msgs) != 2 {
		t.Fatalf("received %d messages; want handshake + activity: %v", len(msgs), msgs)
	}
	var hs handshake
	if err := json.Unmarshal([]byte(msgs[0]), &hs); err != nil || hs.ClientID != "42" {
		t.Fatalf("handshake = %s", msgs[0])
	}
	var f frame
	if err := json.Unmarshal([]byte(msgs[1]), &f); err != nil || f.Cmd != "SET_ACTIVITY" || f.Args.Activity.State != "Notes" {
		t.Fatalf("activity frame = %s", msgs[1])
	}
}

func TestLoginWithoutDiscord(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_RUNTIME_DIR", dir)
	t.Setenv("TMPDIR", dir)
	t.Setenv("TMP", dir)
	t.Setenv("TEMP", dir)
	if len(socketCandidates()) > 0 {
		t.Skip("a Discord client is running on this machine")
	}
	if err := Login("42"); err != ErrNotFound {
		t.Fatalf("Login() = %v; want ErrNotFound", err)
	}
}
