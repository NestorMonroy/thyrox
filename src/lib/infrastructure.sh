#!/usr/bin/env bash
# @description Declaracion reproducible de la infraestructura GESTIONADA de
# thyrox — PostgreSQL+pgvector, Redis (TASK-THYROX-0607, ADR-THYROX-007
# v1.2.0 Regla 4) y Ollama, el servidor de inferencia local (TASK-THYROX-0662).
#
# «Gestionada» y no «services»: este arbol no tiene systemd (medido,
# TASK-THYROX-0605 — `podman-restart.service` existe en disco y nada la
# ejecuta), asi que no hay unidad que declare ni arranque nada por su cuenta.
# Lo que hay aqui es la FORMA de cada contenedor —imagen, red, puertos,
# volumen, etiqueta— compuesta como argv de `podman`, nunca ejecutada: cada
# funcion IMPRIME el argv o lo mide, y quien invoca decide cuando correrlo.
# El consumidor de esta declaracion es el bootstrap (TASK-THYROX-0606, que no
# vive aqui): el ensure/start/loop de salud es su responsabilidad, no la de
# este archivo.
#
# El healthcheck es la misma leccion: se declara el COMANDO de salud
# (`pg_isready`, `redis-cli ping`, `ollama list`) para que el bootstrap lo corra
# explicitamente con `podman exec` o `podman healthcheck run` — no corre
# solo, medido en el mismo banco de TASK-THYROX-0605 (0 ejecuciones
# automaticas sin systemd que dispare el temporizador).
#
# Sigue el estilo de `podman_capabilities.sh` y `toolchain.sh`: prefijo de
# namespace, `export -f` por funcion, guard de doble inclusion. A diferencia
# de `podman_capabilities.sh` (que SI ejecuta), este archivo no fija
# `set -uo pipefail` — es una biblioteca para `source`, y fijar opciones de
# shell al sourcear cambiaria el estado del proceso que lo invoca.

# Guard de doble inclusion: sourcear dos veces es no-op.
if type thyrox_infrastructure_container_names &>/dev/null; then return 0 2>/dev/null || true; fi

# --- nombres fijos: el PodmanWorkerManager futuro tendra los suyos, y nunca
# gestionan los del otro (contrato de la etiqueta de rol, mas abajo). ---
readonly _INFRASTRUCTURE_POSTGRES_NAME="thyrox-postgres"
readonly _INFRASTRUCTURE_REDIS_NAME="thyrox-redis"
readonly _INFRASTRUCTURE_OLLAMA_NAME="thyrox-ollama"
declare -ga _INFRASTRUCTURE_CONTAINERS=(
  "$_INFRASTRUCTURE_POSTGRES_NAME"
  "$_INFRASTRUCTURE_REDIS_NAME"
  "$_INFRASTRUCTURE_OLLAMA_NAME"
)

# Red propia y etiqueta de rol — no sobreescribibles: identifican QUE es esta
# infraestructura, no COMO se aprovisiona (eso si varia por variable, abajo).
readonly _INFRASTRUCTURE_NETWORK="thyrox-infra"
readonly _INFRASTRUCTURE_ROLE_LABEL="io.thyrox.role=infrastructure"

# PostgreSQL: la verdad durable vive en el volumen con nombre, el contenedor
# es descartable.
readonly _INFRASTRUCTURE_POSTGRES_VOLUME="thyrox-postgres-data"
readonly _INFRASTRUCTURE_POSTGRES_DATA_DIR="/var/lib/postgresql/data"

# Ollama: los modelos son su verdad durable, igual que el volumen de
# postgres; el contenedor es descartable y el `rm -f` del ensure no toca el
# volumen.
readonly _INFRASTRUCTURE_OLLAMA_VOLUME="thyrox-ollama-models"
readonly _INFRASTRUCTURE_OLLAMA_MODELS_DIR="/root/.ollama"

# Ollama es la UNICA excepcion de red de esta declaracion: la red del
# anfitrion, con la API solo en loopback. Medido (banco
# `ollama-podman-measure-20260930T185844`): con la red propia de Podman el pull
# de un modelo falla (`proxyconnect tcp: dial tcp 127.0.0.1:46021: connection
# refused`), porque el proxy de salida escucha en el loopback del anfitrion;
# con `--network host` y `OLLAMA_HOST` en loopback descarga en 8 s. En red del
# anfitrion `-p` no aplica: el puerto lo fija `OLLAMA_HOST`.
readonly _INFRASTRUCTURE_HOST_NETWORK="host"
readonly _INFRASTRUCTURE_LOOPBACK="127.0.0.1"

