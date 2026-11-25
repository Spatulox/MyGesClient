// Package credentials stores the MyGes password of each local account.
//
// The password goes to the OS keyring (Windows Credential Manager, macOS
// Keychain, Secret Service on Linux). When no keyring is available (e.g. a
// Linux desktop without gnome-keyring or KWallet), it falls back to the
// USER.password column of the local database, as before.
//
// Invariant: a non-empty USER.password column is the authoritative value (it
// was written while the keyring was unavailable). As soon as the keyring
// works, the value is moved there and the column is cleared.
package credentials

import (
	. "MyGesClient/db"
	. "MyGesClient/log"
	"database/sql"
	"errors"
	"fmt"

	"github.com/zalando/go-keyring"
)

// Service is the name under which the passwords are stored in the keyring
// (the username is the key).
const Service = "io.github.spatulox.MyGesClient"

var (
	// ErrPasswordMissing is returned when the password is neither in the
	// database nor in the keyring (keyring wiped, database copied to
	// another machine...). The user has to type it again.
	ErrPasswordMissing = errors.New("mot de passe introuvable dans le trousseau du système")

	// ErrKeyringUnavailable is returned when the password should be in the
	// keyring but the keyring cannot be reached (locked, service stopped...).
	ErrKeyringUnavailable = errors.New("trousseau du système inaccessible")
)

// Keyring is the subset of the OS keyring used by Store.
type Keyring interface {
	Get(service, user string) (string, error)
	Set(service, user, password string) error
	Delete(service, user string) error
}

type systemKeyring struct{}

func (systemKeyring) Get(service, user string) (string, error) { return keyring.Get(service, user) }
func (systemKeyring) Set(service, user, password string) error {
	return keyring.Set(service, user, password)
}
func (systemKeyring) Delete(service, user string) error { return keyring.Delete(service, user) }

// Store reads and writes passwords, in the keyring when possible.
type Store struct {
	db *sql.DB
	kr Keyring
}

// New returns a Store backed by the OS keyring. Every keyring call gives up
// after KeyringTimeout.
func New(db *sql.DB) *Store {
	return NewWithKeyring(db, timeoutKeyring{inner: systemKeyring{}, d: KeyringTimeout})
}

// NewWithKeyring returns a Store backed by kr (used by the tests).
func NewWithKeyring(db *sql.DB, kr Keyring) *Store {
	return &Store{db: db, kr: kr}
}

// GetPassword returns the password of username. A password still in the
// database is moved to the keyring if it is available.
func (s *Store) GetPassword(username string) (string, error) {
	stored, err := GetStoredPassword(s.db, username)
	if err != nil {
		return "", err
	}
	if stored != "" {
		if _, err := s.moveToKeyring(username, stored); err != nil {
			Log.Error(fmt.Sprintf("Impossible to move the password of %s to the OS keyring: %v", username, err))
		}
		return stored, nil
	}

	password, err := s.kr.Get(Service, username)
	switch {
	case err == nil:
		return password, nil
	case errors.Is(err, keyring.ErrNotFound):
		return "", ErrPasswordMissing
	default:
		return "", fmt.Errorf("%w: %v", ErrKeyringUnavailable, err)
	}
}

// SetPassword stores the password of username in the keyring, or in the
// database if the keyring is unavailable.
func (s *Store) SetPassword(username, password string) error {
	if err := s.kr.Set(Service, username, password); err != nil {
		Log.Error(fmt.Sprintf("OS keyring unavailable (%v): the password of %s is stored in the local database", err, username))
		return SetStoredPassword(s.db, username, password)
	}
	// Clear a previous value stored while the keyring was unavailable
	return SetStoredPassword(s.db, username, "")
}

// IsStoredInDatabase reports whether the password of username is stored in
// the local database (in clear text) because the keyring was unavailable.
func (s *Store) IsStoredInDatabase(username string) (bool, error) {
	stored, err := GetStoredPassword(s.db, username)
	if err != nil {
		return false, err
	}
	return stored != "", nil
}

// DeletePassword removes the password of username from the keyring and the database.
func (s *Store) DeletePassword(username string) error {
	if err := s.kr.Delete(Service, username); err != nil && !errors.Is(err, keyring.ErrNotFound) {
		return fmt.Errorf("%w: %v", ErrKeyringUnavailable, err)
	}
	return SetStoredPassword(s.db, username, "")
}

// MigrateAll moves every password still in the database to the keyring, then
// rebuilds the database file so the old values do not remain in it. It does
// nothing if the keyring is unavailable.
func (s *Store) MigrateAll() error {
	users, err := ListUsersWithStoredPassword(s.db)
	if err != nil {
		return err
	}

	moved := 0
	for _, username := range users {
		password, err := GetStoredPassword(s.db, username)
		if err != nil {
			return err
		}
		ok, err := s.moveToKeyring(username, password)
		if err != nil {
			return err
		}
		if !ok {
			Log.Error("OS keyring unavailable: the passwords stay in the local database")
			break // unavailable or not answering: no need to try every account
		}
		moved++
	}

	if moved == 0 {
		return nil
	}
	Log.Infos(fmt.Sprintf("%d password(s) moved to the OS keyring", moved))
	return Vacuum(s.db)
}

// moveToKeyring copies password to the keyring then clears the database
// column. It returns false (and no error) if the keyring is unavailable.
func (s *Store) moveToKeyring(username, password string) (bool, error) {
	if err := s.kr.Set(Service, username, password); err != nil {
		return false, nil
	}
	if err := SetStoredPassword(s.db, username, ""); err != nil {
		return false, err
	}
	return true, nil
}
