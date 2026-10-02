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

# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/reach.sh"

# Las claves `THYROX_INFRA_*` que la cadena de `.env` declara, con el valor que
# ya decidio la precedencia canonica de `reach.py` (el proceso gana sobre el
# archivo). Se cargan con UN proceso por familia: una consulta por clave
# costaba un `python3` por clave y multiplicaba por 50 el tiempo de sourcear
# (0.9 s -> 43.8 s la suite de esta biblioteca).
declare -gA _INFRASTRUCTURE_DECLARED=()

# _thyrox_infrastructure_load_declared — llena _INFRASTRUCTURE_DECLARED con la
# familia `THYROX_INFRA_` que publica el mecanismo canonico de configuracion
# (`_thyrox_delegate --prefixed`, reach.sh). No lee el `.env` por su cuenta.
_thyrox_infrastructure_load_declared() {
  local line key
  # `|| [[ -n "$line" ]]`: el delegado imprime sin salto final.
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" == THYROX_INFRA_*=* ]] || continue
    key="${line%%=*}"
    _INFRASTRUCTURE_DECLARED["$key"]="${line#*=}"
  done < <(_thyrox_delegate --prefixed THYROX_INFRA_ 2>/dev/null)
}
_thyrox_infrastructure_load_declared

# @description Resuelve una clave declarable de la infraestructura: la variable
# del proceso, despues el `.env` que nombra THYROX_ENV_FILE (o el de la raiz),
# y el default solo si ninguno la declara. Leer solo el proceso dejaba fuera
# el `.env` declarado: `thyrox-ollama` se creo sobre un volumen vacio porque
# `bin/infrastructure_ensure` no heredo la declaracion (H-THYROX-307).
# @arg $1 string la clave, `THYROX_INFRA_*`.
# @arg $2 string el default.
# @stdout el valor resuelto.
thyrox_infrastructure_setting() {
  local key="$1" default="$2"
  if [[ -n "${!key:-}" ]]; then
    printf '%s\n' "${!key}"
  elif [[ -n "${_INFRASTRUCTURE_DECLARED[$key]:-}" ]]; then
    printf '%s\n' "${_INFRASTRUCTURE_DECLARED[$key]}"
  else
    printf '%s\n' "$default"
  fi
}

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
# La etiqueta de servicio nombra QUE servicio es cada contenedor, para que un
# selector por etiqueta distinga Ollama de PostgreSQL sin depender del nombre.
readonly _INFRASTRUCTURE_SERVICE_LABEL_KEY="io.thyrox.service"

# PostgreSQL: la verdad durable vive en el volumen con nombre, el contenedor
# es descartable.
readonly _INFRASTRUCTURE_POSTGRES_VOLUME="thyrox-postgres-data"
readonly _INFRASTRUCTURE_POSTGRES_DATA_DIR="/var/lib/postgresql/data"

# Ollama: los modelos son su verdad durable, igual que el volumen de
# postgres; el contenedor es descartable y el `rm -f` del ensure no toca el
# volumen.
# El volumen es sobreescribible: un clon que ya tiene modelos en otro volumen
# lo reutiliza en vez de volver a bajarlos.
THYROX_INFRA_OLLAMA_VOLUME="$(thyrox_infrastructure_setting THYROX_INFRA_OLLAMA_VOLUME 'thyrox-ollama-models')"
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
THYROX_INFRA_POSTGRES_IMAGE="$(thyrox_infrastructure_setting THYROX_INFRA_POSTGRES_IMAGE 'docker.io/pgvector/pgvector:0.8.0-pg16')"
THYROX_INFRA_REDIS_IMAGE="$(thyrox_infrastructure_setting THYROX_INFRA_REDIS_IMAGE 'docker.io/library/redis:7.4')"
THYROX_INFRA_OLLAMA_IMAGE="$(thyrox_infrastructure_setting THYROX_INFRA_OLLAMA_IMAGE 'docker.io/ollama/ollama:0.35.0')"

# Puertos SOLO en loopback, y nunca 5432/6379: 5432 ya lo ocupa el cluster
# PostgreSQL del anfitrion. Sobreescribibles por variable.
THYROX_INFRA_POSTGRES_PORT="$(thyrox_infrastructure_setting THYROX_INFRA_POSTGRES_PORT '55432')"
THYROX_INFRA_REDIS_PORT="$(thyrox_infrastructure_setting THYROX_INFRA_REDIS_PORT '56379')"
# Ollama, en la misma familia y lejos de 11434 para no chocar con un Ollama
# del anfitrion.
THYROX_INFRA_OLLAMA_PORT="$(thyrox_infrastructure_setting THYROX_INFRA_OLLAMA_PORT '51434')"

