#!/usr/bin/env bash
# Contrato de `.githooks/pre-push`: defensa SECUNDARIA de TASK-THYROX-0629.
#
# Tres desenlaces, y los tres se miden por CONDUCTA sobre un consumidor
# sintético, nunca sobre el kaupamex-docs real (que muta entre sesiones y
# haría este test dependiente de su estado del momento):
#
#   1. un hueco NUEVO (fuera del baseline)       -> bloquea el push (exit != 0)
#   2. un hueco YA CONGELADO en el baseline      -> deja pasar (exit 0)
#   3. el corpus del consumidor NO es alcanzable -> NO bloquea, y lo dice en
#      stderr sin afirmar que midió (es secundaria: README D4-A, §8)
#
# Más una cuarta forma de lo mismo que el caso 3 —no poder medir—: el propio
# gate (`bin/check_finding_id_unique`) ausente en el árbol que se empuja.
#
# Y una precondición: el hook no escribe nada en el consumidor — se mide con
# la huella antes/después.
set -uo pipefail

_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
[[ -f "$_thyrox_root/src/paths/reach.py" ]] || {
    echo "ERROR: no se encontró thyrox ascendiendo desde $(dirname "${BASH_SOURCE[0]}")" >&2
    exit 2
}
SUT="$_thyrox_root/.githooks/pre-push"
[[ -x "$SUT" ]] || { echo "ERROR: no existe o no es ejecutable $SUT" >&2; exit 2; }

OK=0; FALLO=0
check() {  # <titulo> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; OK=$((OK+1))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; FALLO=$((FALLO+1)); fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# --- un consumidor sintético con la forma real: PM_ROOT + store + baseline --
CONSUMER="$WORK/fake-docs"
mkdir -p "$CONSUMER/source/gestion/pm/thyrox/iniciativas/x/hallazgos"
mkdir -p "$CONSUMER/.claude/baselines"
STORE="$WORK/store.sqlite3"

make_store() {  # una fila por <finding_id, session_id> pasado en pares
    rm -f "$STORE"
    python3 - "$STORE" "$@" <<'PY'
import sqlite3, sys
path, rows = sys.argv[1], sys.argv[2:]
conn = sqlite3.connect(path)
conn.execute("""CREATE TABLE findings_history (
    finding_id TEXT NOT NULL UNIQUE, submodule TEXT, initiative TEXT,
    summary TEXT, content TEXT, session_id TEXT)""")
for finding_id, session in zip(rows[0::2], rows[1::2]):
    conn.execute(
        "INSERT INTO findings_history VALUES (?,'thyrox','x','s','c',?)",
        (finding_id, session))
conn.commit()
conn.close()
PY
}

run_hook() {  # <ruta del consumidor a declarar>
    THYROX_REACH_ROOTS=docs THYROX_REACH_DOCS="$1" THYROX_AGENT_STORE="$STORE" \
        bash "$SUT" >"$WORK/stdout.txt" 2>"$WORK/stderr.txt"
    echo $?
}

fingerprint() {
    find "$1" -type f -exec sha256sum {} \; 2>/dev/null | sort
}

echo "== 1. hueco NUEVO fuera del baseline: bloquea =="
make_store "H-PREPUSH-1" "sess-fresh" "H-PREPUSH-2" "sess-frozen"
printf 'H-PREPUSH-2\n' > "$CONSUMER/.claude/baselines/finding_id_unique_baseline.txt"
ANTES="$(fingerprint "$CONSUMER")"
CODIGO="$(run_hook "$CONSUMER")"
check "exit distinto de 0" 1 "$([[ "$CODIGO" != 0 ]] && echo 1 || echo 0)"
check "nombra el hueco nuevo" 1 "$(grep -c 'H-PREPUSH-1' "$WORK/stdout.txt")"
DESPUES="$(fingerprint "$CONSUMER")"
check "el hook no escribe en el consumidor" "$ANTES" "$DESPUES"

echo "== 2. sólo el hueco CONGELADO: deja pasar =="
make_store "H-PREPUSH-2" "sess-frozen"
CODIGO="$(run_hook "$CONSUMER")"
check "exit 0" "0" "$CODIGO"

echo "== 3. corpus del consumidor NO alcanzable: no bloquea =="
CODIGO="$(run_hook "$WORK/no-existe-jamas")"
check "exit 0 — secundaria, no afirma sin medir" "0" "$CODIGO"
check "lo dice en stderr" 1 "$(grep -c 'no alcanzable' "$WORK/stderr.txt")"
check "y NO dice que corrió el gate" 0 "$(grep -c 'check-finding-id-unique:' "$WORK/stderr.txt")"

echo "== 4. gate ausente en el árbol que se empuja: no bloquea =="
FALSO="$WORK/thyrox-sin-bin"
mkdir -p "$FALSO/.githooks"
cp "$SUT" "$FALSO/.githooks/pre-push"
git init -q "$FALSO"
CODIGO4=$(cd "$FALSO" && THYROX_REACH_ROOTS=docs THYROX_REACH_DOCS="$CONSUMER" \
    THYROX_AGENT_STORE="$STORE" bash .githooks/pre-push 2>"$WORK/stderr4.txt"; echo $?)
check "exit 0 sin bin/" "0" "$CODIGO4"
check "y lo declara" 1 "$(grep -c 'no encontrado' "$WORK/stderr4.txt")"

printf '\nresultado: %d de %d aserciones en verde\n' "$OK" "$((OK+FALLO))"
exit $((FALLO > 0))