# El proxy de salida y su CA, dentro del contenedor. Solo se declaran si el
# entorno tiene proxy: un clon fuera de este entorno no hereda rutas de aqui.
readonly _INFRASTRUCTURE_PROXY_NO_PROXY="localhost,127.0.0.1"
readonly _INFRASTRUCTURE_PROXY_CA_TARGET="/etc/ssl/certs/proxy-ca.crt"

# Imagenes versionadas y totalmente calificadas — sobreescribibles por
# variable, nunca por edicion de este archivo.
THYROX_INFRA_POSTGRES_IMAGE="${THYROX_INFRA_POSTGRES_IMAGE:-docker.io/pgvector/pgvector:0.8.0-pg16}"
THYROX_INFRA_REDIS_IMAGE="${THYROX_INFRA_REDIS_IMAGE:-docker.io/library/redis:7.4}"
THYROX_INFRA_OLLAMA_IMAGE="${THYROX_INFRA_OLLAMA_IMAGE:-docker.io/ollama/ollama:0.35.0}"

# Puertos SOLO en loopback, y nunca 5432/6379: 5432 ya lo ocupa el cluster
# PostgreSQL del anfitrion. Sobreescribibles por variable.
THYROX_INFRA_POSTGRES_PORT="${THYROX_INFRA_POSTGRES_PORT:-55432}"
THYROX_INFRA_REDIS_PORT="${THYROX_INFRA_REDIS_PORT:-56379}"
# Ollama, en la misma familia y lejos de 11434 para no chocar con un Ollama
# del anfitrion.
THYROX_INFRA_OLLAMA_PORT="${THYROX_INFRA_OLLAMA_PORT:-51434}"

# Identidad de PostgreSQL dentro del contenedor (no es la credencial: esa se
# exige por separado en THYROX_INFRA_POSTGRES_PASSWORD, sin default).
THYROX_INFRA_POSTGRES_USER="${THYROX_INFRA_POSTGRES_USER:-thyrox}"
THYROX_INFRA_POSTGRES_DB="${THYROX_INFRA_POSTGRES_DB:-thyrox}"

# @description Lista los nombres fijos de los contenedores de infraestructura
# gestionada, uno por linea.
# @noargs
# @stdout `thyrox-postgres`, `thyrox-redis` y `thyrox-ollama`, en ese orden.
thyrox_infrastructure_container_names() {
  local name
  for name in "${_INFRASTRUCTURE_CONTAINERS[@]}"; do
    printf '%s\n' "$name"
  done
}
export -f thyrox_infrastructure_container_names

# _thyrox_infrastructure_create_argv_postgres — compone el argv de
# `podman create` para thyrox-postgres. La credencial NUNCA vive en el
# codigo: se lee de THYROX_INFRA_POSTGRES_PASSWORD, y si falta esta funcion
# rehusa con exit 2 nombrandola, SIN emitir ningun argumento — un argv a
# medias con la contraseña vacia seria un contenedor sin auth valida creado
# en silencio.
_thyrox_infrastructure_create_argv_postgres() {
  local password="${THYROX_INFRA_POSTGRES_PASSWORD:-}"
  if [[ -z "$password" ]]; then
    printf 'thyrox_infrastructure: falta THYROX_INFRA_POSTGRES_PASSWORD (credencial de PostgreSQL); no se emite argv\n' >&2
    return 2
  fi
  printf '%s\n' \
    create \
    --name "$_INFRASTRUCTURE_POSTGRES_NAME" \
    --network "$_INFRASTRUCTURE_NETWORK" \
    --label "$_INFRASTRUCTURE_ROLE_LABEL" \
    --restart=on-failure \
    -p "127.0.0.1:${THYROX_INFRA_POSTGRES_PORT}:5432" \
    -v "${_INFRASTRUCTURE_POSTGRES_VOLUME}:${_INFRASTRUCTURE_POSTGRES_DATA_DIR}" \
    -e "POSTGRES_PASSWORD=${password}" \
    -e "POSTGRES_USER=${THYROX_INFRA_POSTGRES_USER}" \
    -e "POSTGRES_DB=${THYROX_INFRA_POSTGRES_DB}" \
    "$THYROX_INFRA_POSTGRES_IMAGE"
}

# _thyrox_infrastructure_create_argv_redis — compone el argv de
# `podman create` para thyrox-redis. SIN volumen: Redis aqui es estado
# compartido EFIMERO, no fuente de verdad, y la persistencia queda
# desactivada en el propio comando del servidor (`--save ''`,
# `--appendonly no`) para que un `podman restart` no reviva un RDB/AOF
# viejo desde un disco que este contenedor no monta.
_thyrox_infrastructure_create_argv_redis() {
  printf '%s\n' \
    create \
    --name "$_INFRASTRUCTURE_REDIS_NAME" \
    --network "$_INFRASTRUCTURE_NETWORK" \
    --label "$_INFRASTRUCTURE_ROLE_LABEL" \
    --restart=on-failure \
    -p "127.0.0.1:${THYROX_INFRA_REDIS_PORT}:6379" \
    "$THYROX_INFRA_REDIS_IMAGE" \
    redis-server \
    --save \
    '' \
    --appendonly \
    no
}

