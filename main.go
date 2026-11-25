package main

import (
	. "MyGesClient/backend"
	. "MyGesClient/log"
	"MyGesClient/service"
	"embed"
	"fmt"
	"os"
	"strings"

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

// appID is the reverse-DNS id of the app: the name of its .desktop file on
// Linux (see packaging.toml and the CI).
const appID = "io.github.spatulox.MyGesClient"

// gpuPolicy returns the WebKitGTK hardware acceleration policy (Linux only).
// Always by default; MYGES_GPU_POLICY=ondemand|never works around a blank
// window with some drivers (NVIDIA, VMs).
func gpuPolicy() linux.WebviewGpuPolicy {
	switch strings.ToLower(os.Getenv("MYGES_GPU_POLICY")) {
	case "ondemand":
		return linux.WebviewGpuPolicyOnDemand
	case "never":
		return linux.WebviewGpuPolicyNever
	default:
		return linux.WebviewGpuPolicyAlways
	}
}

func main() {
	service.SetIcon(appIcon)

	// MyGesClient --service: event reminders only, no window (started with
	// the session when the option is enabled, see the autostart package)
	if service.IsServiceMode(os.Args) {
		os.Exit(service.Run())
	}

	Log.DebugBool = true
	if err := Log.InitDefaultFile("MyGesClient.log"); err != nil {
		Log.Error(fmt.Sprintf("Impossible to create the log file, logging to stdout only: %v", err))
	}
	defer Log.Close()
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
			WebviewGpuPolicy: gpuPolicy(),
			// WM_CLASS / Wayland app_id: must match the .desktop file name
			// so that the desktop shows the icon of the app on its window
			ProgramName: appID,
		},
	})

	if err != nil {
		Log.Error(err.Error())
	}
}
