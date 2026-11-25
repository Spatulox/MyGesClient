package credentials

import (
	"errors"
	"testing"
	"time"

	"github.com/zalando/go-keyring"
)

// blockingKeyring never answers until release is closed, like a Secret
// Service waiting for the user to answer an unlock prompt.
type blockingKeyring struct{ release chan struct{} }

func (k blockingKeyring) Get(service, user string) (string, error) {
	<-k.release
	return "", keyring.ErrNotFound
}

func (k blockingKeyring) Set(service, user, password string) error {
	<-k.release
	return nil
}

func (k blockingKeyring) Delete(service, user string) error {
	<-k.release
	return nil
}

func TestTimeoutKeyringGivesUp(t *testing.T) {
	db := newTestDB(t, "alice")
	kr := blockingKeyring{release: make(chan struct{})}
	t.Cleanup(func() { close(kr.release) }) // let the abandoned goroutines end

	s := NewWithKeyring(db, timeoutKeyring{inner: kr, d: 50 * time.Millisecond})

	start := time.Now()
	if _, err := s.GetPassword("alice"); !errors.Is(err, ErrKeyringUnavailable) {
		t.Fatalf("GetPassword() error = %v; want ErrKeyringUnavailable", err)
	}
	if elapsed := time.Since(start); elapsed > 2*time.Second {
		t.Fatalf("GetPassword() took %v despite the timeout", elapsed)
	}

	// A keyring that does not answer is handled like an unavailable one
	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if stored, err := s.IsStoredInDatabase("alice"); err != nil || !stored {
		t.Fatalf("IsStoredInDatabase() = %v, %v; want the DB fallback", stored, err)
	}
	if err := s.MigrateAll(); err != nil {
		t.Fatalf("MigrateAll() = %v; want no error while the keyring does not answer", err)
	}
	if stored, _ := s.IsStoredInDatabase("alice"); !stored {
		t.Fatal("password removed from the DB although the keyring did not answer")
	}
}

func TestTimeoutKeyringPassesResults(t *testing.T) {
	tk := timeoutKeyring{inner: newFakeKeyring(), d: time.Second}
	if err := tk.Set(Service, "alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if pw, err := tk.Get(Service, "alice"); err != nil || pw != "secret" {
		t.Fatalf("Get() = %q, %v; want secret", pw, err)
	}
	if err := tk.Delete(Service, "bob"); !errors.Is(err, keyring.ErrNotFound) {
		t.Fatalf("Delete(unknown) error = %v; want ErrNotFound", err)
	}
}

func TestIsStoredInDatabase(t *testing.T) {
	db := newTestDB(t, "alice")
	s := NewWithKeyring(db, newFakeKeyring())
	if err := s.SetPassword("alice", "secret"); err != nil {
		t.Fatal(err)
	}
	if stored, err := s.IsStoredInDatabase("alice"); err != nil || stored {
		t.Fatalf("IsStoredInDatabase() = %v, %v; want false (in the keyring)", stored, err)
	}
}
