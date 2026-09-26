#!/usr/bin/env bash
# test-replace-literal.sh — contrato del reemplazo LITERAL con gawk.
#
# El defecto que cierra: el reemplazo de un texto fijo se hacia con
# `perl -pe 's/…/…/'`, `sed -i` o un heredoc de Python. Los dos primeros
# interpretan el texto como regex —`$`, `{`, `.` hay que escaparlos— y, dentro
# de un `bash -c` o de un `eval`, las comillas anidadas rompen el comando antes
# de ejecutarse (episodio de 2026-09-25 sobre `wait-jobs.sh`). `index()` busca
# texto literal y `ENVIRON[...]` entrega el texto intacto, sin procesar sus `\`.
#
# El caso que DISCRIMINA la unicidad es el 5: un reemplazo que no exigiera una
# sola coincidencia pasaria los casos 1-4 y reescribiria dos sitios cuando se
# pidio uno — el defecto que `Edit` evita exigiendo `old_string` unico.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/replace_literal.sh"
source "$ROOT/src/lib/assert.sh"

WORK="$(mktemp -d "$ROOT/.claude/cache/test-replace-literal.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

run() { bash "$SUBJECT" "$@" >"$WORK/out" 2>"$WORK/err"; echo $?; }

# Caso 1 — metacaracteres de regex en OLD: se tratan como texto.
printf 'LEDGER="${A:-$_ROOT/.claude/x/$S}"\nrest\n' > "$WORK/f1"
thyrox_check "1 reemplaza un literal con \$, { y ." 0 \
  "$(OLD='${A:-$_ROOT/.claude/x/$S}' NEW='${B}' run "$WORK/f1")"
thyrox_check "1 el contenido queda exacto" $'LEDGER="${B}"\nrest' "$(cat "$WORK/f1")"

# Caso 2 — la barra de continuacion de NEW llega intacta (ENVIRON, no -v).
printf 'X\n' > "$WORK/f2"
OLD='X' NEW=$'a \\\n    b' run "$WORK/f2" >/dev/null
thyrox_check "2 la barra invertida de NEW no se procesa" $'a \\\n    b' "$(cat "$WORK/f2")"

# Caso 3 — OLD de varias lineas.
printf 'uno\ndos\ntres\n' > "$WORK/f3"
OLD=$'uno\ndos' NEW='UNO' run "$WORK/f3" >/dev/null
thyrox_check "3 un OLD multilinea se reemplaza" $'UNO\ntres' "$(cat "$WORK/f3")"

# Caso 4 — sin coincidencia: exit 1, archivo intacto, y lo dice.
printf 'nada\n' > "$WORK/f4"
thyrox_check "4 sin coincidencia sale 1" 1 "$(OLD='zzz' NEW='y' run "$WORK/f4")"
thyrox_check "4 el archivo queda intacto" 'nada' "$(cat "$WORK/f4")"
thyrox_check "4 nombra las 0 coincidencias" 1 "$(gawk '/0 coincidencias/{n++} END{print n+0}' "$WORK/err")"

# Caso 5 — dos coincidencias: exit 1 sin --all; las dos con --all.
printf 'k k\n' > "$WORK/f5"
thyrox_check "5 dos coincidencias sin --all salen 1" 1 "$(OLD='k' NEW='j' run "$WORK/f5")"
thyrox_check "5 y no tocan el archivo" 'k k' "$(cat "$WORK/f5")"
thyrox_check "5 con --all sale 0" 0 "$(OLD='k' NEW='j' run --all "$WORK/f5")"
thyrox_check "5 con --all reemplaza las dos" 'j j' "$(cat "$WORK/f5")"

# Caso 6 — conserva el bit de ejecucion y el inodo.
printf '#!/bin/sh\necho a\n' > "$WORK/f6"; chmod 755 "$WORK/f6"
inode_before="$(stat -c %i "$WORK/f6")"
OLD='echo a' NEW='echo b' run "$WORK/f6" >/dev/null
thyrox_check "6 conserva los permisos" 755 "$(stat -c %a "$WORK/f6")"
thyrox_check "6 conserva el inodo" "$inode_before" "$(stat -c %i "$WORK/f6")"

# Caso 7 — sin OLD no se puede medir: exit 2 y sin cifra.
printf 'a\n' > "$WORK/f7"
thyrox_check "7 OLD vacio rehusa con exit 2" 2 "$(OLD='' NEW='x' run "$WORK/f7")"
thyrox_check "7 y no publica conteo" 0 "$(gawk '/reemplazo/{n++} END{print n+0}' "$WORK/out")"

# Caso 8 — archivo ausente: exit 2.
thyrox_check "8 archivo ausente rehusa con exit 2" 2 "$(OLD='a' NEW='b' run "$WORK/no-existe")"

# Caso 9 — el final del archivo se conserva byte a byte (sin salto final).
printf 'a b' > "$WORK/f9"
OLD='a' NEW='c' run "$WORK/f9" >/dev/null
thyrox_check "9 sin salto final, sigue sin el" "63 20 62" "$(od -An -tx1 "$WORK/f9" | xargs)"

# Caso 10 — no deja temporales al lado.
thyrox_check "10 sin temporales huerfanos" 0 "$(find "$WORK" -name '*.replace_literal.*' | gawk 'END{print NR}')"

# Caso 11 — publica cuantas reemplazo.
printf 'q q q\n' > "$WORK/f11"
OLD='q' NEW='r' run --all "$WORK/f11" >/dev/null
thyrox_check "11 publica el conteo con su archivo" 1 "$(gawk '/3 reemplazo/{n++} END{print n+0}' "$WORK/out")"

thyrox_summary
