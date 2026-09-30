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

# Caso 12 — el texto por ARCHIVO: un heredoc con delimitador entre comillas no
# interpreta nada, asi que las comillas simples y dobles llegan intactas. Por
# variable, un NEW='...' con 'pid' dentro pierde sus comillas en el shell,
# antes de que el guion lo reciba (episodio del 2026-09-26).
printf 'outcome = busy.owner.get(pid)\n' > "$WORK/f12"
cat > "$WORK/old12" <<'EOF'
busy.owner.get(pid)
EOF
cat > "$WORK/new12" <<'EOF'
"rehusa:" + str(busy.owner.get('pid'))
EOF
thyrox_check "12 --old-file/--new-file reemplazan" 0 "$(run --old-file "$WORK/old12" --new-file "$WORK/new12" "$WORK/f12")"
thyrox_check "12 las comillas llegan intactas" "outcome = \"rehusa:\" + str(busy.owner.get('pid'))" "$(cat "$WORK/f12")"

# Caso 13 — se quita SOLO el salto final que el heredoc anade: un texto de
# varias lineas conserva los suyos.
printf 'a\nb\nc\n' > "$WORK/f13"
printf 'a\nb\n' > "$WORK/old13"
printf 'x\n\n' > "$WORK/new13"
run --old-file "$WORK/old13" --new-file "$WORK/new13" "$WORK/f13" >/dev/null
thyrox_check "13 el salto interno se conserva, el final del heredoc no" $'x\n\nc' "$(cat "$WORK/f13")"

# Caso 14 — un archivo de texto ausente no es un OLD vacio: rehusa con 2.
thyrox_check "14 --old-file ausente rehusa con 2" 2 "$(run --old-file "$WORK/no-existe" --new-file "$WORK/new12" "$WORK/f12")"

# Caso 15 — el guion se edita a SI MISMO: bash lee un guion por tramos, y un
# `cat >` que reescribe el archivo en curso le hace leer la cola desplazada
# («syntax error near unexpected token», 2026-09-26). Envuelto en `main`,
# bash lee el cuerpo entero antes de ejecutar.
cp "$SUBJECT" "$WORK/self.sh"
printf '%s\n' '# linea anadida al principio' > "$WORK/new15"
head -1 "$WORK/self.sh" > "$WORK/old15"
{ cat "$WORK/old15"; cat "$WORK/new15"; } > "$WORK/new15b"
bash "$WORK/self.sh" --old-file "$WORK/old15" --new-file "$WORK/new15b" "$WORK/self.sh" >/dev/null 2>"$WORK/err15"
thyrox_check "15 editarse a si mismo sale 0" 0 "$?"
thyrox_check "15 sin error de sintaxis en la cola" 0 "$(gawk '/syntax error|unexpected/{n++} END{print n+0}' "$WORK/err15")"

thyrox_summary
