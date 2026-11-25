//go:build windows

package discord

import (
	"fmt"
	"net"

	"github.com/Microsoft/go-winio"
)

func socketCandidates() []string {
	paths := make([]string, 0, maxSockets)
	for i := 0; i < maxSockets; i++ {
		paths = append(paths, fmt.Sprintf(`\\.\pipe\discord-ipc-%d`, i))
	}
	return paths
}

// dial opens a named pipe. A pipe that does not exist fails right away; the
// timeout only applies while the pipe is busy.
func dial(path string) (net.Conn, error) {
	timeout := ioTimeout
	return winio.DialPipe(path, &timeout)
}
