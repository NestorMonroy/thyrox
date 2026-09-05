#!/usr/bin/env bash
# Prueba de .claude/scripts/lib.sh — la librería compartida de bash.
#
# Escrita ANTES que la librería (TDD). Cada caso declara qué lo haría fallar,
# porque un control que no puede fallar no discrimina — sub-patrón D de
# `metrica-decide-la-conclusion.md`.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LIB="$RAIZ/.claude/scripts/lib.sh"
ok=0; ko=0
caso() {
    local nombre="$1" esperado="$2" obtenido="$3"
    if [[ "$esperado" == "$obtenido" ]]; then
        printf '  ok    %s\n' "$nombre"; ok=$((ok+1))
    else
        printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' \
            "$nombre" "$esperado" "$obtenido"; ko=$((ko+1))
    fi
}

# --- caso 1: la librería existe y se puede hacer source -----------------
if [[ -f "$LIB" ]]; then caso "existe lib.sh" "si" "si"
else caso "existe lib.sh" "si" "no"; printf '\nresultado: %s ok, %s fallan\n' "$ok" "$ko"; exit 1; fi

# shellcheck source=/dev/null
source "$LIB"

# --- caso 2: lib_repo_root devuelve la raíz, desde CUALQUIER cwd --------
# Lo que lo haría fallar: una implementación que use $PWD o una cadena de
# ../.. fija. Se prueba desde tres directorios de profundidad distinta.
for d in "$RAIZ" "$RAIZ/.claude/scripts/gates" "$RAIZ/source"; do
    obtenido=$(cd "$d" && lib_repo_root)
    caso "lib_repo_root desde ${d#$RAIZ/}" "$RAIZ" "$obtenido"
done

# --- caso 3: lib_repo_root NO depende de git ----------------------------
# Lo que lo haría fallar: una implementación que sólo use `git rev-parse`.
# Se simula un árbol sin .git y con el marcador de repo presente.
FALSO=$(mktemp -d)
mkdir -p "$FALSO/.claude/scripts/gates" "$FALSO/source"
cp "$LIB" "$FALSO/.claude/scripts/lib.sh"
obtenido=$(cd "$FALSO/.claude/scripts/gates" && PATH=/usr/bin:/bin bash -c \
    'source ../lib.sh; lib_repo_root' 2>/dev/null)
caso "lib_repo_root sin .git" "$(cd "$FALSO" && pwd -P)" "$(cd "$obtenido" 2>/dev/null && pwd -P)"
rm -rf "$FALSO"

# --- caso 4: la librería se hace source, NO se ejecuta -------------------
# Lo que lo haría fallar: una librería sin guard, que al ejecutarse no diría
# nada y daría exit 0 — indistinguible de haber hecho algo.
salida=$(bash "$LIB" 2>&1); rc=$?
caso "ejecutarla rehúsa (rc)" "2" "$rc"
if [[ "$salida" == *"source"* ]]; then caso "ejecutarla explica por qué" "si" "si"
else caso "ejecutarla explica por qué" "si" "no ($salida)"; fi

# --- caso 5: lib_die va a stderr y sale 1 --------------------------------
salida=$(bash -c "source '$LIB'; lib_die 'motivo' " 2>/dev/null); rc=$?
caso "lib_die sale 1" "1" "$rc"
caso "lib_die no ensucia stdout" "" "$salida"
err=$(bash -c "source '$LIB'; lib_die 'motivo' " 2>&1 >/dev/null)
if [[ "$err" == *motivo* ]]; then caso "lib_die escribe a stderr" "si" "si"
else caso "lib_die escribe a stderr" "si" "no"; fi

# --- caso 6: los colores se apagan sin tty ------------------------------
# Lo que lo haría fallar: emitir ANSI incondicionalmente. Este test corre sin
# tty, así que la salida no debe traer escapes.
salida=$(bash -c "source '$LIB'; lib_ok 'mensaje'" 2>&1)
if [[ "$salida" == *$'\033'* ]]; then caso "sin tty no emite ANSI" "si" "no"
else caso "sin tty no emite ANSI" "si" "si"; fi

# --- caso 7: lib_require rehúsa ante un comando ausente ------------------
bash -c "source '$LIB'; lib_require comando-que-no-existe-jamas" >/dev/null 2>&1; rc=$?
caso "lib_require rehúsa lo ausente" "1" "$rc"
bash -c "source '$LIB'; lib_require bash" >/dev/null 2>&1; rc=$?
caso "lib_require acepta lo presente" "0" "$rc"

printf '\nresultado: %s ok, %s fallan (alcance medido: %s aserciones)\n' "$ok" "$ko" "$((ok+ko))"
[[ "$ko" -eq 0 ]]
