package main

import (
	. "MyGesClient/backend"
	. "MyGesClient/log"
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	Log.Infos("Launching...")
	// Create an instance of the app structure
	app := NewApp()
	Log.Infos("Running app")

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "MyGesClient",
		Width:  1400,
		Height: 800,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		Log.Error(err.Error())
	}
}
