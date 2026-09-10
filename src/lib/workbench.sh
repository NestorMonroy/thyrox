#!/usr/bin/env bash
# =============================================================================
# workbench.sh — el archivo de trabajo nace DENTRO del run, no en /tmp
# =============================================================================
# Hermano de `assert.sh`, que ya adaptó de VVV el guard de doble inclusión, el
# prefijo de namespace, el `export -f` por función y el sed con guardas. Aquí va
# UNO más, con su consumidor medido — no por completitud del catálogo:
#
# `thyrox_work_file` <- la RAZÓN de `log_to_file` de VVV, no su forma.
#      VVV lo usa para que la salida de un provisioner sobreviva a la consola;
#      aquí el defecto medido es otro y peor: un archivo de trabajo —el mensaje
#      de un commit, la salida de una sonda— escrito en `/tmp` o en `/dev/shm`
#      muere con el contenedor, y con él la única pista de qué se hizo. Ocurrió
#      en esta sesión: un puntero en `/dev/shm` que ninguna otra sesión podía
#      leer. El mecanismo no es «un directorio mejor»: es que el archivo nazca
#      DENTRO del run del workbench, que es territorio versionable.
#
# El léxico, que este archivo estrenó mal y corrige. Nació como `bank.sh` con un
# parámetro `bank`, calcando «banco de trabajo». Falla por sus dos mitades:
#
# - El SIGNIFICANTE español es ambiguo: `banco` nombra a la vez la institución
#   financiera, el asiento, el cardumen y el banco de pruebas. Ninguno de los
#   cuatro es lo que este mecanismo toca.
# - El identificador inglés traducía el sentido equivocado: `bank` es la
#   institución o la orilla del río, nunca la mesa de trabajo. El término del
#   dominio ya existía en este mismo subsistema y es `workbench`
#   (`src/workbench/manifest.ts`, `.claude/workbench/`).
#
# Y la unidad que el parámetro nombra tampoco es el workbench entero: es UNA de
# sus ejecuciones fechadas, que el productor ya llama `run` —`runIdFor`,
# `runsFor`, `latestRun`—. De ahí `run_dir`.
#
# Lo que NO se porta, y sigue declarado:
#
# - `cmd_exists` con su caché. Se escribió y se retiró en el mismo pase: su
#   único consumidor posible es `src/lib/reach.sh`, que es el bootstrap y tiene
#   que seguir siendo autocontenido —sourcear otra biblioteca desde él invierte
#   la dependencia—. Dejarlo habría repetido el defecto que `assert.sh` nombra
#   en `logging.sh`: funciones correctas y cero consumidores.
# - El registro de hooks (`vvv_add_hook`/`vvv_hook`), por la razón que
#   `assert.sh` ya escribió, y porque su contraparte TypeScript sí existe
#   (`runHooks`).
# - La familia `vvv_apt_*`, `vvv_maybe_install_nginx_config`, `vvv_get_sites`:
#   son el DOMINIO de VVV, no su mecanismo.
# =============================================================================

# Guard de doble inclusión — `vvv: provision/provisioners.sh:5-8`.
[[ -n "${THYROX_WORKBENCH_SH_LOADED:-}" ]] && return 0
THYROX_WORKBENCH_SH_LOADED=1