# _thyrox_infrastructure_outbound_proxy_declared — ¿el entorno declara un
# proxy de salida? Se lee al componer, no al sourcear.
_thyrox_infrastructure_outbound_proxy_declared() {
  [[ -n "${HTTPS_PROXY:-}" ]]
}

# _thyrox_infrastructure_proxy_ca_readable — ¿THYROX_INFRA_PROXY_CA_BUNDLE
# nombra un archivo regular legible? Un directorio o una ruta ausente no se
# montan: el contenedor confiaria en una CA que no existe.
_thyrox_infrastructure_proxy_ca_readable() {
  local bundle="${THYROX_INFRA_PROXY_CA_BUNDLE:-}"
  [[ -n "$bundle" && -f "$bundle" && -r "$bundle" ]]
}

# _thyrox_infrastructure_proxy_argv — las palabras del proxy de salida para
# un contenedor que descarga: las tres variables del proxy si el entorno lo
# declara, y ademas el montaje de su CA con SSL_CERT_FILE si esta es legible.
# Sin proxy no imprime nada.
_thyrox_infrastructure_proxy_argv() {
  _thyrox_infrastructure_outbound_proxy_declared || return 0
  printf '%s\n' \
    -e "HTTPS_PROXY=${HTTPS_PROXY}" \
    -e "https_proxy=${HTTPS_PROXY}" \
    -e "NO_PROXY=${_INFRASTRUCTURE_PROXY_NO_PROXY}"
  _thyrox_infrastructure_proxy_ca_readable || return 0
  printf '%s\n' \
    -v "${THYROX_INFRA_PROXY_CA_BUNDLE}:${_INFRASTRUCTURE_PROXY_CA_TARGET}:ro" \
    -e "SSL_CERT_FILE=${_INFRASTRUCTURE_PROXY_CA_TARGET}"
}

# _thyrox_infrastructure_create_argv_ollama — compone el argv de
# `podman create` para thyrox-ollama: red del anfitrion, API en loopback,
# volumen de modelos y, si lo hay, el proxy de salida con el que baja modelos.
_thyrox_infrastructure_create_argv_ollama() {
  printf '%s\n' \
    create \
    --name "$_INFRASTRUCTURE_OLLAMA_NAME" \
    --network "$_INFRASTRUCTURE_HOST_NETWORK" \
    --label "$_INFRASTRUCTURE_ROLE_LABEL" \
    --restart=on-failure \
    -v "${_INFRASTRUCTURE_OLLAMA_VOLUME}:${_INFRASTRUCTURE_OLLAMA_MODELS_DIR}" \
    -e "OLLAMA_HOST=${_INFRASTRUCTURE_LOOPBACK}:${THYROX_INFRA_OLLAMA_PORT}"
  _thyrox_infrastructure_proxy_argv
  printf '%s\n' "$THYROX_INFRA_OLLAMA_IMAGE"
}

# @description Imprime el argv COMPLETO de `podman create` para un nombre de
# contenedor conocido, una palabra por linea, SIN ejecutarlo — el bootstrap
# (TASK-THYROX-0606) es quien decide cuando correrlo.
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout el argv, una palabra por linea.
# @exitcode 0 argv compuesto.
# @exitcode 2 nombre desconocido, o (solo postgres) falta la credencial.
thyrox_infrastructure_create_argv() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME") _thyrox_infrastructure_create_argv_postgres ;;
    "$_INFRASTRUCTURE_REDIS_NAME") _thyrox_infrastructure_create_argv_redis ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME") _thyrox_infrastructure_create_argv_ollama ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_create_argv

# @description Imprime el comando de verificacion de salud de un contenedor
# conocido, una palabra por linea — el comando que corre DENTRO del
# contenedor (via `podman exec <nombre> <estas palabras>`, o registrado como
# `--health-cmd` para que `podman healthcheck run` lo dispare). Esta funcion
# no ejecuta nada: el health check no corre solo (medido, TASK-THYROX-0605).
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout el comando de salud, una palabra por linea.
# @exitcode 0 comando compuesto.
# @exitcode 2 nombre desconocido.
thyrox_infrastructure_health_check_argv() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME")
      printf '%s\n' pg_isready -U "$THYROX_INFRA_POSTGRES_USER" -d "$THYROX_INFRA_POSTGRES_DB"
      ;;
    "$_INFRASTRUCTURE_REDIS_NAME")
      printf '%s\n' redis-cli ping
      ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME")
      # `ollama list` lee OLLAMA_HOST del entorno del contenedor, que el
      # `exec` hereda. Medido contra un contenedor real de 0.35.0: sale 0 con
      # la API en su OLLAMA_HOST, 1 con otro puerto y 1 sin la variable.
      printf '%s\n' ollama list
      ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_health_check_argv

