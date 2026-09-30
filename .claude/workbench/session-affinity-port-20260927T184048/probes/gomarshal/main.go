// Sonda: imprime lo que json.Marshal de Go produce para canonicalRoot
// (struct copiado verbatim de _references/cliproxyapi/sdk/cliproxy/session/identity.go:27-40)
// y su sha256, como vectores de prueba conocidos de goMarshal en thyrox.
package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
)

type canonicalRoot struct {
	Version      string          `json:"version"`
	Format       string          `json:"format"`
	CallerScope  string          `json:"caller_scope"`
	Instructions []string        `json:"instructions,omitempty"`
	User         []canonicalPart `json:"user,omitempty"`
	Resource     string          `json:"resource,omitempty"`
}

type canonicalPart struct {
	Kind  string `json:"kind"`
	MIME  string `json:"mime,omitempty"`
	Value string `json:"value"`
}

func main() {
	roots := []canonicalRoot{
		{Version: "cpa-session-root-v1", Format: "openai", CallerScope: "caller-a",
			Instructions: []string{"system prompt", "developer prompt"},
			User:         []canonicalPart{{Kind: "text", Value: "complete first user prompt"}}},
		{Version: "cpa-session-root-v1", Format: "claude", CallerScope: "",
			User: []canonicalPart{{Kind: "text", Value: "a<b>&c d e \"q\" \\ \t\n 界 \x01"},
				{Kind: "image", MIME: "image/png", Value: "iVBOR"}}},
		{Version: "cpa-session-root-v1", Format: "gemini", CallerScope: "s",
			User: []canonicalPart{{Kind: "text", Value: "x"}}, Resource: "cachedContents/abc"},
	}
	for _, r := range roots {
		b, err := json.Marshal(r)
		if err != nil {
			panic(err)
		}
		sum := sha256.Sum256(b)
		fmt.Printf("%s\t%s\n", hex.EncodeToString(sum[:]), b)
	}
}
