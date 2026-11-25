package discord

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net"
	"time"
)

// Opcodes of the Discord IPC protocol
const (
	opHandshake = 0
	opFrame     = 1
)

// maxSockets is the number of discord-ipc-N sockets tried: each running
// Discord client (stable, PTB, Canary...) takes the first free one.
const maxSockets = 10

// ioTimeout bounds every write and read on the socket: a Discord client that
// does not answer must not block the app.
const ioTimeout = 2 * time.Second

// openSocket connects to the first Discord client found.
func openSocket() (net.Conn, error) {
	for _, path := range socketCandidates() {
		if c, err := dial(path); err == nil {
			return c, nil
		}
	}
	return nil, ErrNotFound
}

// send writes a message (opcode, length, JSON payload, little endian) and
// reads the answer of Discord, which is not used.
func send(c net.Conn, opcode int32, payload []byte) error {
	var buf bytes.Buffer
	_ = binary.Write(&buf, binary.LittleEndian, opcode) // never fails on a bytes.Buffer
	_ = binary.Write(&buf, binary.LittleEndian, int32(len(payload)))
	buf.Write(payload)

	if err := c.SetDeadline(time.Now().Add(ioTimeout)); err != nil {
		return err
	}
	if _, err := c.Write(buf.Bytes()); err != nil {
		return err
	}
	return readAnswer(c)
}

// readAnswer reads one message. Discord answers a closing message (opcode 2)
// with the reason when it rejects the handshake.
func readAnswer(c net.Conn) error {
	var header struct {
		Opcode int32
		Length int32
	}
	if err := binary.Read(c, binary.LittleEndian, &header); err != nil {
		return err
	}
	if header.Length < 0 || header.Length > 1<<20 {
		return fmt.Errorf("réponse Discord invalide (%d octets)", header.Length)
	}
	body := make([]byte, header.Length)
	if _, err := io.ReadFull(c, body); err != nil {
		return err
	}
	const opClose = 2
	if header.Opcode == opClose {
		return errors.New("connexion refusée par Discord : " + string(body))
	}
	return nil
}
