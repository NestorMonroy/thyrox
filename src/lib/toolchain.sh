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
export THYROX_TOOLCHAIN_INTERPRETER_PATH

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
  # `_thyrox_delegate` emite con `printf '%s'` —sin salto final—, y un `read`
  # sin la segunda condicion descarta la ULTIMA linea. Con varias raices solo
  # se perdia la ultima; con una sola, el selector no veia ninguna.
  while IFS= read -r root || [[ -n "$root" ]]; do
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
export THYROX_TOOLCHAIN_PARALLEL_BIN

# @description El comando que lo instala. Declarado por la misma razon: un
# control necesita inyectar un instalador que MIENTA —que salga cero sin
# instalar nada— para comprobar que el exito se prueba re-comprobando el
# binario y no leyendo el codigo de salida del instalador.
THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD="${THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD:-sudo apt-get install -y parallel}"
export THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD

# @description El hogar de estado de GNU parallel: hermano de `.venv`, en la
# RAIZ del proveedor.
#
# El default de parallel es `$HOME/.parallel`, que es estado del CONTENEDOR —
# se pierde al reciclarlo y no lo ve ningun clon. Pero `.claude/` tampoco es
# su sitio, y esto se midio en vez de suponerse: de sus diez subdirectorios,
# NUEVE llevan archivos versionados (332 skills, 415 de workbench, 27
# comandos, 6 reglas) y ninguno esta ignorado. `.claude/` es gobierno y
# evidencia, no estado efimero, y lo que ahi vive lo escribe LA SESION.
#
# El estado que escribe una HERRAMIENTA DE TERCEROS ya tiene su clase en este
# arbol, y esta en la raiz y gitignored: `.venv` lo escribe uv, `node_modules`
# lo escribe npm, `.pytest_cache` lo escribe pytest. El marcador de cita lo
# escribe parallel una vez, jamas la sesion: es de esa clase. Su nombre es
# ademas el que el propio parallel usa, solo que enraizado en el proveedor en
# vez de en el contenedor.
#
# `PARALLEL_HOME` declarado gana, por la misma razon que `THYROX_ROOT` gana
# sobre el localizador: quien lo exporta para UNA invocacion esta corrigiendo
# a proposito lo que el arbol dice para todas.
# @noargs
# @stdout La ruta absoluta del hogar de estado de parallel.
function thyrox_toolchain_parallel_home() {
  if [[ -n "${PARALLEL_HOME:-}" ]]; then
    printf '%s' "$PARALLEL_HOME"; return 0
  fi
  local root
  root="$(thyrox_toolchain_provider_root)" || return 2
  printf '%s/.parallel' "$root"
}
export -f thyrox_toolchain_parallel_home

# @description Adquiere un binario externo: el contrato comun de todo
# `require_*` de esta cadena, en un solo sitio. Tres desenlaces:
#
#   presente                       -> 0, sin efectos;
#   ausente y sin opt-in           -> 2, sin conteo;
#   ausente con opt-in             -> instala y RE-COMPRUEBA el binario; el
#                                     codigo de salida del instalador no
#                                     decide (puede instalar en otro prefijo,
#                                     o el proxy devolver otra cosa).
#
# El rechazo no emite conteo: un cero ahi no distinguiria «no hay» de «no
# pude medir» (sub-patron D de `metrica-decide-la-conclusion.md`).
# @arg $1 string El binario a resolver.
# @arg $2 string El NOMBRE de la variable de opt-in (p. ej. THYROX_INSTALL_GAWK).
# @arg $3 string El comando que lo instala.
# @arg $4 string Opcional: el paquete que lo trae, para nombrarlo en el rechazo.
# @exitcode 0 El binario esta disponible.
# @exitcode 2 No esta, y no se pudo o no se quiso instalar.
function thyrox_toolchain_acquire_binary() {
  local bin="$1" opt_in_var="$2" install_cmd="$3" package="${4:-}"
  command -v "$bin" >/dev/null 2>&1 && return 0
  if [[ "${!opt_in_var:-}" != "1" ]]; then
    echo "thyrox_toolchain: falta '$bin'${package:+ (paquete $package)} y la instalacion es opt-in." >&2
    echo "                  Reintenta con $opt_in_var=1." >&2
    echo "                  NO se emite conteo: un cero aqui no distinguiria" >&2
    echo "                  «no hay» de «no pude medir»." >&2
    return 2
  fi
  $install_cmd >&2 2>&1 || true
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "thyrox_toolchain: el instalador termino y '$bin' sigue sin resolver." >&2
    echo "                  Se re-comprueba el binario, no se lee su exit." >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_acquire_binary

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
  local bin="${THYROX_TOOLCHAIN_PARALLEL_BIN:-parallel}"

  thyrox_toolchain_acquire_binary "$bin" THYROX_INSTALL_PARALLEL \
    "$THYROX_TOOLCHAIN_PARALLEL_INSTALL_CMD" parallel || return 2

  # `moreutils` instala otro `/usr/bin/parallel`. La presencia y el nombre
  # coinciden, pero su CLI no implementa `--jobs`, que es el contrato que
  # consumen los pools de Thyrox. Sólo se exige esta identidad al nombre
  # canónico; los tests pueden inyectar `sh` para medir el flujo genérico.
  if [[ "${bin##*/}" == "parallel" ]]; then
    local version
    version="$($bin --version 2>&1)" || version=""
    if [[ "$version" != GNU\ parallel* ]]; then
      echo "thyrox_toolchain: '$bin' resuelve, pero no es GNU parallel." >&2
      echo "                  Instala el paquete 'parallel'; moreutils no implementa --jobs." >&2
      echo "                  NO se emite conteo: el pool solicitado no se pudo ejecutar." >&2
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
    local citation_home; citation_home="$(thyrox_toolchain_parallel_home)"
    if [[ ! -f "$citation_home/will-cite" ]]; then
      mkdir -p "$citation_home" && : > "$citation_home/will-cite"
    fi
  fi
  return 0
}
export -f thyrox_toolchain_require_parallel

# @description El comando que instala el extractor de texto de PDF. Declarado
# por la misma razon que su hermano de parallel: un control necesita inyectar
# un instalador que MIENTA para probar que el exito se re-comprueba.
export THYROX_TOOLCHAIN_PDF_TEXT_INSTALL_CMD="${THYROX_TOOLCHAIN_PDF_TEXT_INSTALL_CMD:-sudo apt-get install -y poppler-utils}"

# @description Asegura `pdftotext` (poppler-utils), el extractor primario de
# `src/corpus/pdf_to_text.py`. Mismo contrato que
# `thyrox_toolchain_require_parallel`: instalar es opt-in
# (`THYROX_INSTALL_PDF_TEXT=1`), el rechazo no emite conteo y el exito se
# prueba re-comprobando el binario, no leyendo el exit del instalador.
#
# `bin/pdf_to_text` es el envoltorio; el extractor es un binario de sistema y
# por eso no viaja en `bin/`. Esta funcion es lo que lo hace pedible desde el
# arbol en vez de instalarlo a mano.
# @noargs
# @exitcode 0 El binario esta disponible.
# @exitcode 2 No esta, y no se pudo o no se quiso instalar. REHUSA.
function thyrox_toolchain_require_pdf_text() {
  thyrox_toolchain_acquire_binary "${THYROX_TOOLCHAIN_PDFTOTEXT_BIN:-pdftotext}" \
    THYROX_INSTALL_PDF_TEXT "$THYROX_TOOLCHAIN_PDF_TEXT_INSTALL_CMD" poppler-utils
}
export -f thyrox_toolchain_require_pdf_text

