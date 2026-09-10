#!/usr/bin/env bash
# @description Selects WHICH toolchain runs a piece of Python in the multi-repo.
#
# THYROX es el PROVEEDOR y gobierna varios arboles a la vez. Cada uno declara
# sus propias dependencias, asi que «python» no nombra una cosa sino tres:
#
#   thyrox        pyproject.toml  docutils, sphinx, spacy-lookups-data
#   kaupamex-api  pyproject.toml  Django, DRF, psycopg, pytest
#   kaupamex-docs pyproject.toml  Sphinx, Furo, plantuml
#
# La regla de reparto es de PROCEDENCIA, no de comodidad: las dependencias del
# MECANISMO las declara quien lo escribe —el proveedor— y las del SUJETO las
# declara quien lo posee —el consumidor—. Un gate de thyrox corriendo sobre el
# arbol de api es mecanismo del proveedor sobre sujeto del consumidor, y por
# eso necesita el interprete del PROVEEDOR aunque el archivo medido sea de api.
#
# El defecto que cierra esta medido: el puente de api delegaba con
# `sys.executable` —el interprete que hereda de quien lo invoca— y el mismo
# gate, sobre el mismo arbol y el mismo baseline, dio exit 1 con 2994
# incumplidores bajo `python3` y exit 0 bajo `uv run python`. La diferencia era
# si ese interprete podia importar el corpus, que sólo el proveedor declara.
#
# Adopta la forma que VVV le da a `provision/provision-helpers.sh` (MIT): se
# toma el MECANISMO, no el contenido — alli se provisiona WordPress y aqui no
# se provisiona nada. Los cuatro rasgos, con su cita:
#
#   1. guard de doble inclusion   `vvv: provision/provisioners.sh:5-8`
#   2. prefijo de namespace       las 41 funciones de VVV llevan `vvv_`
#   3. `export -f` por funcion    VVV lo hace en las 41
#   4. docblock shdoc             41 de 41 declaran `@description`
#
# @see src/lib/assert.sh — el precedente local que ya los adopto
# @see src/lib/reach.sh  — de donde salen las raices; aqui no se componen

# Guard de doble inclusion: sourcear dos veces es no-op.
if ( type thyrox_toolchain_provider_python &>/dev/null ); then return 0; fi

_THYROX_TOOLCHAIN_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$_THYROX_TOOLCHAIN_HERE/reach.sh"

# @description Ruta del interprete dentro de un entorno declarado, relativa a
# su raiz. Se declara una vez: escribirla en cada funcion seria la segunda
# fuente de verdad que `calibration-verified-numbers.md` prohibe para una cifra
# y vale igual para una ruta.
THYROX_TOOLCHAIN_INTERPRETER_PATH="${THYROX_TOOLCHAIN_INTERPRETER_PATH:-.venv/bin/python}"

# @description La raiz del proveedor: la variable declarada, o la que resuelve
# el localizador. La variable gana porque quien la exporta para UNA invocacion
# esta corrigiendo a proposito lo que el arbol dice para todas.
# @noargs
# @stdout La ruta absoluta de la raiz de THYROX.
function thyrox_toolchain_provider_root() {
  if [[ -n "${THYROX_ROOT:-}" ]]; then
    printf '%s' "$THYROX_ROOT"; return 0
  fi
  thyrox_root
}
export -f thyrox_toolchain_provider_root

# @description El interprete que corre el codigo PROPIO de THYROX: sus gates,
# su sesion, sus tareas. Sus dependencias las declara `thyrox: pyproject.toml`,
# asi que viven en el entorno del proveedor y en ningun otro.
# @noargs
# @stdout La ruta absoluta del interprete del proveedor.
# @exitcode 0 El entorno existe.
# @exitcode 2 No existe. REHUSA en vez de caer a `python3`: un fallback
#   silencioso reintroduce exactamente la divergencia que este archivo cierra,
#   y un veredicto emitido con el interprete equivocado no se distingue de uno
#   correcto — el sub-patron D de `metrica-decide-la-conclusion.md`.
function thyrox_toolchain_provider_python() {
  local root interpreter
  root="$(thyrox_toolchain_provider_root)" || return 2
  interpreter="$root/$THYROX_TOOLCHAIN_INTERPRETER_PATH"
  if [[ ! -x "$interpreter" ]]; then
    echo "thyrox_toolchain: el entorno del proveedor no existe en $interpreter." >&2
    echo "                  Generalo con \`cd $root && uv sync\`. NO se cae a" >&2
    echo "                  python3: el veredicto dependeria de quien invoca." >&2
    return 2
  fi
  printf '%s' "$interpreter"
}
export -f thyrox_toolchain_provider_python

# @description La raiz de un consumidor, por su nombre corto.
# @arg $1 string El nombre corto del clon: api, db, docs, server, ui.
# @stdout La ruta absoluta de la raiz del consumidor.
# @exitcode 1 Ningun clon declarado termina en ese nombre.
# @exitcode 2 Falta el argumento.
function thyrox_toolchain_consumer_root() {
  local name="${1:-}" root
  if [[ -z "$name" ]]; then
    echo "thyrox_toolchain_consumer_root: falta el nombre del clon" >&2; return 2
  fi
  # Las raices salen del localizador, que es su dueño. Componerlas aqui como
  # `<tree_root>/<prefijo>-<nombre>` codificaria el prefijo por segunda vez, y
  # el prefijo es declarable.
  while IFS= read -r root; do
    [[ "${root##*[-/]}" == "$name" ]] && { printf '%s' "$root"; return 0; }
  done < <(_thyrox_delegate --paths)
  echo "thyrox_toolchain_consumer_root: ningun clon declarado se llama '$name'" >&2
  return 1
}
export -f thyrox_toolchain_consumer_root