# @description La ruta de un archivo de trabajo DENTRO del run, no en /tmp.
#
# Imprime la ruta y crea su directorio; no crea el archivo — quien lo escriba
# decide si es un heredoc, un volcado o una redirección.
#
# El run se pasa como argumento y no se adivina: un mecanismo que compusiera
# el hogar por `cwd` escribiría en el árbol equivocado cuando lo invoca un
# guion de otro clon, que es el defecto que `consumer_root` ya registró.
#
# REHÚSA si el run no existe, en vez de crearlo: un run es un artefacto con
# manifiesto, y fabricarlo aquí produciría uno sin las cinco claves — un
# directorio que el gate reporta como no conforme y que nadie pidió.
#
# @arg $1 string la ruta del run del workbench
# @arg $2 string el nombre del archivo
thyrox_work_file() {
  local run_dir="${1:-}" name="${2:-}"

  if [[ -z "$run_dir" || -z "$name" ]]; then
    echo "thyrox_work_file: se exigen el run y el nombre" >&2
    return 2
  fi
  if [[ ! -d "$run_dir" ]]; then
    echo "thyrox_work_file: el run «$run_dir» no existe. Se REHÚSA en vez de" >&2
    echo "  crearlo: un run sin manifiesto es un directorio que nadie pidio." >&2
    return 2
  fi
  # Un nombre con separador de ruta escaparía del run, que es exactamente lo
  # que este mecanismo existe para impedir.
  if [[ "$name" == */* ]]; then
    echo "thyrox_work_file: el nombre no lleva separador de ruta: $name" >&2
    return 2
  fi

  printf '%s/%s' "$run_dir" "$name"
}
export -f thyrox_work_file

# -----------------------------------------------------------------------------
# El RESOLUTOR — el run se encuentra, no se lleva a mano
# -----------------------------------------------------------------------------
# `thyrox_work_file` recibe el run y lo exige existente; hasta aquí, quien lo
# creaba tenía que llevarse el ISO a alguna parte, y esa parte fue un puntero en
# `/dev/shm`. El defecto no era el puntero: era que el mecanismo no ofrecía
# alternativa. Estas tres cierran el ciclo — acuñar, resolver, andamiar.
#
# Delegan a la mitad Python (`src/workbench/manifest.py`) por la misma razón que
# `reach.sh`: el criterio de qué es un run vive en UN sitio. Reimplementar aquí
# el patrón del ISO daría dos fuentes de verdad que nadie sincroniza.
#
# `_thyrox_ascend` viene de `reach.sh`, que se sourcea si no está cargado. NO se
# copia `_thyrox_delegate`: su propia cabecera prohíbe la segunda copia, y su
# modo `--value` no es el de este módulo.

# @description Delega en la mitad Python del manifiesto. Propaga su código.
# @arg $@ string el subcomando y sus argumentos
_thyrox_workbench_delegate() {
  local root output code

  if ! declare -F _thyrox_ascend >/dev/null 2>&1; then
    local here="${BASH_SOURCE[0]%/*}"
    # shellcheck source=/dev/null
    [[ -f "$here/reach.sh" ]] && source "$here/reach.sh"
  fi
  if ! declare -F _thyrox_ascend >/dev/null 2>&1; then
    echo "workbench.sh: no se pudo cargar reach.sh, que resuelve la raiz" >&2
    return 2
  fi

  root="$(_thyrox_ascend "$PWD")" || {
    echo "workbench.sh: no se hallo la raiz de THYROX ascendiendo desde $PWD" >&2
    return 2
  }

  output="$(cd "$root" && python3 -m src.workbench.manifest "$@" 2>&1)"
  code=$?
  [[ -n "$output" ]] && printf '%s\n' "$output"
  return $code
}

# @description El identificador de un run, sin crearlo.
# @arg $1 string el slug
thyrox_run_id() {
  [[ -z "${1:-}" ]] && { echo "thyrox_run_id: se exige el slug" >&2; return 2; }
  _thyrox_workbench_delegate run-id "$1"
}

# @description Los runs de un slug, del mas reciente al mas antiguo.
#
# Devuelve 1 si no hay ninguno — un cero de salida con lista vacia no
# distinguiria «no hay runs» de «los hay y el filtro no los vio».
# @arg $1 string el slug
thyrox_runs_for() {
  [[ -z "${1:-}" ]] && { echo "thyrox_runs_for: se exige el slug" >&2; return 2; }
  _thyrox_workbench_delegate runs "$1"
}

# @description El run mas reciente de un slug. Devuelve 1 si no hay ninguno.
# @arg $1 string el slug
thyrox_latest_run() {
  [[ -z "${1:-}" ]] && { echo "thyrox_latest_run: se exige el slug" >&2; return 2; }
  _thyrox_workbench_delegate latest "$1"
}

# @description Crea el run y devuelve su ruta. El hogar lo resuelve el
# gobernador de rutas (`THYROX_WORKBENCH_DIR`); este guion no lo compone.
# @arg $1 string el slug
thyrox_scaffold_run() {
  [[ -z "${1:-}" ]] && { echo "thyrox_scaffold_run: se exige el slug" >&2; return 2; }
  _thyrox_workbench_delegate scaffold "$1"
}

# `export -f` por función — el cuarto mecanismo de VVV que este árbol adapta
# (`vvv: provision/provision-helpers.sh:311,322,948`): un provisioner invocado
# en un subshell no hereda funciones si no se exportan.
export -f thyrox_run_id thyrox_runs_for thyrox_latest_run thyrox_scaffold_run \
    _thyrox_workbench_delegate 2>/dev/null || true
