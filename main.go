package main

import (
	. "MyGesClient/backend"
	. "MyGesClient/log"
	"MyGesClient/service"
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

// Icon of the event reminder notifications
//
//go:embed build/appicon.png
var appIcon []byte

type SilentLogger struct{}

func (l *SilentLogger) Print(message string)   {}
func (l *SilentLogger) Trace(message string)   {}
func (l *SilentLogger) Debug(message string)   {}
func (l *SilentLogger) Info(message string)    {}
func (l *SilentLogger) Warning(message string) {}
func (l *SilentLogger) Error(message string)   {}
func (l *SilentLogger) Fatal(message string)   {}

func main() {
	service.SetIcon(appIcon)

	// MyGesClient --service: event reminders only, no window (started with
	// the session when the option is enabled, see the autostart package)
	if service.IsServiceMode(os.Args) {
		os.Exit(service.Run())
	}

	Log.DebugBool = true
	Log.Infos("Launching...")
	// Create an instance of the app structure
	app := NewApp()
	Log.Infos("Running app")

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "MyGesClient",
		Width:  1400,
		Height: 800,
		Logger: &SilentLogger{},
		AssetServer: &assetserver.Options{
			Assets:     assets,
			Middleware: assetserver.ChainMiddleware(),
		},
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
		},
		Linux: &linux.Options{
			WebviewGpuPolicy: linux.WebviewGpuPolicyAlways,
			ProgramName:      "MyGesClient",
		},
	})

	if err != nil {
		Log.Error(err.Error())
	}
}