# @description El prefijo de argv que corre el codigo PROPIO de un consumidor:
# su suite, su build, su `manage.py`. Se invoca por SU proyecto —no por el del
# proveedor— porque sus dependencias las declara su `pyproject.toml`.
#
# Se emite `uv run --project <raiz>` y no la ruta del interprete: `uv` resuelve
# y sincroniza el entorno si hace falta, que es lo que el consumidor espera de
# su propia herramienta. El proveedor no la usa para si mismo porque su gate
# tiene que correr aunque el consumidor no tenga entorno.
# @arg $1 string El nombre corto del clon.
# @stdout El prefijo de argv, listo para anteponer al modulo.
function thyrox_toolchain_consumer_argv() {
  local root
  root="$(thyrox_toolchain_consumer_root "${1:-}")" || return $?
  printf 'uv run --project %s python' "$root"
}
export -f thyrox_toolchain_consumer_argv

# @description Los dos interpretes de un clon, uno por linea, para que un guion
# los lea sin volver a decidir. La primera linea es el del mecanismo, la segunda
# la del sujeto — el orden es el de la regla de reparto.
# @arg $1 string El nombre corto del clon.
function thyrox_toolchain_declare() {
  local name="${1:-}"
  printf 'provider=%s\n' "$(thyrox_toolchain_provider_python)" || return $?
  printf 'consumer=%s\n' "$(thyrox_toolchain_consumer_argv "$name")" || return $?
}
export -f thyrox_toolchain_declare
# @description El nombre del binario de fan-out por elemento. Declarado, no
# escrito en la funcion, por la misma razon que la ruta del interprete: un
# control necesita poder apuntar la busqueda a un nombre ausente sin vaciar el
# PATH, que romperia todo lo demas de la funcion.
THYROX_TOOLCHAIN_PARALLEL_BIN="${THYROX_TOOLCHAIN_PARALLEL_BIN:-parallel}"

# @description El comando que lo instala. Declarado por la misma razon: un
# control necesita inyectar un instalador que MIENTA —que salga cero sin
# instalar nada— para comprobar que el exito se prueba re-comprobando el
# binario y no leyendo el codigo de salida del instalador.
THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD="${THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD:-sudo apt-get install -y parallel}"

# @description Asegura GNU parallel, idempotente y con la instalacion como
# opt-in. Adopta el check-then-act de `vvv: provision/provision-helpers.sh:776`
# (`vvv_is_apt_pkg_installed`): se pregunta por el estado antes de actuar, y
# volver a llamar con el binario presente es un no-op.
#
# Tres cosas que no son cosmeticas:
#
#   1. Instalar es opt-in. Un efecto que el llamador no pidio es una sorpresa
#      en un `pre-commit` y una llamada de red que cuelga en CI. Ademas
#      `apt-get -s install parallel` resuelve DOS paquetes: arrastra `sysstat`.
#   2. El rechazo NO emite conteo. Un cero ahi no distinguiria «no hay» de «no
#      pude medir» — el sub-patron D de `metrica-decide-la-conclusion.md`, y
#      la misma forma que `require_lexicon` ya ejerce.
#   3. El exito se prueba RE-COMPROBANDO el binario. El codigo de salida de
#      `apt` es el significante; que el binario se pueda invocar es el
#      significado. Concluir del primero sobre el segundo es el sub-patron C.
# @noargs
# @exitcode 0 El binario esta disponible.
# @exitcode 2 No esta, y no se pudo o no se quiso instalar. REHUSA.
function thyrox_toolchain_require_parallel() {
  local bin="$THYROX_TOOLCHAIN_PARALLEL_BIN"

  if ! command -v "$bin" >/dev/null 2>&1; then
    if [[ "${THYROX_INSTALL_PARALLEL:-}" != "1" ]]; then
      echo "thyrox_toolchain: falta '$bin' y la instalacion es opt-in." >&2
      echo "                  Reintenta con THYROX_INSTALL_PARALLEL=1." >&2
      echo "                  NO se emite conteo: un cero aqui no distinguiria" >&2
      echo "                  «no hay» de «no pude medir»." >&2
      return 2
    fi
    # El codigo de salida del instalador NO decide: puede instalar en otro
    # interprete, o el proxy puede devolver algo que no es el paquete.
    $THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD >&2 2>&1 || true
    if ! command -v "$bin" >/dev/null 2>&1; then
      echo "thyrox_toolchain: el instalador termino y '$bin' sigue sin resolver." >&2
      echo "                  Se re-comprueba el binario, no se lee su exit." >&2
      return 2
    fi
  fi

  # GNU parallel BLOQUEA en su primera invocacion esperando que alguien teclee
  # el reconocimiento de la cita en un prompt. Medido: un `$(parallel
  # --version)` dentro de un heredoc colgo hasta el timeout. Un guion no
  # interactivo no puede conducir ese prompt, asi que se ESCRIBE el marcador
  # —que es lo que el propio `--citation` hace al aceptarse— en vez de
  # intentar responderle. El hogar es `PARALLEL_HOME` si esta declarado,
  # porque un control necesita un hogar aislado para poder fallar.
  if [[ "${bin##*/}" == "parallel" ]]; then
    local citation_home="${PARALLEL_HOME:-$HOME/.parallel}"
    if [[ ! -f "$citation_home/will-cite" ]]; then
      mkdir -p "$citation_home" && : > "$citation_home/will-cite"
    fi
  fi
  return 0
}
export -f thyrox_toolchain_require_parallel