# @description El comando que instala GNU Time. Declarado por la misma razon
# que sus hermanos: un control necesita un instalador que MIENTA.
export THYROX_TOOLCHAIN_TIME_INSTALL_CMD="${THYROX_TOOLCHAIN_TIME_INSTALL_CMD:-sudo apt-get install -y time}"

# @description La ruta de GNU Time. Absoluta a proposito: `time` es tambien
# una palabra reservada de bash, y `command -v time` la responde aunque el
# binario no exista.
# @noargs
# @stdout La ruta del binario.
function thyrox_toolchain_gnu_time_bin() {
  echo "${THYROX_TOOLCHAIN_TIME_BIN:-/usr/bin/time}"
}
export -f thyrox_toolchain_gnu_time_bin

# @description Asegura GNU Time, que da la memoria pico (max RSS) de un
# comando ademas de su pared y su CPU; el `time` de bash no da memoria. Mismo
# contrato que `thyrox_toolchain_require_pdf_text` (opt-in con
# `THYROX_INSTALL_GNU_TIME=1`, rechazo sin conteo, exito re-comprobado) y una
# identidad como la de parallel: el binario tiene que declararse GNU, porque
# el formato `-f` que se consume es el suyo.
# @noargs
# @exitcode 0 GNU Time esta disponible.
# @exitcode 2 No esta, no es GNU, o no se pudo o no se quiso instalar. REHUSA.
function thyrox_toolchain_require_gnu_time() {
  local bin; bin="$(thyrox_toolchain_gnu_time_bin)"
  thyrox_toolchain_acquire_binary "$bin" THYROX_INSTALL_GNU_TIME \
    "$THYROX_TOOLCHAIN_TIME_INSTALL_CMD" time || return 2
  # Expandido desde una variable, `time` ya no es la palabra reservada: se
  # ejecuta como programa, y si no existe la identidad sale vacia.
  local version
  version="$("$bin" --version 2>&1)" || version=""
  # Se busca la marca, no una version: el paquete de Ubuntu imprime
  # "time (GNU Time) UNKNOWN".
  if [[ "$version" != *"GNU Time"* ]]; then
    echo "thyrox_toolchain: '$bin' no es GNU time; su formato -f no es el que se consume." >&2
    echo "                  Instala el paquete time con THYROX_INSTALL_GNU_TIME=1." >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_require_gnu_time

# @description El binario de `awk` que los guiones de este arbol invocan.
#
# El eje NO es si gawk esta instalado: es CUAL awk responde. En Debian `awk`
# resuelve por `/etc/alternatives/awk`, asi que gawk puede estar presente y el
# nombre `awk` seguir apuntando a mawk. `command -v gawk` por si solo mide el
# fenomeno equivocado — es el sub-patron C de `metrica-decide-la-conclusion.md`
# aplicado a la cadena de herramientas.
#
# Declarado —y no fijo a `gawk`— porque lo que hay que proteger es el nombre
# que los guiones ESCRIBEN, y porque un control necesita poder apuntarlo a un
# awk concreto sin mutar el sistema.
THYROX_TOOLCHAIN_AWK_BIN="${THYROX_TOOLCHAIN_AWK_BIN:-awk}"
export THYROX_TOOLCHAIN_AWK_BIN

# @description El comando que instala gawk. Declarado por la misma razon que
# su hermano de parallel: un control necesita inyectar un instalador que
# MIENTA —que salga cero sin instalar nada— para comprobar que el exito se
# prueba re-comprobando el binario y no leyendo el exit del instalador.
export THYROX_TOOLCHAIN_GAWK_INSTALL_CMD="${THYROX_TOOLCHAIN_GAWK_INSTALL_CMD:-sudo apt-get install -y gawk}"

# @description El programa que separa gawk de mawk por CONDUCTA.
#
# No es un constructo inventado para la sonda: es el que ya costo un episodio
# medido. `check-hallazgo-sucesor.sh` llevaba un cuantificador de intervalo
# seguido de un grupo en una de sus ocho alternativas; bajo mawk 1.3.4 eso
# revienta el compilador de expresiones regulares —exit 100, `REcompile() -
# panic`— y mata la rama de prosa entera. El gate publicaba «6 incumplidores
# sobre 377 archivos» cuando la medicion real era «13 sobre 1002»: una cifra
# sana sobre un tercio del corpus, que es el modo de fallo mas caro porque no
# parece un fallo (h-docs-1068).
#
# Se declara para que el control pueda citarlo sin transcribirlo: una copia en
# la suite seria la segunda fuente de verdad que `bg.sh marker-pattern` existe
# para evitar.
export THYROX_TOOLCHAIN_AWK_PROBE_PROGRAM='/a.{0,3}(x)/{print "MATCH"}'
export THYROX_TOOLCHAIN_AWK_PROBE_INPUT='aaax'

# Las tres constantes de arriba van con `export` y no es simetria decorativa:
# la sonda lleva `export -f`, que PROMETE que un hijo puede llamarla, y un hijo
# que herede solo la funcion recibe el programa VACIO. Medido antes de
# corregirlo: `bash -c 'thyrox_toolchain_awk_supports_intervals gawk'` daba
# exit 1 sobre gawk — un rechazo de conducta FALSO, que es peor que no tener
# guard, porque acusa al binario correcto. El caso 14 de la suite lo mide.
#
# No llevan `${VAR:-...}` a proposito: el constructo NO es parametro. Un
# llamador que pudiera reemplazarlo podria desactivar el eje de conducta
# entero pasando un programa que case con cualquier cosa.
# @description Responde el awk dado al constructo de intervalo mas grupo.
#
# Mide CONDUCTA, no nombre ni version: un awk que no sea gawk pero compile el
# constructo pasa, y debe pasar — lo que el arbol necesita es que la expresion
# no reviente, no que el binario se llame de una manera.
# @arg $1 string El binario a sondear. Por defecto, THYROX_TOOLCHAIN_AWK_BIN.
# @exitcode 0 El constructo compila y casa.
# @exitcode 1 No compila, no casa, o el binario no se pudo invocar.
function thyrox_toolchain_awk_supports_intervals() {
  local bin="${1:-${THYROX_TOOLCHAIN_AWK_BIN:-awk}}"
  local out
  out="$(printf '%s\n' "$THYROX_TOOLCHAIN_AWK_PROBE_INPUT" \
         | "$bin" "$THYROX_TOOLCHAIN_AWK_PROBE_PROGRAM" 2>/dev/null)" || return 1
  [[ "$out" == "MATCH" ]]
}
export -f thyrox_toolchain_awk_supports_intervals

# @description Asegura un `awk` que compile intervalos, con DOS ejes y dos
# rechazos distintos.
#
# La forma es la de `require_parallel` —check-then-act, instalacion opt-in,
# exito probado re-comprobando y no leyendo el exit del instalador— con una
# diferencia que no es cosmetica: aqui la presencia NO basta.
#
#   1. PRESENCIA — que el nombre resuelva a algo ejecutable. Su remedio es
#      instalar, y por eso es opt-in.
#   2. CONDUCTA — que ESE binario compile el constructo. Su remedio NO es
#      instalar: gawk puede estar ya instalado y `awk` seguir siendo mawk.
#
# Por que el rechazo del eje 2 no intenta arreglarlo solo: flipar el enlace
# con `update-alternatives --set awk gawk` es una mutacion GLOBAL del sistema
# que exige root y cambia el comportamiento de todo lo que corra en la maquina,
# incluido lo que no es de este arbol. La forma durable de un mecanismo que no
# puede arreglar algo es rehusar nombrando las dos salidas, no mutar el
# entorno de nadie por su cuenta.
# CIEGO AL LOCALE, y es un eje hermano que este guard NO mide. El mismo
# gawk cuenta octetos o code points segun `LC_CTYPE`: medido, `áéí` da 6
# sin locale declarado y 3 bajo `LC_ALL=C.UTF-8` — y este contenedor no
# declara ninguno. Un guion que mida ANCHURA con awk necesita ademas ese
# eje; `src/verify/commit_message.py` lo evito usando Python, y su nota
# lo razona. Pasar este guard NO autoriza a medir columnas con awk.
# @noargs
# @exitcode 0 El awk resuelto compila intervalos.
# @exitcode 2 No resuelve, o resuelve a un awk que no los compila. REHUSA.
function thyrox_toolchain_require_gawk() {
  local bin="${THYROX_TOOLCHAIN_AWK_BIN:-awk}"

  # Eje 1 — PRESENCIA.
  thyrox_toolchain_acquire_binary "$bin" THYROX_INSTALL_GAWK \
    "$THYROX_TOOLCHAIN_GAWK_INSTALL_CMD" gawk || return 2

  # Eje 2 — CONDUCTA. Es el que la presencia no puede ver.
  if ! thyrox_toolchain_awk_supports_intervals "$bin"; then
    echo "thyrox_toolchain: '$bin' resuelve, pero NO compila intervalos." >&2
    echo "                  Sonda: $THYROX_TOOLCHAIN_AWK_PROBE_PROGRAM" >&2
    echo "                  Instalar gawk NO lo arregla: en Debian el nombre" >&2
    echo "                  'awk' lo decide /etc/alternatives/awk, no el" >&2
    echo "                  paquete. Las dos salidas son declarar" >&2
    echo "                  THYROX_TOOLCHAIN_AWK_BIN=gawk para esta invocacion," >&2
    echo "                  o que el ejecutor decida el enlace del sistema con" >&2
    echo "                  update-alternatives, que es mutacion global." >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_require_gawk

# ---------------------------------------------------------------------------
# poppler: `pdftotext` y `pdftoppm`, los dos ejes de `require_gawk`.
# ---------------------------------------------------------------------------

# @description Los binarios de poppler. `pdftotext` ya estaba declarado (lo lee
# `src/corpus/pdf_to_text.py`); `pdftoppm` rinde paginas a imagen para el QA
# visual de un PDF. Declarados para que un control apunte a un nombre ausente o
# a un binario falso sin tocar el PATH.
export THYROX_TOOLCHAIN_PDFTOTEXT_BIN="${THYROX_TOOLCHAIN_PDFTOTEXT_BIN:-pdftotext}"
export THYROX_TOOLCHAIN_PDFTOPPM_BIN="${THYROX_TOOLCHAIN_PDFTOPPM_BIN:-pdftoppm}"

# @description El comando que instala poppler. Declarado para que un control
# inyecte un instalador que MIENTA.
export THYROX_TOOLCHAIN_POPPLER_INSTALL_CMD="${THYROX_TOOLCHAIN_POPPLER_INSTALL_CMD:-sudo apt-get install -y poppler-utils}"

# @description El PDF de la sonda, en base64: una pagina con el texto
# THYROX-PDF-PROBE en Helvetica, 589 bytes, con su tabla xref correcta. Va
# dentro de la biblioteca y no se genera: generarlo exigiria TeX u otra
# herramienta, y la sonda de poppler no puede depender de lo que no mide.
# No lleva `${VAR:-...}`: la sonda no es parametro, y un llamador que la
# reemplazara podria desactivar el eje de conducta.
export THYROX_TOOLCHAIN_POPPLER_PROBE_PDF_B64='JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgNTBdIC9Db250ZW50cyA0IDAgUiAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiA+PiA+PiA+PgplbmRvYmoKNCAwIG9iago8PCAvTGVuZ3RoIDQ2ID4+CnN0cmVhbQpCVCAvRjEgMTIgVGYgMTAgMjAgVGQgKFRIWVJPWC1QREYtUFJPQkUpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL0Jhc2VGb250IC9IZWx2ZXRpY2EgPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI0MCAwMDAwMCBuIAowMDAwMDAwMzM2IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNiAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNDA2CiUlRU9GCg=='
export THYROX_TOOLCHAIN_POPPLER_PROBE_TEXT='THYROX-PDF-PROBE'

# @description ¿Hacen los dos binarios lo que se les pide sobre el PDF de la
# sonda? Mide CONDUCTA: `pdftotext` tiene que devolver el texto y `pdftoppm`
# tiene que ESCRIBIR una imagen no vacia; su codigo de salida no decide.
# @noargs
# @stderr El binario que fallo y como.
# @exitcode 0 Los dos cumplen.
# @exitcode 1 Alguno no.
function thyrox_toolchain_poppler_works() {
  local dir rc=0
  dir="$(mktemp -d)" || return 1
  printf '%s' "$THYROX_TOOLCHAIN_POPPLER_PROBE_PDF_B64" | base64 -d > "$dir/probe.pdf" 2>/dev/null
  if ! "$THYROX_TOOLCHAIN_PDFTOTEXT_BIN" "$dir/probe.pdf" - 2>/dev/null \
       | grep -q "$THYROX_TOOLCHAIN_POPPLER_PROBE_TEXT"; then
    echo "thyrox_toolchain: '$THYROX_TOOLCHAIN_PDFTOTEXT_BIN' no extrae el texto del PDF de la sonda." >&2
    rc=1
  fi
  "$THYROX_TOOLCHAIN_PDFTOPPM_BIN" -png -r 20 "$dir/probe.pdf" "$dir/page" >/dev/null 2>&1
  if ! compgen -G "$dir/page*.png" >/dev/null || [[ ! -s "$(compgen -G "$dir/page*.png" | head -n 1)" ]]; then
    echo "thyrox_toolchain: '$THYROX_TOOLCHAIN_PDFTOPPM_BIN' no escribio la imagen de la pagina." >&2
    rc=1
  fi
  rm -rf "$dir"
  return "$rc"
}
export -f thyrox_toolchain_poppler_works

# @description Los binarios de poppler que no resuelven, uno por linea.
function thyrox_toolchain_poppler_missing() {
  local bin
  for bin in "$THYROX_TOOLCHAIN_PDFTOTEXT_BIN" "$THYROX_TOOLCHAIN_PDFTOPPM_BIN"; do
    command -v "$bin" >/dev/null 2>&1 || printf '%s\n' "$bin"
  done
}
export -f thyrox_toolchain_poppler_missing

# @description Asegura `pdftotext` y `pdftoppm` que funcionen, con los dos
# ejes y los dos rechazos de `require_gawk`.
#
#   1. PRESENCIA — que los dos nombres resuelvan. Remedio: instalar poppler,
#      opt-in con THYROX_INSTALL_POPPLER=1, y el exito se prueba
#      re-comprobando los binarios, no leyendo el exit del instalador.
#   2. CONDUCTA — que ESOS binarios procesen el PDF de la sonda. Un binario
#      presente puede ser otro programa con el mismo nombre, o una version que
#      falle sobre el PDF; su rechazo nombra el binario, no el paquete.
# @noargs
# @exitcode 0 Los dos resuelven y funcionan.
# @exitcode 2 Falta alguno o alguno no funciona. REHUSA.
function thyrox_toolchain_require_poppler() {
  local missing
  missing="$(thyrox_toolchain_poppler_missing)"
  if [[ -n "$missing" ]]; then
    if [[ "${THYROX_INSTALL_POPPLER:-}" != "1" ]]; then
      echo "thyrox_toolchain: no resuelve: $(tr '\n' ' ' <<<"$missing")" >&2
      echo "                  La instalacion de poppler es opt-in." >&2
      echo "                  Reintenta con THYROX_INSTALL_POPPLER=1." >&2
      echo "                  NO se emite conteo: un cero aqui no distinguiria" >&2
      echo "                  «no hay» de «no pude medir»." >&2
      return 2
    fi
    $THYROX_TOOLCHAIN_POPPLER_INSTALL_CMD >&2 2>&1 || true
    missing="$(thyrox_toolchain_poppler_missing)"
    if [[ -n "$missing" ]]; then
      echo "thyrox_toolchain: el instalador termino y sigue sin resolver: $(tr '\n' ' ' <<<"$missing")" >&2
      echo "                  Se re-comprueban los binarios, no se lee su exit." >&2
      return 2
    fi
  fi
  if ! thyrox_toolchain_poppler_works; then
    echo "thyrox_toolchain: los binarios resuelven, pero no procesan el PDF de la sonda." >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_require_poppler

# ---------------------------------------------------------------------------
# TeX Live: `xelatex` y los paquetes que el consumidor declara.
# ---------------------------------------------------------------------------

# @description El compilador. Declarado para que un control apunte a un nombre
# ausente o a un compilador falso.
export THYROX_TOOLCHAIN_XELATEX_BIN="${THYROX_TOOLCHAIN_XELATEX_BIN:-xelatex}"

# @description El documento minimo con que se sondea cuando el consumidor no
# declara el suyo. No lleva `${VAR:-...}`: la sonda no es parametro.
export THYROX_TOOLCHAIN_TEXLIVE_PROBE_DOC='\documentclass{article}\begin{document}THYROX\end{document}'

# @description Que paquetes de TeX Live se instalan. Es parametro del
# CONSUMIDOR, no del proveedor: thyrox no compila documentos, y cada consumidor
# sabe que paquetes piden los suyos (idioma, tikz, fuentes). Sin declarar, el
# minimo que da `xelatex`.
function thyrox_toolchain_texlive_packages() {
  printf '%s' "${THYROX_TOOLCHAIN_TEXLIVE_PACKAGES:-texlive-xetex}"
}
export -f thyrox_toolchain_texlive_packages

# @description ¿Compila el documento declarado a un PDF no vacio? Mide
# CONDUCTA: el codigo de salida del compilador no decide, decide el PDF.
# Compila en un directorio temporal, con el cwd en el del documento para que
# sus rutas relativas resuelvan, y no deja nada junto a el.
# @arg $1 string El .tex a compilar. Por defecto, THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE
#   o el documento minimo.
# @stderr La primera linea de error del log, que nombra el paquete que falta.
# @exitcode 0 Hay PDF. @exitcode 1 No lo hay.
function thyrox_toolchain_texlive_compiles() {
  local file="${1:-${THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE:-}}" dir base rc=0
  dir="$(mktemp -d)" || return 1
  if [[ -z "$file" ]]; then
    printf '%s\n' "$THYROX_TOOLCHAIN_TEXLIVE_PROBE_DOC" > "$dir/probe.tex"
    file="$dir/probe.tex"
  fi
  file="$(cd "$(dirname "$file")" && pwd)/$(basename "$file")"
  base="$(basename "$file" .tex)"
  (cd "$(dirname "$file")" && timeout 300 "$THYROX_TOOLCHAIN_XELATEX_BIN" \
      -interaction=nonstopmode -halt-on-error -output-directory "$dir" "$file") >/dev/null 2>&1
  if [[ ! -s "$dir/$base.pdf" ]]; then
    rc=1
    local cause
    cause="$(grep -m1 -E '^! ' "$dir/$base.log" 2>/dev/null)"
    echo "thyrox_toolchain: '$THYROX_TOOLCHAIN_XELATEX_BIN' no produjo el PDF de $(basename "$file")." >&2
    [[ -n "$cause" ]] && echo "                  $cause" >&2
  fi
  rm -rf "$dir"
  return "$rc"
}
export -f thyrox_toolchain_texlive_compiles

# @description Asegura un `xelatex` que compile el documento del consumidor,
# con los dos ejes de `require_gawk`. A diferencia de awk, el rechazo de
# conducta SI se remedia instalando: casi siempre es un paquete que falta.
#
#   1. PRESENCIA — que `xelatex` resuelva. Opt-in con THYROX_INSTALL_TEXLIVE=1.
#   2. CONDUCTA — que compile el documento declarado. Con opt-in, se instalan
#      los paquetes declarados y se compila otra vez; el exito se prueba con el
#      PDF, nunca con el exit del instalador.
# @noargs
# @exitcode 0 Compila. @exitcode 2 No resuelve o no compila. REHUSA.
function thyrox_toolchain_require_texlive() {
  local bin="$THYROX_TOOLCHAIN_XELATEX_BIN" installed=0
  local cmd="${THYROX_TOOLCHAIN_TEXLIVE_INSTALL_CMD:-sudo apt-get install -y --no-install-recommends $(thyrox_toolchain_texlive_packages)}"

  if ! command -v "$bin" >/dev/null 2>&1; then
    if [[ "${THYROX_INSTALL_TEXLIVE:-}" != "1" ]]; then
      echo "thyrox_toolchain: '$bin' no resuelve y la instalacion es opt-in." >&2
      echo "                  Reintenta con THYROX_INSTALL_TEXLIVE=1." >&2
      echo "                  NO se emite conteo: un cero aqui no distinguiria" >&2
      echo "                  «no hay» de «no pude medir»." >&2
      return 2
    fi
    $cmd >&2 2>&1 || true
    installed=1
    if ! command -v "$bin" >/dev/null 2>&1; then
      echo "thyrox_toolchain: el instalador termino y '$bin' sigue sin resolver." >&2
      echo "                  Se re-comprueba el binario, no se lee su exit." >&2
      return 2
    fi
  fi

  thyrox_toolchain_texlive_compiles 2>/dev/null && return 0
  if [[ "${THYROX_INSTALL_TEXLIVE:-}" == "1" && $installed -eq 0 ]]; then
    $cmd >&2 2>&1 || true
    thyrox_toolchain_texlive_compiles 2>/dev/null && return 0
  fi
  thyrox_toolchain_texlive_compiles
  echo "                  '$bin' resuelve, pero el documento no compila. Declara los" >&2
  echo "                  paquetes que pide en THYROX_TOOLCHAIN_TEXLIVE_PACKAGES" >&2
  echo "                  y reintenta con THYROX_INSTALL_TEXLIVE=1." >&2
  return 2
}
export -f thyrox_toolchain_require_texlive

# @description La sonda del preflight. thyrox no compila documentos: un aviso
# en cada consumidor que no usa TeX saldria siempre y se aprenderia a ignorar,
# y un `ok` sin medir seria un verde falso. Por eso, si el consumidor no declara
# TeX (ni paquetes ni documento), la sonda se OMITE con exit 3 y lo dice.
# @exitcode 0 Compila. @exitcode 2 Rehusa. @exitcode 3 Omitida: no declarado.
function thyrox_toolchain_probe_texlive() {
  if [[ -z "${THYROX_TOOLCHAIN_TEXLIVE_PACKAGES:-}${THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE:-}" ]]; then
    echo "thyrox_toolchain: el consumidor no declara TeX (THYROX_TOOLCHAIN_TEXLIVE_PACKAGES" >&2
    echo "                  ni THYROX_TOOLCHAIN_TEXLIVE_PROBE_FILE); la sonda se omite." >&2
    return 3
  fi
  thyrox_toolchain_require_texlive
}
export -f thyrox_toolchain_probe_texlive

# @description hunspell: revisión ortográfica contra el diccionario que el
# consumidor declara.
#
# Mismos ejes que GNU parallel y poppler: la instalación es opt-in
# (THYROX_INSTALL_HUNSPELL=1), el éxito se prueba volviendo a buscar el binario
# y la sonda mide conducta. El proveedor no supone un idioma: el consumidor
# declara el diccionario (THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY, ruta sin
# extensión o nombre instalado) y un par de sonda, una palabra que tiene que
# aceptar (…_PROBE_ACCEPT) y otra que tiene que rechazar (…_PROBE_REJECT). Un
# diccionario que acepta todo, o que rechaza todo, resuelve como binario y no
# mide nada; por eso la sonda exige las dos mitades.
export THYROX_TOOLCHAIN_HUNSPELL_BIN="${THYROX_TOOLCHAIN_HUNSPELL_BIN:-hunspell}"
export THYROX_TOOLCHAIN_HUNSPELL_INSTALL_CMD="${THYROX_TOOLCHAIN_HUNSPELL_INSTALL_CMD:-sudo apt-get install -y hunspell}"

# @description ¿Acepta el diccionario la palabra buena y rechaza la mala?
# @exitcode 0 Las dos mitades se cumplen.
# @exitcode 1 Alguna no, o el binario no se pudo invocar.
function thyrox_toolchain_hunspell_works() {
  local dictionary="${THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY:-}"
  local accept="${THYROX_TOOLCHAIN_HUNSPELL_PROBE_ACCEPT:-}" reject="${THYROX_TOOLCHAIN_HUNSPELL_PROBE_REJECT:-}"
  local rejected
  rejected="$(printf '%s\n%s\n' "$accept" "$reject" \
      | LANG=C.UTF-8 "$THYROX_TOOLCHAIN_HUNSPELL_BIN" -i utf-8 -d "$dictionary" -l 2>/dev/null)"
  if [[ "$rejected" == *"$accept"* ]]; then
    echo "thyrox_toolchain: hunspell con '$dictionary' rechaza '$accept', que tiene que aceptar." >&2
    return 1
  fi
  if [[ "$rejected" != *"$reject"* ]]; then
    echo "thyrox_toolchain: hunspell con '$dictionary' acepta '$reject', que tiene que rechazar." >&2
    return 1
  fi
  return 0
}
export -f thyrox_toolchain_hunspell_works

function thyrox_toolchain_require_hunspell() {
  local bin="$THYROX_TOOLCHAIN_HUNSPELL_BIN"
  if ! command -v "$bin" >/dev/null 2>&1; then
    if [[ "${THYROX_INSTALL_HUNSPELL:-}" != "1" ]]; then
      echo "thyrox_toolchain: falta '$bin' y la instalación es opt-in." >&2
      echo "                  Reintenta con THYROX_INSTALL_HUNSPELL=1." >&2
      echo "                  NO se emite conteo: un cero aquí no distinguiría" >&2
      echo "                  «no hay» de «no pude medir»." >&2
      return 2
    fi
    $THYROX_TOOLCHAIN_HUNSPELL_INSTALL_CMD >&2 2>&1 || true
    if ! command -v "$bin" >/dev/null 2>&1; then
      echo "thyrox_toolchain: el instalador terminó y '$bin' sigue sin resolver." >&2
      echo "                  Se re-comprueba el binario, no se lee su exit." >&2
      return 2
    fi
  fi
  thyrox_toolchain_hunspell_works || return 2
  return 0
}
export -f thyrox_toolchain_require_hunspell

# @description La sonda del preflight: se omite (exit 3) si el consumidor no
# declara diccionario, como la de TeX Live.
function thyrox_toolchain_probe_hunspell() {
  if [[ -z "${THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY:-}" ]]; then
    echo "thyrox_toolchain: el consumidor no declara THYROX_TOOLCHAIN_HUNSPELL_DICTIONARY;" >&2
    echo "                  la sonda de hunspell se omite." >&2
    return 3
  fi
  thyrox_toolchain_require_hunspell
}
export -f thyrox_toolchain_probe_hunspell

# ---------------------------------------------------------------------------
# Sonda de COHERENCIA entre el proxy declarado y el CA que cada familia lee.
# ---------------------------------------------------------------------------

# @description Las claves de entorno que declaran un proxy de salida. Son
# SEIS y no tres: la minuscula y la MAYUSCULA son cajas distintas, y un
# operador puede declarar solo una.
#
# ALL_PROXY entro al cerrar TASK-THYROX-0187, no por completitud: hasta
# entonces `src/packages/provider/src/proxy.ts::getProxyUrl` no la leia
# (medido: 0 archivos del arbol), asi que declararla habria dado verde sobre
# una via que el consumidor no consume. Hoy la lee como respaldo de los dos
# caminos, asi que un entorno que solo la declare SI tiene proxy — y la sonda
# tiene que verlo para no callar sobre un CA ausente.
declare -ga THYROX_TOOLCHAIN_PROXY_KEYS=(
  https_proxy HTTPS_PROXY http_proxy HTTP_PROXY all_proxy ALL_PROXY
)

# @description Las familias de consumidor y las claves de CA que cada una lee,
# como `familia:CLAVE[,CLAVE]`. El eje es la familia porque las tres leen
# claves DISTINTAS: un entorno puede dejar salir a node y no a python, y una
# sola clave colapsada daria verde sobre esa asimetria.
declare -ga THYROX_TOOLCHAIN_CA_FAMILIES=(
  "node:NODE_EXTRA_CA_CERTS"
  "python:REQUESTS_CA_BUNDLE,SSL_CERT_FILE"
  "curl:CURL_CA_BUNDLE"
)

# @description ¿Hay algun proxy de salida declarado?
# @noargs
# @exitcode 0 Al menos una de las cuatro claves trae valor.
# @exitcode 1 Ninguna.
function thyrox_toolchain_proxy_declared() {
  local key
  for key in "${THYROX_TOOLCHAIN_PROXY_KEYS[@]}"; do
    [[ -n "${!key:-}" ]] && return 0
  done
  return 1
}

# @description ¿La familia dada tiene un CA que pueda LEER de verdad?
#
# Declarar una ruta no es tenerla: se comprueba `-r` sobre el archivo, no que
# la variable traiga texto. Es la misma distincion significante/significado que
# el resto del arbol aplica a una cifra — el nombre de un archivo no es el
# archivo.
# @arg $1 string La entrada `familia:CLAVE[,CLAVE]`.
# @exitcode 0 Alguna de sus claves apunta a un archivo legible.
# @exitcode 1 Ninguna.
function thyrox_toolchain_family_has_ca() {
  local entry="${1:-}" keys key
  keys="${entry#*:}"
  local IFS=','
  for key in $keys; do
    [[ -n "${!key:-}" && -r "${!key}" ]] && return 0
  done
  return 1
}

# @description Sonda de coherencia proxy/CA. Es `aviso`, no `error`, y la
# razon esta medida: ningun gate de `src/verify/` sale a la red, asi que un
# entorno incoherente no rompe la verificacion de este arbol — rompe el
# trabajo del operador cuando salga.
#
# Lo que NO hace, y es deliberado: NO abre una conexion. Una sonda de red
# mediria ademas la disponibilidad del destino y su rojo no separaria «el
# entorno esta mal declarado» de «el destino esta caido». Mide dos
# declaraciones del operador y su coherencia entre si.
#
# Sin proxy declarado el veredicto es 0, nunca aviso: un aviso que sale
# siempre se aprende a ignorar, que es como una regla se vuelve ruido.
# @noargs
# @exitcode 0 No hay proxy declarado, o lo hay y las tres familias leen un CA.
# @exitcode 1 Hay proxy declarado y alguna familia no tiene CA legible. AVISA.
function thyrox_toolchain_probe_proxy() {
  if ! thyrox_toolchain_proxy_declared; then
    return 0
  fi

  local entry family missing missing_ca=()
  for entry in "${THYROX_TOOLCHAIN_CA_FAMILIES[@]}"; do
    family="${entry%%:*}"
    thyrox_toolchain_family_has_ca "$entry" || missing_ca+=("$family")
  done

  if [[ ${#missing_ca[@]} -eq 0 ]]; then
    return 0
  fi

  # El aviso NOMBRA la familia y su clave: decir solo «falta CA» manda al
  # operador a averiguar cual de las tres, que es el trabajo que la sonda
  # acaba de hacer.
  echo "thyrox_toolchain: hay proxy declarado y ${#missing_ca[@]} familia(s) sin CA legible." >&2
  for entry in "${THYROX_TOOLCHAIN_CA_FAMILIES[@]}"; do
    family="${entry%%:*}"
    for missing in "${missing_ca[@]}"; do
      [[ "$missing" == "$family" ]] && \
        echo "                  $family -> declarar ${entry#*:}" >&2
    done
  done
  echo "                  Un proxy que intercepta TLS sin CA legible rompe" >&2
  echo "                  cada salida con un fallo de verificacion. El" >&2
  echo "                  remedio es la declaracion, no desactivar TLS." >&2
  return 1
}
export -f thyrox_toolchain_proxy_declared
export -f thyrox_toolchain_family_has_ca
export -f thyrox_toolchain_probe_proxy

# ---------------------------------------------------------------------------
# El aviso degradado, y las dos sondas que `check-toolchain-ready` no tenia.
#
# El defecto que cierran lo nombro el ejecutor: quien clona el repositorio no
# tiene como saber QUE herramientas externas usa thyrox ni si las suyas
# sirven. Antes de esto, `PROBES` declaraba cuatro —awk, parallel, el
# interprete del proveedor, el proxy— y el arbol dependia ademas de dos que
# ninguna sonda interrogaba.
#
# CUAL de las dos es cual se midio antes de escribirlas, y el resultado
# invierte lo que el nombre sugiere:
#
#   ==============================  ============  ===========================
#   Candidato                       Consumidores  Veredicto
#   ==============================  ============  ===========================
#   CLI `sqlite3`                   0             NO es dependencia
#   modulo `sqlite3` de Python      55            SI: asi se abre el store
#   `bun` / `bunx` como comando     55            SI: 14 entrypoints .ts
#   ==============================  ============  ===========================
#
# Por eso la sonda se llama `require_sqlite_reader` y no `require_sqlite3`: el
# sujeto es la CAPACIDAD DE LEER el store, no un binario con ese nombre. En el
# contenedor donde se escribio esto el CLI esta AUSENTE y el store se abre sin
# problema — un guard sobre el CLI habria publicado rojo con el arbol sano,
# que es el sub-patron C de `metrica-decide-la-conclusion.md`.
# ---------------------------------------------------------------------------

# @description El aviso de MODO DEGRADADO: nombra la herramienta que no se
# puede usar, la precondicion que la desbloquea, y declara que lo demas sigue.
#
# La forma la fijo el ejecutor verbatim. Sus tres mitades no son adorno:
#
#   1. el prefijo `IMPORTANT`, que la hace greppeable en un log;
#   2. la herramienta nombrada DOS veces —al pedirla y al decir que se sigue
#      sin ella—, que es lo que un «falta X» pierde;
#   3. la precondicion, que es el remedio accionable.
#
# Sin la tercera mitad el aviso se lee como un rehuse, y el que clona no sabe
# si puede seguir. Ese es exactamente el desenlace que esta funcion evita: un
# arbol que degrada y sigue usable, no uno que falla entero.
# @arg $1 string La herramienta o capacidad que queda fuera.
# @arg $2 string La precondicion a corregir para recuperarla.
# @stdout La linea de aviso.
# @exitcode 2 Falta alguno de los dos argumentos. NO se emite una linea con
#   huecos: un aviso que dijera «si desea usar  es necesario corregir » es
#   peor que ninguno, porque parece informacion.
function thyrox_toolchain_degraded_notice() {
  local tool="${1:-}" fix="${2:-}"
  if [[ -z "$tool" || -z "$fix" ]]; then
    echo "thyrox_toolchain_degraded_notice: faltan <herramienta> y <precondicion>." >&2
    return 2
  fi
  printf 'IMPORTANT si desea usar %s es necesario corregir %s por el momento, continua sin usar %s\n' \
    "$tool" "$fix" "$tool"
}
export -f thyrox_toolchain_degraded_notice

# @description El interprete al que se le pregunta por el lector de SQLite.
# Declarado, y no compuesto dentro de la funcion, por la misma razon que
# `THYROX_TOOLCHAIN_AWK_BIN`: un control necesita apuntar la sonda a un
# interprete ausente sin romper todo lo demas.
THYROX_TOOLCHAIN_PYTHON_BIN="${THYROX_TOOLCHAIN_PYTHON_BIN:-}"
export THYROX_TOOLCHAIN_PYTHON_BIN

# @description ¿Se puede LEER el store? El sujeto es la capacidad, no el CLI.
#
# El store de thyrox es SQLite y sus 55 consumidores lo abren con el modulo
# `sqlite3` de la biblioteca estandar de Python. El CLI homonimo tiene CERO
# invocaciones en el arbol, asi que sondearlo mediria otra cosa.
#
# `sqlite3` es stdlib, pero NO siempre esta: un CPython compilado sin
# `libsqlite3-dev` lo omite, y el import falla en tiempo de ejecucion con el
# arbol entero instalado. Por eso la sonda IMPORTA el modulo en vez de dar por
# hecho que existe — mide conducta, no presencia del interprete.
# @noargs
# @exitcode 0 El interprete resuelve y su modulo sqlite3 importa.
# @exitcode 2 No resuelve, o resuelve a un Python sin el modulo. REHUSA sin
#   emitir conteo: un cero aqui no distinguiria «no hay lector» de «no pude
#   medir».
function thyrox_toolchain_require_sqlite_reader() {
  local interpreter="$THYROX_TOOLCHAIN_PYTHON_BIN"
  # La precondicion que el aviso publica tiene que ser EJECUTABLE por quien
  # acaba de clonar, y ese es justo quien NO tiene `THYROX_ROOT` declarada: un
  # `cd $THYROX_ROOT` literal deja el remedio sin sujeto. Se resuelve como ya
  # lo hace `provider_python` en su propio mensaje. El literal queda de
  # respaldo por si la raiz no se puede resolver — ahi el problema es otro y
  # el aviso no debe inventarse una ruta.
  local root; root="$(thyrox_toolchain_provider_root 2>/dev/null)" \
    || root='$THYROX_ROOT'

  if [[ -z "$interpreter" ]]; then
    interpreter="$(thyrox_toolchain_provider_python 2>/dev/null)" || {
      thyrox_toolchain_degraded_notice \
        "el store de agentes, tareas y hallazgos" \
        "cd $root && uv sync" >&2
      return 2
    }
  fi

  if [[ ! -x "$interpreter" ]]; then
    echo "thyrox_toolchain: '$interpreter' no resuelve a un interprete." >&2
    thyrox_toolchain_degraded_notice \
      "el store de agentes, tareas y hallazgos" \
      "cd $root && uv sync" >&2
    return 2
  fi

  # CONDUCTA: el modulo importa. `command -v python` no lo dice.
  if ! "$interpreter" -c 'import sqlite3' >/dev/null 2>&1; then
    echo "thyrox_toolchain: '$interpreter' resuelve, y su modulo sqlite3 NO importa." >&2
    echo "                  Es un CPython compilado sin libsqlite3-dev. El CLI" >&2
    echo "                  'sqlite3' no lo arregla: el arbol no lo invoca." >&2
    thyrox_toolchain_degraded_notice \
      "el store de agentes, tareas y hallazgos" \
      "un Python con el modulo sqlite3" >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_require_sqlite_reader

# @description El binario de bun. Declarado por la razon de siempre: el
# control necesita apuntar a un nombre ausente.
THYROX_TOOLCHAIN_BUN_BIN="${THYROX_TOOLCHAIN_BUN_BIN:-bun}"
export THYROX_TOOLCHAIN_BUN_BIN

# @description El hogar de dependencias instaladas. Su ausencia es el eje 2 y
# no se deduce del eje 1: bun puede estar y `bun install` no haberse corrido.
THYROX_TOOLCHAIN_NODE_MODULES_HOME="${THYROX_TOOLCHAIN_NODE_MODULES_HOME:-}"
export THYROX_TOOLCHAIN_NODE_MODULES_HOME

# @description ¿Se puede correr la mitad TypeScript? DOS ejes, como awk.
#
#   1. PRESENCIA — que `bun` resuelva. Su remedio es instalarlo.
#   2. DEPENDENCIAS — que `node_modules` este materializado. Su remedio es
#      `bun install`, y NO es el mismo: bun instalado sin dependencias deja
#      los 14 entrypoints `.ts` igual de muertos.
#
# Medir solo el eje 1 es el sub-patron C: el significante (el binario esta)
# concluyendo sobre el significado (la mitad TypeScript corre).
#
# Este rehuse NO bloquea el arbol: las mitades Python y shell de `bin/` no
# dependen de bun. Por eso su aviso es el degradado y su clase en
# `check-toolchain-ready` es `aviso`, no `error`.
# @noargs
# @exitcode 0 bun resuelve y las dependencias estan.
# @exitcode 2 Falta alguno de los dos ejes. El aviso nombra cual.
function thyrox_toolchain_require_bun() {
  local bin="$THYROX_TOOLCHAIN_BUN_BIN" home="$THYROX_TOOLCHAIN_NODE_MODULES_HOME"

  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "thyrox_toolchain: '$bin' no resuelve." >&2
    thyrox_toolchain_degraded_notice \
      "los entrypoints .ts de src/**/bin y el paquete @thyrox/cli" \
      "instalar bun (https://bun.sh)" >&2
    return 2
  fi

  if [[ -z "$home" ]]; then
    local root
    root="$(thyrox_toolchain_provider_root)" || return 2
    home="$root/node_modules"
  fi

  # El eje 2. Un directorio VACIO cuenta como ausente: `bun install` lo crea
  # antes de poblarlo, asi que medir su existencia a secas daria verde a mitad
  # de una instalacion interrumpida.
  if [[ ! -d "$home" ]] || [[ -z "$(ls -A "$home" 2>/dev/null)" ]]; then
    echo "thyrox_toolchain: '$bin' resuelve, y $home esta ausente o vacio." >&2
    # Misma razon que en `require_sqlite_reader`: la raiz se resuelve para que
    # el `cd` del remedio tenga sujeto en un clon recien bajado.
    local root_bun; root_bun="$(thyrox_toolchain_provider_root 2>/dev/null)" \
      || root_bun='$THYROX_ROOT'
    thyrox_toolchain_degraded_notice \
      "los entrypoints .ts de src/**/bin y el paquete @thyrox/cli" \
      "cd $root_bun && bun install" >&2
    return 2
  fi
  return 0
}
export -f thyrox_toolchain_require_bun

# ---------------------------------------------------------------------------
# Los MANIFIESTOS. El eje que las seis sondas anteriores no miran.
#
# Las seis miden EFECTO —responde el interprete, esta poblado `node_modules`,
# compila el awk— y ninguna mira el SIGNIFICANTE que lo declara. Un clon donde
# `pyproject.toml` falte o este corrupto publica «error · python-proveedor» y
# manda a correr `uv sync`, que fallara por otra causa y con otro mensaje: el
# operador persigue el sintoma. Medir el efecto y concluir sobre su causa
# declarada es el sub-patron C de `metrica-decide-la-conclusion.md`.
#
# Las DOS clases no son severidad estetica, y su frontera es la misma que
# `check-toolchain-ready` ya ejerce:
#
#   ERROR  pyproject.toml, package.json, tsconfig.json — DECLARACIONES. Sin
#          ellas no hay que instalar ni con que compilar; su ausencia no se
#          repara sola.
#   AVISO  uv.lock, bun.lock, bunfig.toml — RESOLUCIONES. Se regeneran desde
#          las declaraciones. Un clon sin `bun.lock` es perfectamente
#          instalable, y bloquearlo trataria los seis igual.
#
# Se mide `-r` y no `-e`: un manifiesto PRESENTE e ILEGIBLE deja el arbol
# igual de roto, y una sonda de existencia pasa en verde sobre el.
#
# Ciega a: que el contenido PARSEE. La sonda mide que el archivo este y se
# pueda leer, no que su TOML o su JSON sean validos — eso lo dira la
# herramienta que lo consuma, con su propio mensaje, y duplicarlo aqui seria
# una segunda fuente de verdad sobre la sintaxis de un formato ajeno.
# ---------------------------------------------------------------------------

# @description Los manifiestos de clase ERROR, separados por espacio. Se
# declaran como variable y no dentro de la funcion por la misma razon que
# `THYROX_TOOLCHAIN_AWK_BIN`: un control necesita variar el universo sin
# editar el cuerpo.
THYROX_TOOLCHAIN_MANIFESTS_REQUIRED="${THYROX_TOOLCHAIN_MANIFESTS_REQUIRED:-pyproject.toml package.json tsconfig.json}"
export THYROX_TOOLCHAIN_MANIFESTS_REQUIRED

# @description Los manifiestos de clase AVISO: resoluciones regenerables.
THYROX_TOOLCHAIN_MANIFESTS_OPTIONAL="${THYROX_TOOLCHAIN_MANIFESTS_OPTIONAL:-uv.lock bun.lock bunfig.toml}"
export THYROX_TOOLCHAIN_MANIFESTS_OPTIONAL

# @description La precondicion que regenera cada manifiesto regenerable.
# @arg $1 string El nombre del manifiesto.
# @stdout El remedio accionable, sin ruta: quien lo lee ya esta en la raiz.
function thyrox_toolchain_manifest_remedy() {
  case "${1:-}" in
    uv.lock)      printf 'correr uv lock' ;;
    bun.lock)     printf 'correr bun install' ;;
    bunfig.toml)  printf 'restaurar bunfig.toml desde el repositorio' ;;
    *)            printf 'restaurar %s desde el repositorio' "${1:-el manifiesto}" ;;
  esac
}
export -f thyrox_toolchain_manifest_remedy

# @description ¿Estan los manifiestos del arbol, y se pueden leer?
# @noargs
# @exitcode 0 Todas las declaraciones estan. Puede haber avisos por una
#   resolucion ausente, que se nombra igual en vez de pasar en silencio.
# @exitcode 2 Falta o es ilegible al menos una DECLARACION. REHUSA y la
#   nombra: el codigo de salida por si solo no dice cual de las tres es, y
#   mandar a mirar «los manifiestos» no es un remedio.
#
#   El rechazo NO emite conteo ni ruta. Sin conteo porque un cero aqui seria
#   un verde falso; sin ruta porque quien lee el remedio ya esta en la raiz y
#   una ruta absoluta en el mensaje lo ata a un arbol concreto.
function thyrox_toolchain_require_manifests() {
  local root; root="$(thyrox_toolchain_provider_root 2>/dev/null)" || {
    echo "thyrox_toolchain: no resuelve la raiz del proveedor." >&2
    echo "                  NO se emite conteo." >&2
    return 2
  }

  local name broken=0

  for name in $THYROX_TOOLCHAIN_MANIFESTS_REQUIRED; do
    [[ -r "$root/$name" ]] && continue
    echo "thyrox_toolchain: manifiesto obligatorio ausente o ilegible: $name" >&2
    echo "                  Es una DECLARACION: sin ella no hay que instalar" >&2
    echo "                  ni con que compilar, y no se regenera sola." >&2
    broken=1
  done

  for name in $THYROX_TOOLCHAIN_MANIFESTS_OPTIONAL; do
    [[ -r "$root/$name" ]] && continue
    # Se nombra aunque no bloquee. Una resolucion ausente que pasara en
    # silencio deja al que clona sin saber por que su instalacion no es
    # reproducible.
    thyrox_toolchain_degraded_notice \
      "la resolucion reproducible que declara $name" \
      "$(thyrox_toolchain_manifest_remedy "$name")" >&2
  done

  (( broken == 0 )) || return 2
  return 0
}
export -f thyrox_toolchain_require_manifests

# ---------------------------------------------------------------------------
# thyrox_toolchain_require_githooks — ¿git EJECUTA los hooks versionados?
# ---------------------------------------------------------------------------
# `core.hooksPath` vive en `.git/config`, que no se versiona: un clon nuevo
# trae `.githooks/` escrito y git no lo mira, asi que ningun gate de commit
# corre y nadie lo nota. Asi llegaron a develop cinco claves sin declarar con
# su gate en rojo (H-THYROX-161). La sonda mide lo que git VA A EJECUTAR —el
# valor efectivo de `core.hooksPath`, que tambien puede venir del entorno por
# `GIT_CONFIG_*`— y no que los archivos existan: estan en los dos casos.
#
# Ciega a: un hook con `--no-verify`, y un `.githooks/` cuyo contenido no sea
# el versionado. Mide la activacion, no lo que cada hook hace.
function thyrox_toolchain_require_githooks() {
  local root; root="$(thyrox_toolchain_provider_root 2>/dev/null)" || {
    echo "thyrox_toolchain: no resuelve la raiz del proveedor." >&2
    echo "                  NO se emite conteo." >&2
    return 2
  }
  local current
  current="$(git -C "$root" config --get core.hooksPath 2>/dev/null || true)"
  if [[ "$current" == ".githooks" ]]; then
    return 0
  fi
  echo "thyrox_toolchain: core.hooksPath=${current:-<sin fijar>} en $root:" >&2
  echo "                  los hooks de .githooks/ no corren, y ningun gate" >&2
  echo "                  de commit se ejecuta. Arreglo:" >&2
  echo "                    bash \"$root/scripts/install-hooks.sh\"" >&2
  return 1
}
export -f thyrox_toolchain_require_githooks

# @description Normaliza un nombre de paquete Python segun PEP 503: minusculas
# y toda corrida de `-`, `_` o `.` colapsada a un solo guion medio.
#
# Sin esta normalizacion, una comparacion de cadena cruda publica «no
# declarado» sobre un paquete que SI lo esta: `spacy_lookups_data` y
# `spacy-lookups-data` son el mismo paquete para `uv` y para el indice. Es el
# falso positivo que el censo de imports de este arbol produjo, con el propio
# instrumento como sujeto.
# @arg $1 string El nombre tal como lo escribio quien pregunta.
# @stdout El nombre normalizado.
function thyrox_toolchain_normalize_package_name() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]' | sed -E 's/[-_.]+/-/g'
}
export -f thyrox_toolchain_normalize_package_name

# @description ¿Esta un paquete DECLARADO en la mitad Python del proveedor?
#
# Es otra pregunta que «esta instalado», y confundirlas fue un episodio real:
# se publico «numpy no esta instalado» sin medir que no esta DECLARADO. Solo
# la segunda explica la primera, y solo la segunda se arregla editando un
# archivo del arbol.
#
# El universo son los arrays de dependencias de `pyproject.toml`: el de
# `[project]` y los de `[dependency-groups]`. No se mira el entorno: un
# paquete que este en `.venv` sin declararse es justo el defecto que esta
# sonda existe para ver.
# @arg $1 string El nombre del paquete, en cualquiera de sus formas PEP 503.
# @exitcode 0 Declarado.
# @exitcode 1 No declarado.
# @exitcode 2 NO SE PUDO MEDIR: el manifiesto no se puede leer. Responder «no
#   declarado» aqui no distinguiria «no esta» de «no pude mirar», que es el
#   sub-patron D con esta sonda como sujeto.
function thyrox_toolchain_python_package_declared() {
  local wanted="${1:-}"
  if [[ -z "$wanted" ]]; then
    echo "thyrox_toolchain_python_package_declared: falta <paquete>." >&2
    return 2
  fi

  local root; root="$(thyrox_toolchain_provider_root 2>/dev/null)" || {
    echo "thyrox_toolchain: no resuelve la raiz del proveedor." >&2
    return 2
  }

  local manifest="$root/pyproject.toml"
  if [[ ! -r "$manifest" ]]; then
    echo "thyrox_toolchain: no se puede leer $manifest." >&2
    echo "                  NO se responde «no declarado»: seria confundir" >&2
    echo "                  la ausencia con la imposibilidad de medir." >&2
    return 2
  fi

  wanted="$(thyrox_toolchain_normalize_package_name "$wanted")"

  local declared
  declared="$(awk '
    # Cabecera de tabla. Reinicia el estado: un array nunca cruza tablas.
    /^\[/ { in_group = ($0 ~ /^\[dependency-groups\]/); in_arr = 0; next }

    # Apertura de un array de dependencias. Bajo [dependency-groups] toda
    # clave lo es; fuera, solo las que terminan en «dependencies».
    !in_arr && /^[[:space:]]*[A-Za-z0-9_.-]+[[:space:]]*=[[:space:]]*\[/ {
      key = $0; sub(/[[:space:]]*=.*/, "", key); gsub(/[[:space:]]/, "", key)
      if (in_group || key ~ /dependencies$/) in_arr = 1
    }

    in_arr {
      line = $0
      while (match(line, /"[^"]+"/)) {
        spec = substr(line, RSTART + 1, RLENGTH - 2)
        # El nombre es el prefijo hasta el primer caracter que no le
        # pertenece: un marcador, un extra o un especificador de version.
        if (match(spec, /^[A-Za-z0-9._-]+/)) print substr(spec, RSTART, RLENGTH)
        line = substr(line, RSTART + RLENGTH)
      }
      if ($0 ~ /\]/) in_arr = 0
    }
  ' "$manifest")"

  local candidate
  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    [[ "$(thyrox_toolchain_normalize_package_name "$candidate")" == "$wanted" ]] \
      && return 0
  done <<<"$declared"
  return 1
}
export -f thyrox_toolchain_python_package_declared
