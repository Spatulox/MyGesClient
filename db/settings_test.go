package db

import "testing"

func TestUpdateUserDiscordRPC(t *testing.T) {
	db := newTestDB(t)
	if err := UpdateUserDiscordRPC(db, false); err == nil {
		t.Fatal("UpdateUserDiscordRPC() without selected user: want an error")
	}

	addUsers(t, db, 1, 2) // user1 is selected
	if user, err := GetUser(db); err != nil || !user.DiscordRPC {
		t.Fatalf("GetUser() = %+v, %v; want DiscordRPC enabled by default", user, err)
	}
	if err := UpdateUserDiscordRPC(db, false); err != nil {
		t.Fatal(err)
	}
	if user, err := GetUser(db); err != nil || user.DiscordRPC {
		t.Fatalf("GetUser() = %+v, %v; want DiscordRPC disabled", user, err)
	}

	// Only the selected account changes
	users, err := GetRegisteredUsers(db)
	if err != nil {
		t.Fatal(err)
	}
	for _, u := range users {
		if want := u.ID != 1; u.DiscordRPC != want {
			t.Errorf("user %d: DiscordRPC = %v; want %v", u.ID, u.DiscordRPC, want)
		}
	}
}