# Identidad de PostgreSQL dentro del contenedor (no es la credencial: esa se
# exige por separado en THYROX_INFRA_POSTGRES_PASSWORD, sin default).
THYROX_INFRA_POSTGRES_USER="$(thyrox_infrastructure_setting THYROX_INFRA_POSTGRES_USER 'thyrox')"
THYROX_INFRA_POSTGRES_DB="$(thyrox_infrastructure_setting THYROX_INFRA_POSTGRES_DB 'thyrox')"

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

# _thyrox_infrastructure_outbound_proxy_declared — ¿el entorno declara un
# proxy de salida? Se lee al componer, no al sourcear.
_thyrox_infrastructure_outbound_proxy_declared() {
  [[ -n "${HTTPS_PROXY:-}" ]]
}

# _thyrox_infrastructure_proxy_ca_bundle — la ruta declarada de la CA del
# proxy, o vacio si nadie la declara. Se lee al componer, como el proxy.
_thyrox_infrastructure_proxy_ca_bundle() {
  thyrox_infrastructure_setting THYROX_INFRA_PROXY_CA_BUNDLE ''
}

# _thyrox_infrastructure_proxy_ca_readable — ¿THYROX_INFRA_PROXY_CA_BUNDLE
# nombra un archivo regular legible? Un directorio o una ruta ausente no se
# montan: el contenedor confiaria en una CA que no existe.
_thyrox_infrastructure_proxy_ca_readable() {
  local bundle
  bundle="$(_thyrox_infrastructure_proxy_ca_bundle)"
  [[ -n "$bundle" && -f "$bundle" && -r "$bundle" ]]
}

# --- estado deseado para la primitiva Podman (ADR-007 1.15.0, TASK-THYROX-0740) ---
#
# El nombre del secreto de PostgreSQL en Podman y su destino montado: el
# contenedor recibe la ruta por POSTGRES_PASSWORD_FILE, nunca el valor.
readonly _INFRASTRUCTURE_POSTGRES_SECRET="thyrox-postgres-password"
readonly _INFRASTRUCTURE_POSTGRES_SECRET_TARGET="postgres-password"
readonly _INFRASTRUCTURE_SECRET_MOUNT_DIR="/run/secrets"
readonly _INFRASTRUCTURE_RESTART_POLICY="on-failure"

# _thyrox_infrastructure_health_json NAME — la salud declarada: el comando que
# corre dentro del contenedor, con el plazo y el intervalo del ensure.
_thyrox_infrastructure_health_json() {
  local -a command
  mapfile -t command < <(thyrox_infrastructure_health_check_argv "$1")
  # Las palabras viajan por stdin, una por línea: como argumentos de jq, una
  # palabra como `-U` se leería como opción suya.
  printf '%s\n' "${command[@]}" | jq -R . | jq -s \
        --argjson timeout "$(thyrox_infrastructure_setting THYROX_INFRA_HEALTH_TIMEOUT 60)" \
        --argjson interval "$(thyrox_infrastructure_setting THYROX_INFRA_HEALTH_INTERVAL 2)" \
        '{command: ., timeoutSeconds: $timeout, intervalSeconds: $interval}'
}

# _thyrox_infrastructure_resource_json SERVICE — el esqueleto común: nombre,
# reinicio, etiquetas de rol y servicio, etiqueta heredada y salud. Cada
# contenedor completa el resto con `jq`.
_thyrox_infrastructure_resource_json() {
  local name="$1" service="$2" role_key role_value
  role_key="${_INFRASTRUCTURE_ROLE_LABEL%%=*}"
  role_value="${_INFRASTRUCTURE_ROLE_LABEL#*=}"
  jq -n --arg name "$name" --arg restart "$_INFRASTRUCTURE_RESTART_POLICY" \
        --arg roleKey "$role_key" --arg roleValue "$role_value" \
        --arg serviceKey "$_INFRASTRUCTURE_SERVICE_LABEL_KEY" --arg service "$service" \
        --argjson health "$(_thyrox_infrastructure_health_json "$name")" \
    '{name: $name, restartPolicy: $restart, publishedPorts: [], namedVolumes: [], bindMounts: [],
      environment: {}, secrets: [], command: [],
      labels: {($roleKey): $roleValue, ($serviceKey): $service},
      legacyRoleLabel: {key: $roleKey, value: $roleValue}, health: $health}'
}

