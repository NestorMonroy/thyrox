// Sonda diferencial del comparador LCP de CLIProxyAPI
// (sdk/cliproxy/session/lcp.go, sin tocar): lee un guion JSON por línea,
// ejecuta cada operación contra el paquete real con un reloj virtual y
// escribe una línea JSON de resultado por operación. La réplica en
// TypeScript reproduce el mismo guion y compara línea a línea.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/router-for-me/CLIProxyAPI/v8/sdk/cliproxy/session"
	sdktranslator "github.com/router-for-me/CLIProxyAPI/v8/sdk/translator"
)

type op struct {
	Op          string `json:"op"`
	Format      string `json:"format"`
	Payload     string `json:"payload"`
	Namespace   string `json:"ns"`
	Auth        string `json:"auth"`
	Session     string `json:"session"`
	Generation  uint64 `json:"gen"`
	Milliseconds int64 `json:"ms"`
	TTL         int64  `json:"ttl_ms"`
	// GenerationDelta, con FromLast, toma la generación del último enlace o acierto.
	GenerationDelta int64 `json:"gen_delta"`
	FromLast        bool  `json:"from_last"`
	MaxTurns    int    `json:"max_turns"`
	MaxGroups   int    `json:"max_groups"`
	MaxPrefixes int    `json:"max_prefixes"`
}

func main() {
	clock := time.Date(2026, 9, 27, 0, 0, 0, 0, time.UTC)
	var matcher *session.MerklePrefixMatcher
	lastSession, lastAccess := "", uint64(0)
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 64<<20), 64<<20)
	out := bufio.NewWriter(os.Stdout)
	defer out.Flush()
	emit := func(value any) {
		encoded, _ := json.Marshal(value)
		fmt.Fprintln(out, string(encoded))
	}
	for scanner.Scan() {
		var o op
		if err := json.Unmarshal(scanner.Bytes(), &o); err != nil {
			emit(map[string]any{"error": err.Error()})
			continue
		}
		turns := session.ExtractCanonicalTurns(sdktranslator.Format(o.Format), []byte(o.Payload))
		switch o.Op {
		case "turns":
			fingerprints, minPrefix, tails, env := matcher.PrepareExt(turns)
			if matcher == nil {
				fingerprints, minPrefix, tails, env = session.NewMerklePrefixMatcher(0).PrepareExt(turns)
			}
			emit(map[string]any{"turns": turns, "fp": fingerprints, "min": minPrefix, "tail": tails, "env": env})
		case "new":
			matcher = session.NewMerklePrefixMatcherWithConfig(session.MerklePrefixMatcherConfig{
				TTL: time.Duration(o.TTL) * time.Millisecond, MaxTurns: o.MaxTurns, MaxGroups: o.MaxGroups, MaxPrefixes: o.MaxPrefixes,
				NowFunc: func() time.Time { return clock },
			})
			emit(map[string]any{"ok": true})
		case "advance":
			clock = clock.Add(time.Duration(o.Milliseconds) * time.Millisecond)
			emit(map[string]any{"ok": true})
		case "match":
			match, ok := matcher.Match(o.Namespace, turns)
			if ok {
				lastSession, lastAccess = match.SessionID, match.AccessNumber
			}
			emit(map[string]any{"ok": ok, "match": match})
		case "bind":
			result := matcher.BindWithResult(o.Namespace, turns, o.Auth)
			if result.SessionID != "" {
				lastSession, lastAccess = result.SessionID, result.AccessNumber
			}
			emit(result)
		case "touch":
			emit(map[string]any{"ok": matcher.Touch(o.Namespace, turns, o.Auth)})
		case "remove":
			fingerprints, _ := matcher.Prepare(turns)
			generation := o.Generation
			if o.FromLast {
				generation = uint64(max(0, int64(lastAccess)+o.GenerationDelta))
			}
			emit(map[string]any{"ok": matcher.RemoveFingerprintsBefore(o.Namespace, fingerprints, o.Auth, generation), "gen": generation})
		case "lookup":
			if o.FromLast {
				o.Session = lastSession
			}
			auths, namespace, ok := matcher.LookupSession(o.Session)
			emit(map[string]any{"auths": auths, "ns": namespace, "ok": ok})
		case "invalidate":
			matcher.InvalidateAuth(o.Auth)
			emit(map[string]any{"ok": true})
		case "clear":
			matcher.Clear()
			emit(map[string]any{"ok": true})
		default:
			emit(map[string]any{"error": "op desconocida: " + o.Op})
		}
	}
}
