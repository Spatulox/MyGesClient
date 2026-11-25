package credentials

import (
	"errors"
	"time"
)

// KeyringTimeout bounds every call to the OS keyring. On Linux, a locked
// collection opens an unlock prompt and the call waits for the user's
// answer: the app must not wait for it forever. 20 s leaves time to answer
// the prompt, and the two calls made at startup stay below the frontend
// startup timeout (60 s).
const KeyringTimeout = 20 * time.Second

// errKeyringTimeout is returned when the keyring did not answer in time. It
// is handled like an unavailable keyring.
var errKeyringTimeout = errors.New("le trousseau du système n'a pas répondu à temps")

// timeoutKeyring makes every call to inner give up after d. A call that
// times out keeps running in the background (the D-Bus call cannot be
// cancelled) and its result is dropped.
type timeoutKeyring struct {
	inner Keyring
	d     time.Duration
}

func withTimeout[T any](d time.Duration, f func() (T, error)) (T, error) {
	type result struct {
		v   T
		err error
	}
	done := make(chan result, 1) // buffered: the goroutine never blocks
	go func() {
		v, err := f()
		done <- result{v, err}
	}()

	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case r := <-done:
		return r.v, r.err
	case <-timer.C:
		var zero T
		return zero, errKeyringTimeout
	}
}

func (k timeoutKeyring) Get(service, user string) (string, error) {
	return withTimeout(k.d, func() (string, error) { return k.inner.Get(service, user) })
}

func (k timeoutKeyring) Set(service, user, password string) error {
	_, err := withTimeout(k.d, func() (struct{}, error) {
		return struct{}{}, k.inner.Set(service, user, password)
	})
	return err
}

func (k timeoutKeyring) Delete(service, user string) error {
	_, err := withTimeout(k.d, func() (struct{}, error) {
		return struct{}{}, k.inner.Delete(service, user)
	})
	return err
}