_thyrox_infrastructure_desired_postgres() {
  _thyrox_infrastructure_resource_json "$_INFRASTRUCTURE_POSTGRES_NAME" postgres | jq \
    --arg image "$THYROX_INFRA_POSTGRES_IMAGE" --arg network "$_INFRASTRUCTURE_NETWORK" \
    --argjson port "$THYROX_INFRA_POSTGRES_PORT" --arg volume "$_INFRASTRUCTURE_POSTGRES_VOLUME" \
    --arg dataDir "$_INFRASTRUCTURE_POSTGRES_DATA_DIR" --arg user "$THYROX_INFRA_POSTGRES_USER" \
    --arg db "$THYROX_INFRA_POSTGRES_DB" --arg secret "$_INFRASTRUCTURE_POSTGRES_SECRET" \
    --arg target "$_INFRASTRUCTURE_POSTGRES_SECRET_TARGET" --arg secretDir "$_INFRASTRUCTURE_SECRET_MOUNT_DIR" \
    '.image = $image | .network = {mode: "named", name: $network}
     | .publishedPorts = [{hostAddress: "127.0.0.1", hostPort: $port, containerPort: 5432}]
     | .namedVolumes = [{volume: $volume, destination: $dataDir}]
     | .environment = {POSTGRES_USER: $user, POSTGRES_DB: $db, POSTGRES_PASSWORD_FILE: ($secretDir + "/" + $target)}
     | .secrets = [{secret: $secret, target: $target, valueFrom: "THYROX_INFRA_POSTGRES_PASSWORD"}]'
}

_thyrox_infrastructure_desired_redis() {
  _thyrox_infrastructure_resource_json "$_INFRASTRUCTURE_REDIS_NAME" redis | jq \
    --arg image "$THYROX_INFRA_REDIS_IMAGE" --arg network "$_INFRASTRUCTURE_NETWORK" \
    --argjson port "$THYROX_INFRA_REDIS_PORT" \
    '.image = $image | .network = {mode: "named", name: $network}
     | .publishedPorts = [{hostAddress: "127.0.0.1", hostPort: $port, containerPort: 6379}]
     | .command = ["redis-server", "--save", "", "--appendonly", "no"]'
}

# _thyrox_infrastructure_proxy_environment_json — las variables del proxy de
# salida y, si la CA es legible, SSL_CERT_FILE; `{}` sin proxy declarado.
_thyrox_infrastructure_proxy_environment_json() {
  _thyrox_infrastructure_outbound_proxy_declared || { echo '{}'; return; }
  local ca_target=""
  _thyrox_infrastructure_proxy_ca_readable && ca_target="$_INFRASTRUCTURE_PROXY_CA_TARGET"
  jq -n --arg proxy "$HTTPS_PROXY" --arg noProxy "$_INFRASTRUCTURE_PROXY_NO_PROXY" --arg ca "$ca_target" \
    '{HTTPS_PROXY: $proxy, https_proxy: $proxy, NO_PROXY: $noProxy} + (if $ca == "" then {} else {SSL_CERT_FILE: $ca} end)'
}

# _thyrox_infrastructure_proxy_mounts_json — el montaje de sólo lectura de la
# CA del proxy, o `[]`.
_thyrox_infrastructure_proxy_mounts_json() {
  if _thyrox_infrastructure_outbound_proxy_declared && _thyrox_infrastructure_proxy_ca_readable; then
    jq -n --arg source "$(_thyrox_infrastructure_proxy_ca_bundle)" --arg target "$_INFRASTRUCTURE_PROXY_CA_TARGET" \
      '[{source: $source, destination: $target, readOnly: true}]'
  else
    echo '[]'
  fi
}

_thyrox_infrastructure_desired_ollama() {
  _thyrox_infrastructure_resource_json "$_INFRASTRUCTURE_OLLAMA_NAME" ollama | jq \
    --arg image "$THYROX_INFRA_OLLAMA_IMAGE" --arg volume "$THYROX_INFRA_OLLAMA_VOLUME" \
    --arg modelsDir "$_INFRASTRUCTURE_OLLAMA_MODELS_DIR" \
    --arg ollamaHost "${_INFRASTRUCTURE_LOOPBACK}:${THYROX_INFRA_OLLAMA_PORT}" \
    --argjson proxyEnvironment "$(_thyrox_infrastructure_proxy_environment_json)" \
    --argjson proxyMounts "$(_thyrox_infrastructure_proxy_mounts_json)" \
    '.image = $image | .network = {mode: "host"}
     | .namedVolumes = [{volume: $volume, destination: $modelsDir}]
     | .environment = ({OLLAMA_HOST: $ollamaHost} + $proxyEnvironment)
     | .bindMounts = $proxyMounts'
}

