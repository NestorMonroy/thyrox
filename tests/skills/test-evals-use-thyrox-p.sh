#!/usr/bin/env bash
# Las evaluaciones del skill thyrox lanzan cada caso con `thyrox -p`
# (`bin/cli`), no con `claude -p` del PATH.
#
# Un `claude` falso en el PATH y un `thyrox` falso en THYROX_CLI registran su
# llamada; la prueba exige que se llame el segundo y nunca el primero. Sin
# THYROX_CLI el guion usa `bin/cli`, el mismo ejecutor que `headless-pool`.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS="$ROOT/.claude/skills/thyrox/scripts"
T="$(mktemp -d "${TMPDIR:-/tmp}/evals-thyrox-p.XXXXXX")"
trap 'rm -rf "${T:?}"' EXIT
ok=0
fail=0

check() {
    if [ "$2" = "$3" ]; then ok=$((ok + 1)); echo "  ok   $1"; else
        fail=$((fail + 1)); echo "  FALLO $1 — esperado [$2], obtenido [$3]"; fi
}

mkdir -p "$T/bin"
cat > "$T/bin/claude" <<'FAKE'
#!/usr/bin/env bash
echo "claude $*" >> "$CALLS_LOG"
echo "respuesta"
FAKE
cat > "$T/thyrox" <<'FAKE'
#!/usr/bin/env bash
echo "thyrox $1" >> "$CALLS_LOG"
echo "respuesta"
FAKE
chmod +x "$T/bin/claude" "$T/thyrox"

for pair in "run-multi-evals.sh MI-05" "run-functional-evals.sh"; do
    set -- $pair
    log="$T/$1.calls"
    : > "$log"
    CALLS_LOG="$log" THYROX_CLI="$T/thyrox" PATH="$T/bin:$PATH" \
        bash "$SCRIPTS/$1" ${2:-} > "$T/$1.out" 2>&1
    check "$1: invoca thyrox -p" "yes" "$(gawk '/^thyrox -p/{f=1} END{print f?"yes":"no"}' "$log")"
    check "$1: nunca claude" "0" "$(gawk '/^claude /{n++} END{print n+0}' "$log")"
done

echo "$ok ok, $fail fallo(s)"
[ "$fail" -eq 0 ]
