package credentials

import (
	. "MyGesClient/db"
	"database/sql"
	"errors"
	"path/filepath"
	"testing"

	"github.com/zalando/go-keyring"
)

// fakeKeyring is an in-memory keyring. When err is set, it behaves like an
// unreachable keyring (no Secret Service, locked keyring...).
type fakeKeyring struct {
	secrets map[string]string
	err     error
}

func newFakeKeyring() *fakeKeyring { return &fakeKeyring{secrets: map[string]string{}} }

func (k *fakeKeyring) Get(service, user string) (string, error) {
	if k.err != nil {
		return "", k.err
	}
	pw, ok := k.secrets[service+"/"+user]
	if !ok {
		return "", keyring.ErrNotFound
	}
	return pw, nil
}

func (k *fakeKeyring) Set(service, user, password string) error {
	if k.err != nil {
		return k.err
	}
	k.secrets[service+"/"+user] = password
	return nil
}

func (k *fakeKeyring) Delete(service, user string) error {
	if k.err != nil {
		return k.err
	}
	if _, ok := k.secrets[service+"/"+user]; !ok {
		return keyring.ErrNotFound
	}
	delete(k.secrets, service+"/"+user)
	return nil
}

var errNoSecretService = errors.New("org.freedesktop.secrets was not provided by any .service files")

func newTestDB(t *testing.T, users ...string) *sql.DB {
	t.Helper()
	db, err := OpenDB(filepath.Join(t.TempDir(), "test.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	for _, u := range users {
		if ok, err := CreateUser(db, u); !ok || err != nil {
			t.Fatalf("CreateUser(%s) = %v, %v", u, ok, err)
		}
	}
	return db
}

func storedPassword(t *testing.T, db *sql.DB, user string) string {
	t.Helper()
	pw, err := GetStoredPassword(db, user)
	if err != nil {
		t.Fatal(err)
	}
	return pw
}

func TestPasswordGoesToTheKeyring(t *testing.T) {
	db := newTestDB(t, "alice")
	kr := newFakeKeyring()
	s := NewWithKeyring(db, kr)

	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if pw := storedPassword(t, db, "alice"); pw != "" {
		t.Fatalf("password stored in the DB (%q) although the keyring is available", pw)
	}
	if kr.secrets[Service+"/alice"] != "secret" {
		t.Fatalf("password not in the keyring: %v", kr.secrets)
	}
	if pw, err := s.GetPassword("alice"); err != nil || pw != "secret" {
		t.Fatalf("GetPassword() = %q, %v; want secret", pw, err)
	}
}

func TestPasswordMissing(t *testing.T) {
	s := NewWithKeyring(newTestDB(t, "alice"), newFakeKeyring())
	if _, err := s.GetPassword("alice"); !errors.Is(err, ErrPasswordMissing) {
		t.Fatalf("GetPassword() error = %v; want ErrPasswordMissing", err)
	}
}

func TestFallbackToDBWithoutKeyring(t *testing.T) {
	db := newTestDB(t, "alice", "bob")
	kr := newFakeKeyring()
	kr.err = errNoSecretService
	s := NewWithKeyring(db, kr)

	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if pw := storedPassword(t, db, "alice"); pw != "secret" {
		t.Fatalf("stored password = %q; want the DB fallback", pw)
	}
	if pw, err := s.GetPassword("alice"); err != nil || pw != "secret" {
		t.Fatalf("GetPassword() = %q, %v; want secret", pw, err)
	}
	if _, err := s.GetPassword("bob"); !errors.Is(err, ErrKeyringUnavailable) {
		t.Fatalf("GetPassword(no password anywhere) error = %v; want ErrKeyringUnavailable", err)
	}
}

func TestGetPasswordMovesItToTheKeyring(t *testing.T) {
	db := newTestDB(t, "alice")
	if err := SetStoredPassword(db, "alice", "legacy"); err != nil { // saved by an older version
		t.Fatal(err)
	}
	kr := newFakeKeyring()
	s := NewWithKeyring(db, kr)

	if pw, err := s.GetPassword("alice"); err != nil || pw != "legacy" {
		t.Fatalf("GetPassword() = %q, %v; want legacy", pw, err)
	}
	if pw := storedPassword(t, db, "alice"); pw != "" {
		t.Fatalf("password still in the DB (%q)", pw)
	}
	if kr.secrets[Service+"/alice"] != "legacy" {
		t.Fatalf("password not moved to the keyring: %v", kr.secrets)
	}
}

func TestDBValueWinsOverAStaleKeyringValue(t *testing.T) {
	db := newTestDB(t, "alice")
	kr := newFakeKeyring()
	s := NewWithKeyring(db, kr)
	if err := s.SetPassword("alice", "old"); err != nil {
		t.Fatal(err)
	}

	// Password changed while the keyring was unavailable
	kr.err = errNoSecretService
	if err := s.SetPassword("alice", "new"); err != nil {
		t.Fatal(err)
	}

	kr.err = nil
	if pw, err := s.GetPassword("alice"); err != nil || pw != "new" {
		t.Fatalf("GetPassword() = %q, %v; want new", pw, err)
	}
	if kr.secrets[Service+"/alice"] != "new" || storedPassword(t, db, "alice") != "" {
		t.Fatalf("new password not moved to the keyring")
	}
}

func TestMigrateAll(t *testing.T) {
	db := newTestDB(t, "alice", "bob", "carol")
	for user, pw := range map[string]string{"alice": "pa", "bob": "pb"} {
		if err := SetStoredPassword(db, user, pw); err != nil {
			t.Fatal(err)
		}
	}

	// Without keyring: nothing changes
	kr := newFakeKeyring()
	kr.err = errNoSecretService
	if err := NewWithKeyring(db, kr).MigrateAll(); err != nil {
		t.Fatal(err)
	}
	if storedPassword(t, db, "alice") != "pa" || storedPassword(t, db, "bob") != "pb" {
		t.Fatal("passwords lost while the keyring was unavailable")
	}

	kr.err = nil
	if err := NewWithKeyring(db, kr).MigrateAll(); err != nil {
		t.Fatal(err)
	}
	if users, err := ListUsersWithStoredPassword(db); err != nil || len(users) != 0 {
		t.Fatalf("passwords still in the DB: %v, %v", users, err)
	}
	if kr.secrets[Service+"/alice"] != "pa" || kr.secrets[Service+"/bob"] != "pb" || len(kr.secrets) != 2 {
		t.Fatalf("keyring = %v", kr.secrets)
	}
}

func TestDeletePassword(t *testing.T) {
	db := newTestDB(t, "alice")
	kr := newFakeKeyring()
	s := NewWithKeyring(db, kr)
	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if err := s.DeletePassword("alice"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.GetPassword("alice"); !errors.Is(err, ErrPasswordMissing) {
		t.Fatalf("GetPassword() after delete error = %v; want ErrPasswordMissing", err)
	}
	// Deleting twice is not an error
	if err := s.DeletePassword("alice"); err != nil {
		t.Fatal(err)
	}
}

// The real keyring adapter, with go-keyring's in-memory provider.
func TestSystemKeyring(t *testing.T) {
	keyring.MockInit()
	s := New(newTestDB(t, "alice"))

	if _, err := s.GetPassword("alice"); !errors.Is(err, ErrPasswordMissing) {
		t.Fatalf("GetPassword() error = %v; want ErrPasswordMissing", err)
	}
	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if pw, err := keyring.Get(Service, "alice"); err != nil || pw != "secret" {
		t.Fatalf("keyring.Get() = %q, %v", pw, err)
	}
}
