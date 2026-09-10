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

# =============================================================================
# El RESOLUTOR — el ciclo que cierra el episodio de `/dev/shm/iso_evento`
# =============================================================================
# El escenario del ejecutor, verbatim: shell nueva, se andamia, se resuelve, se
# escribe DENTRO del run. Sin puntero en ninguna parte — ni en `/tmp`, ni en
# `/dev/shm`, ni en una variable que el siguiente proceso no hereda.
#
# CONTROL DE ANULACION, con lo que MIDE — no con lo que se esperaba que midiera.
# Apuntando `_thyrox_workbench_delegate` a un modulo inexistente caen **3 de los
# 8** casos de este bloque: acunar, andamiar y el archivo dentro del run. Los
# ocho de `thyrox_work_file` de arriba sobreviven, como debe ser: reciben el run
# ya resuelto y no dependen del resolutor.
#
# Los **5 que sobreviven dentro del bloque miden otra cosa**, y esta bien que la
# midan — lo que no vale es no saberlo:
#
#   - «acunar NO crea nada» y «sin runs devuelve 1» y «rehusa sin slug» miden
#     REHUSE, y un modulo roto tambien rehusa. Su verde bajo la anulacion no
#     dice que el mecanismo funcione.
#   - «lo encuentra sin puntero» compara dos salidas que la anulacion vacia por
#     igual: vacio == vacio pasa.
#   - `export -f` mide la exportacion de la funcion, no su cuerpo.
#
# Es el sub-patron D de `metrica-decide-la-conclusion.md` aplicado a esta misma
# suite: sin correr la anulacion, los 8 se leerian como 8 controles del
# resolutor, y solo 3 lo son.

HOGAR="$(mktemp -d)"
export THYROX_WORKBENCH_DIR="$HOGAR"

ID="$(thyrox_run_id sonda-resolutor)"
thyrox_check "acuna un identificador con sufijo ISO basico" \
  "si" "$([[ "$ID" =~ ^sonda-resolutor-[0-9]{8}T[0-9]{6}$ ]] && echo si || echo no)"

thyrox_check "acunar NO crea nada en el hogar" \
  "vacio" "$([[ -z "$(ls -A "$HOGAR")" ]] && echo vacio || echo poblado)"

RUN="$(thyrox_scaffold_run sonda-resolutor)"
thyrox_check "el andamiaje crea el run bajo el hogar declarado" \
  "si" "$([[ -d "$RUN" && "$RUN" == "$HOGAR"/* ]] && echo si || echo no)"

thyrox_check "y el resolutor lo encuentra sin puntero" "$RUN" \
  "$(thyrox_latest_run sonda-resolutor)"

# El ciclo completo: lo que el episodio hacia con un archivo en /dev/shm.
NOTA="$(thyrox_work_file "$(thyrox_latest_run sonda-resolutor)" nota.txt)"
echo contenido > "$NOTA"
thyrox_check "el archivo de trabajo nace DENTRO del run" \
  "contenido" "$(cat "$RUN/nota.txt")"

thyrox_latest_run sin-runs-de-este-slug >/dev/null 2>&1
thyrox_check "sin runs devuelve 1, no una ruta inventada" 1 "$?"

thyrox_run_id >/dev/null 2>&1
thyrox_check "rehusa sin slug" 2 "$?"

bash -c 'declare -F thyrox_latest_run >/dev/null' && exportada=si || exportada=no
thyrox_check "el resolutor tambien se exporta a procesos hijos" "si" "$exportada"

unset THYROX_WORKBENCH_DIR
rm -rf "$HOGAR"

thyrox_summary "test-workbench-sh"
