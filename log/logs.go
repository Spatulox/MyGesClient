package Projet_GO_Reservation

import (
	"fmt"
	"time"
)

type LogHelper struct {
	DebugBool bool
}

// -----------------------------------------------------

// Created to avoid code "redondance"
func log() string {
	now := time.Now()
	dateTimeStr := now.Format("[01/02/2006 - 15:04:05] ")
	return dateTimeStr
}

// Make the text red
func (l *LogHelper) Error(message string, err ...error) {
	if l.DebugBool {
		var result = log()

		fmt.Printf("\033[1;31m%s ERROR : \033[0m%s\n", result, message)

		if err != nil {
			fmt.Println(err)
		}
	}
}

// Make the text white (normal)
func (l *LogHelper) Infos(message string, err ...error) {
	if l.DebugBool {
		var result = log()

		fmt.Println(result + "INFOS : " + message)

		if err != nil {
			fmt.Println(err)
		}
	}
}

// Make the text green
func (l *LogHelper) Debug(message string, err ...error) {
	if l.DebugBool {
		var result = log()

		fmt.Printf("\033[1;32m%s DEBUG : \033[0m%s\n", result, message)

		if err != nil {
			fmt.Println(err)
		}
	}
}

// -----------------------------------------------------

var Log LogHelper