# @description Imprime el estado deseado de un contenedor conocido como el JSON
# que `InfrastructureBootstrap` entrega a la primitiva Podman. Declara los
# secretos por nombre, con la variable que da su valor; nunca lleva el valor.
# No ejecuta nada.
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout el JSON de un recurso.
# @exitcode 0 declaración publicada.
# @exitcode 2 nombre desconocido.
thyrox_infrastructure_desired_resource() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME") _thyrox_infrastructure_desired_postgres ;;
    "$_INFRASTRUCTURE_REDIS_NAME") _thyrox_infrastructure_desired_redis ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME") _thyrox_infrastructure_desired_ollama ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_desired_resource

# @description Imprime el volumen con nombre que la declaracion monta en un
# contenedor conocido, o nada si no monta ninguno (Redis). Es lo que el ensure
# compara con lo que un contenedor vivo tiene montado.
# @arg $1 string `thyrox-postgres`, `thyrox-redis` o `thyrox-ollama`.
# @stdout el nombre del volumen, o nada.
# @exitcode 0 declaracion publicada.
# @exitcode 2 nombre desconocido.
thyrox_infrastructure_named_volume() {
  local name="${1:-}"
  case "$name" in
    "$_INFRASTRUCTURE_POSTGRES_NAME") printf '%s\n' "$_INFRASTRUCTURE_POSTGRES_VOLUME" ;;
    "$_INFRASTRUCTURE_REDIS_NAME") ;;
    "$_INFRASTRUCTURE_OLLAMA_NAME") printf '%s\n' "$THYROX_INFRA_OLLAMA_VOLUME" ;;
    *)
      printf 'thyrox_infrastructure: contenedor desconocido: %s\n' "$name" >&2
      return 2
      ;;
  esac
}
export -f thyrox_infrastructure_named_volume

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

# --- colision de locks de Podman tras un reinicio (TASK-THYROX-0695) ---
#
# Podman guarda en su base el numero de lock de cada objeto y los locks en
# memoria compartida; reiniciar el contenedor de la sesion borra la memoria y
# conserva la base, y un objeto nuevo puede recibir el lock de uno anterior
# (H-THYROX-296). Literal exacto de Podman 4.9.3, presente en su binario y
# escrito por `podman start` el 2026-09-30.
readonly _INFRASTRUCTURE_LOCK_COLLISION_LITERAL="deadlock due to lock mismatch"
# La misma causa vista desde el borrado: `podman volume rm` sobre un objeto
# cuyo lock no esta en la memoria compartida (2026-10-01, H-THYROX-302).
readonly _INFRASTRUCTURE_LOCK_RELEASE_LITERAL="freeing lock for"
# La reparacion del motor de Podman tiene un solo camino, explicito y del
# operador: `bin/podman_lock_recovery` (que puede usar `podman system renumber`
# o el marcador `alive` segun su contrato). Ni el ensure ni este remedio
# reparan por su cuenta (decision del ejecutor 2026-10-02).
readonly _INFRASTRUCTURE_LOCK_RECOVERY="bin/podman_lock_recovery"

# @description ¿El stderr de un comando de Podman declara una colision de locks?
# @arg $1 string el stderr capturado.
# @exitcode 0 lleva el literal de la colision.
# @exitcode 1 no lo lleva.
thyrox_infrastructure_is_lock_collision() {
  [[ "${1:-}" == *"$_INFRASTRUCTURE_LOCK_COLLISION_LITERAL"* \
     || "${1:-}" == *"$_INFRASTRUCTURE_LOCK_RELEASE_LITERAL"* ]]
}
export -f thyrox_infrastructure_is_lock_collision

# @description Imprime el remedio de una colision de locks sobre un objeto:
# retirar el objeto anterior que comparte su lock, o la reparacion explicita
# del motor. No ejecuta nada.
# @arg $1 string el objeto afectado (contenedor o volumen).
# @stdout una linea con el literal y el remedio.
thyrox_infrastructure_lock_collision_remedy() {
  printf 'colision de locks de Podman sobre %s (%s): retirar el objeto anterior que comparte su lock, o reparar el motor con `%s` (sin --confirm muestra el plan)\n' \
    "${1:-}" "$_INFRASTRUCTURE_LOCK_COLLISION_LITERAL" "$_INFRASTRUCTURE_LOCK_RECOVERY"
}
export -f thyrox_infrastructure_lock_collision_remedy

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
