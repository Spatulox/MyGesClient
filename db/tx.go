package db

import (
	"database/sql"
	"fmt"
)

// withTx runs fn inside a transaction. The transaction is committed when fn
// returns nil and rolled back otherwise (including on panic).
func withTx(db *sql.DB, fn func(tx *sql.Tx) error) (err error) {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("début de la transaction : %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if err = fn(tx); err != nil {
		return err
	}
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("validation de la transaction : %w", err)
	}
	return nil
}