# --- disco que exige bajar cada imagen (TASK-THYROX-0671) ---
#
# Bytes comprimidos de las capas del manifiesto linux/amd64 de cada imagen por
# defecto, sumados de `podman manifest inspect <imagen>@<digest>` el
# 2026-09-30 (banco `disk-reserve-reach-20260930T191002`).
readonly _INFRASTRUCTURE_POSTGRES_COMPRESSED_BYTES=156322638
readonly _INFRASTRUCTURE_REDIS_COMPRESSED_BYTES=43594077
# Cuanto disco ocupa un pull por byte comprimido: el blob comprimido se
# conserva mientras se desempaqueta, y gzip reduce estas capas unas 2-3 veces.
# 4 es una COTA SUPERIOR declarada, no una medida: ninguna de las dos imagenes
# estaba bajada para leer su tamaño desempaquetado. Ciega a una imagen
# sobreescrita por variable, que hereda la necesidad de la imagen por defecto.
readonly _INFRASTRUCTURE_PULL_EXPANSION_FACTOR=4
# Ollama no usa el factor: sus dos cifras estan medidas (banco
# `ollama-managed-service-20260930T224010`, `outputs/ollama-image-layers.txt`):
# las 4 capas comprimidas del manifiesto linux/amd64 y el tamaño local de la
# imagen ya desempaquetada. La necesidad es su suma, porque el blob comprimido
# se conserva mientras se desempaqueta.
readonly _INFRASTRUCTURE_OLLAMA_COMPRESSED_BYTES=3750477083
readonly _INFRASTRUCTURE_OLLAMA_UNPACKED_BYTES=5513676936

# @description Imprime la imagen declarada de un contenedor conocido.
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout la referencia de la imagen.
# @exitcode 0 imagen publicada.
# @exitcode 2 nombre desconocido.
thyrox_infrastructure_image() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME") printf '%s\n' "$THYROX_INFRA_POSTGRES_IMAGE" ;;
    "$_INFRASTRUCTURE_REDIS_NAME") printf '%s\n' "$THYROX_INFRA_REDIS_IMAGE" ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME") printf '%s\n' "$THYROX_INFRA_OLLAMA_IMAGE" ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_image

# @description Imprime los bytes de disco que exige bajar la imagen de un
# contenedor conocido: lo que el ensure reserva antes de `podman create`.
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout un entero, en bytes.
# @exitcode 0 necesidad publicada.
# @exitcode 2 nombre desconocido.
thyrox_infrastructure_disk_need_bytes() {
  local name="${1:-}" need
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME")
      need=$(( _INFRASTRUCTURE_POSTGRES_COMPRESSED_BYTES * _INFRASTRUCTURE_PULL_EXPANSION_FACTOR ))
      ;;
    "$_INFRASTRUCTURE_REDIS_NAME")
      need=$(( _INFRASTRUCTURE_REDIS_COMPRESSED_BYTES * _INFRASTRUCTURE_PULL_EXPANSION_FACTOR ))
      ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME")
      need=$(( _INFRASTRUCTURE_OLLAMA_COMPRESSED_BYTES + _INFRASTRUCTURE_OLLAMA_UNPACKED_BYTES ))
      ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
  printf '%s\n' "$need"
}
export -f thyrox_infrastructure_disk_need_bytes

# @description Inspecciona un contenedor y publica su estado reportado y su
# PID, separados por tab. Usa THYROX_TOOLCHAIN_PODMAN_BIN si esta resuelto
# (via `thyrox_toolchain_require_podman`), o el `podman` del PATH.
# @arg $1 string nombre del contenedor a inspeccionar.
# @stdout `<estado>\t<pid>`
# @exitcode 0 `podman inspect` respondio.
# @exitcode 2 falta el nombre.
# @exitcode >0 el que devuelva `podman inspect` (p. ej. contenedor inexistente).
thyrox_infrastructure_inspect() {
  local name="${1:-}" bin
  if [[ -z "$name" ]]; then
    printf 'thyrox_infrastructure: se exige un nombre de contenedor\n' >&2
    return 2
  fi
  bin="${THYROX_TOOLCHAIN_PODMAN_BIN:-podman}"
  "$bin" inspect --format '{{.State.Status}}\t{{.State.Pid}}' "$name"
}
export -f thyrox_infrastructure_inspect
