// Vectores de prueba conocidos del hash de mensajes de CLIProxyAPI
// (computeSessionHash + truncateString, selector.go 1834-1856), copiados
// verbatim para que la réplica en TypeScript se compare contra Go.
package main

import (
	"fmt"
	"hash/fnv"
	"strings"
)

func computeSessionHash(systemPrompt, userMsg, assistantMsg string) string {
	h := fnv.New64a()
	if systemPrompt != "" {
		h.Write([]byte("sys:" + systemPrompt + "\n"))
	}
	if userMsg != "" {
		h.Write([]byte("usr:" + userMsg + "\n"))
	}
	if assistantMsg != "" {
		h.Write([]byte("ast:" + assistantMsg + "\n"))
	}
	return fmt.Sprintf("msg:%016x", h.Sum64())
}

func truncateString(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen]
	}
	return s
}

func main() {
	long := strings.Repeat("ñ", 60) // 120 bytes: el corte a 100 cae en frontera de runa
	odd := "a" + strings.Repeat("é", 60) // 121 bytes: el corte a 100 parte una runa
	cases := [][4]string{
		{"user-only", "", "Hello world", ""},
		{"user-assistant", "", "Hello world", "Hi! How can I help?"},
		{"system-user", "You are helpful", "Hello", ""},
		{"system-user-assistant", "You are helpful", "Hello", "Hi there!"},
		{"long-even", "", truncateString(long, 100), ""},
		{"long-odd", "", truncateString(odd, 100), ""},
	}
	for _, c := range cases {
		fmt.Printf("%s\t%s\n", c[0], computeSessionHash(c[1], c[2], c[3]))
	}
}
