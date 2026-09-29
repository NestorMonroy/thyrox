#!/usr/bin/env bash
# @description Declaracion reproducible de la infraestructura GESTIONADA de
# thyrox — PostgreSQL+pgvector y Redis (TASK-THYROX-0607, ADR-THYROX-007
# v1.2.0 Regla 4).
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
# (`pg_isready`, `redis-cli ping`) para que el bootstrap lo corra
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
declare -ga _INFRASTRUCTURE_CONTAINERS=(
  "$_INFRASTRUCTURE_POSTGRES_NAME"
  "$_INFRASTRUCTURE_REDIS_NAME"
)

# Red propia y etiqueta de rol — no sobreescribibles: identifican QUE es esta
# infraestructura, no COMO se aprovisiona (eso si varia por variable, abajo).
readonly _INFRASTRUCTURE_NETWORK="thyrox-infra"
readonly _INFRASTRUCTURE_ROLE_LABEL="io.thyrox.role=infrastructure"

# PostgreSQL: la verdad durable vive en el volumen con nombre, el contenedor
# es descartable.
readonly _INFRASTRUCTURE_POSTGRES_VOLUME="thyrox-postgres-data"
readonly _INFRASTRUCTURE_POSTGRES_DATA_DIR="/var/lib/postgresql/data"

# Imagenes versionadas y totalmente calificadas — sobreescribibles por
# variable, nunca por edicion de este archivo.
THYROX_INFRA_POSTGRES_IMAGE="${THYROX_INFRA_POSTGRES_IMAGE:-docker.io/pgvector/pgvector:0.8.0-pg16}"
THYROX_INFRA_REDIS_IMAGE="${THYROX_INFRA_REDIS_IMAGE:-docker.io/library/redis:7.4}"

# Puertos SOLO en loopback, y nunca 5432/6379: 5432 ya lo ocupa el cluster
# PostgreSQL del anfitrion. Sobreescribibles por variable.
THYROX_INFRA_POSTGRES_PORT="${THYROX_INFRA_POSTGRES_PORT:-55432}"
THYROX_INFRA_REDIS_PORT="${THYROX_INFRA_REDIS_PORT:-56379}"

# Identidad de PostgreSQL dentro del contenedor (no es la credencial: esa se
# exige por separado en THYROX_INFRA_POSTGRES_PASSWORD, sin default).
THYROX_INFRA_POSTGRES_USER="${THYROX_INFRA_POSTGRES_USER:-thyrox}"
THYROX_INFRA_POSTGRES_DB="${THYROX_INFRA_POSTGRES_DB:-thyrox}"

# @description Lista los nombres fijos de los contenedores de infraestructura
# gestionada, uno por linea.
# @noargs
# @stdout `thyrox-postgres` y `thyrox-redis`, en ese orden.
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

# @description Imprime el argv COMPLETO de `podman create` para un nombre de
# contenedor conocido, una palabra por linea, SIN ejecutarlo — el bootstrap
# (TASK-THYROX-0606) es quien decide cuando correrlo.
# @arg $1 string `thyrox-postgres` o `thyrox-redis`.
# @stdout el argv, una palabra por linea.
# @exitcode 0 argv compuesto.
# @exitcode 2 nombre desconocido, o (solo postgres) falta la credencial.
thyrox_infrastructure_create_argv() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME") _thyrox_infrastructure_create_argv_postgres ;;
    "$_INFRASTRUCTURE_REDIS_NAME") _thyrox_infrastructure_create_argv_redis ;;
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
# @arg $1 string `thyrox-postgres` o `thyrox-redis`.
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
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_health_check_argv

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
