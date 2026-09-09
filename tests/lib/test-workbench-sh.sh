#!/usr/bin/env bash
# Control de `src/lib/workbench.sh` — el archivo de trabajo dentro del run.
#
# Que haria fallar a este control: que `thyrox_work_file` compusiera una ruta
# fuera del run, o que fabricara el run al no encontrarlo. Las dos formas
# son el mismo defecto con dos caras — el archivo acaba donde nadie lo versiona,
# que es el episodio que lo origina: un puntero en `/dev/shm` que ninguna otra
# sesion podia leer y que el contenedor borra.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
level="$HERE"
while [[ "$level" != "/" && ! -f "$level/src/paths/reach.py" ]]; do level="$(dirname "$level")"; done
# shellcheck source=/dev/null
source "$level/src/lib/assert.sh"
# shellcheck source=/dev/null
source "$level/src/lib/workbench.sh"

BANK="$(mktemp -d)"

thyrox_check "compone la ruta dentro del run" \
  "$BANK/mensaje.txt" "$(thyrox_work_file "$BANK" mensaje.txt)"

thyrox_check "no crea el archivo, solo su ruta" \
  "ausente" "$([[ -e "$BANK/mensaje.txt" ]] && echo presente || echo ausente)"

thyrox_work_file "$BANK/no-existe" x >/dev/null 2>&1
thyrox_check "REHUSA si el run no existe, en vez de crearlo" 2 "$?"

thyrox_check "y no lo deja creado" \
  "ausente" "$([[ -d "$BANK/no-existe" ]] && echo presente || echo ausente)"

thyrox_work_file "$BANK" "sub/escape.txt" >/dev/null 2>&1
thyrox_check "rehusa un nombre con separador — escaparia del run" 2 "$?"

thyrox_work_file "$BANK" >/dev/null 2>&1
thyrox_check "rehusa sin nombre" 2 "$?"

thyrox_work_file >/dev/null 2>&1
thyrox_check "rehusa sin run" 2 "$?"

# El contrato con procesos hijos: VVV exporta sus 41 porque sus provisioners son
# procesos nuevos. Aqui el caso real es un guion invocado desde otro.
bash -c 'declare -F thyrox_work_file >/dev/null' && exportada=si || exportada=no
thyrox_check "se exporta a procesos hijos" "si" "$exportada"

rm -rf "$BANK"
thyrox_summary "test-workbench-sh"
