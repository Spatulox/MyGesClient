package backend

import (
	. "MyGesClient/db"
	"MyGesClient/discord"
	. "MyGesClient/log"
	"fmt"
)

// Application id of MyGesClient on Discord
const discordClientID = "1196836862447329351"

// discordRPCEnabled reports whether the selected account wants the app in its
// Discord status. Read from the DB: the account may have just changed.
func (a *App) discordRPCEnabled() bool {
	if a.db == nil {
		return false
	}
	user, err := GetUser(a.db)
	return err == nil && user.DiscordRPC
}

// InitDiscordRPC shows the app in the Discord status, if the selected account
// enabled it (the default); otherwise it removes the app from the status.
// Called by the frontend at startup and after each change of account.
func (a *App) InitDiscordRPC() error {
	if !a.discordRPCEnabled() {
		return discord.Logout()
	}

	if err := discord.Login(discordClientID); err != nil {
		return err
	}
	return discord.SetActivity(discord.Activity{
		Details:    "Unofficial MyGes Client",
		State:      "Dashboard",
		LargeImage: "ges_logo",
		LargeText:  "GES_logo",
		Buttons: []*discord.Button{
			{
				Label: "Obtenez le logiciel",
				Url:   "https://github.com/Spatulox/MyGesClient/releases",
			},
		},
	})
}

// UpdateDiscordRPC changes the page shown in the Discord status. It does
// nothing when the app is not shown in Discord (option disabled, Discord not
// running).
func (a *App) UpdateDiscordRPC(details string, state string) error {
	return discord.SetActivity(discord.Activity{
		Details:    details,
		State:      state,
		LargeImage: "ges_logo",
		LargeText:  "GES_logo",
	})
}

// GetDiscordRPC reports whether the selected account shows the app in its
// Discord status.
func (a *App) GetDiscordRPC() bool {
	return a.discordRPCEnabled()
}

// SetDiscordRPC enables or disables the app in the Discord status of the
// selected account, and applies it right away. Discord not running is not an
// error: the option is saved and used at the next start.
func (a *App) SetDiscordRPC(enabled bool) error {
	a.dbWg.Add(1)
	a.dbMutex.Lock()
	err := UpdateUserDiscordRPC(a.db, enabled)
	a.dbMutex.Unlock()
	a.dbWg.Done()
	if err != nil {
		return err
	}

	if err := a.InitDiscordRPC(); err != nil {
		Log.Error(fmt.Sprintf("Discord RPC: %v", err))
	}
	return nil
}
