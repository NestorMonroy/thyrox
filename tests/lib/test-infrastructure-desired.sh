#!/usr/bin/env bash
# test-infrastructure-desired.sh — el estado deseado de la infraestructura
# gestionada como declaración (ADR-007 1.15.0, TASK-THYROX-0740).
#
# `thyrox_infrastructure_desired_resource <nombre>` imprime el JSON que
# `InfrastructureBootstrap` entrega a la primitiva Podman: imagen, red,
# puertos, volúmenes con nombre, entorno público, secretos declarados por
# NOMBRE con la variable que da su valor, salud, política de reinicio y la
# etiqueta heredada que reconoce a los contenedores del camino anterior. Nunca
# lleva el valor de un secreto, y la declaración no ejecuta nada.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/infrastructure.sh"
source "$ROOT/src/lib/assert.sh"
source "$ROOT/src/lib/test_homes.sh"
ISOLATED_HOMES="$(mktemp -d)"
thyrox_isolate_homes "$ISOLATED_HOMES"
trap 'rm -rf "${ISOLATED_HOMES:?}"' EXIT
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }
: > "$ISOLATED_HOMES/empty.env"

# desired <nombre> [VAR=valor...] — la declaración en un proceso limpio, sin proxy heredado.
desired() {
  local name="$1"; shift
  env -u HTTPS_PROXY -u https_proxy THYROX_ENV_FILE="${TEST_ENV_FILE:-$ISOLATED_HOMES/empty.env}" "$@" \
    bash -c "source '$SUBJECT'; thyrox_infrastructure_desired_resource $name"
}

# expect_jq <etiqueta> <json> <filtro jq que debe dar true>
expect_jq() {
  if jq -e "$3" >/dev/null 2>&1 <<< "$2"; then ok "$1"; else bad "$1: $3 sobre [$2]"; fi
}

# --- postgres ---
pg="$(desired thyrox-postgres THYROX_INFRA_POSTGRES_PASSWORD=secret-value-31)"; rc=$?
thyrox_check "postgres: sale 0" "0" "$rc"
expect_jq "postgres: nombre fijo" "$pg" '.name == "thyrox-postgres"'
expect_jq "postgres: imagen por defecto" "$pg" '.image == "docker.io/pgvector/pgvector:0.8.0-pg16"'
expect_jq "postgres: red con nombre thyrox-infra" "$pg" '.network == {mode: "named", name: "thyrox-infra"}'
expect_jq "postgres: puerto sólo en loopback" "$pg" '.publishedPorts == [{hostAddress: "127.0.0.1", hostPort: 55432, containerPort: 5432}]'
# H-THYROX-464: el volumen de PostgreSQL se declara durable; si falta tras
# haber existido, la primitiva no lo crea vacío.
expect_jq "postgres: volumen durable con nombre" "$pg" '.namedVolumes == [{volume: "thyrox-postgres-data", destination: "/var/lib/postgresql/data", durable: true}]'
expect_jq "postgres: el contenedor recibe la RUTA del secreto" "$pg" '.environment.POSTGRES_PASSWORD_FILE == "/run/secrets/postgres-password"'
expect_jq "postgres: nunca POSTGRES_PASSWORD en el entorno" "$pg" '.environment | has("POSTGRES_PASSWORD") | not'
expect_jq "postgres: provisiona pgvector en su base, idempotente" "$pg" \
  '.provision == [["psql", "-v", "ON_ERROR_STOP=1", "-U", "thyrox", "-d", "thyrox", "-c", "CREATE EXTENSION IF NOT EXISTS vector"]]'
expect_jq "postgres: secreto declarado por nombre, con la variable que da su valor" "$pg" \
  '.secrets == [{secret: "thyrox-postgres-password", target: "postgres-password", valueFrom: "THYROX_INFRA_POSTGRES_PASSWORD"}]'
expect_jq "postgres: usuario y base públicos" "$pg" '.environment.POSTGRES_USER == "thyrox" and .environment.POSTGRES_DB == "thyrox"'
expect_jq "postgres: salud pg_isready con usuario y base" "$pg" '.health.command == ["pg_isready", "-U", "thyrox", "-d", "thyrox"]'
expect_jq "postgres: reinicio on-failure" "$pg" '.restartPolicy == "on-failure"'
expect_jq "postgres: etiquetas de rol y servicio" "$pg" '.labels == {"io.thyrox.role": "infrastructure", "io.thyrox.service": "postgres"}'
expect_jq "postgres: reconoce al predecesor por la etiqueta heredada" "$pg" '.legacyRoleLabel == {key: "io.thyrox.role", value: "infrastructure"}'
if [[ "$pg" == *secret-value-31* ]]; then bad "postgres: la declaración publica el valor del secreto"; else ok "postgres: la declaración no lleva el valor del secreto"; fi

pg_over="$(desired thyrox-postgres THYROX_INFRA_POSTGRES_IMAGE=registry.example/pg:1 THYROX_INFRA_POSTGRES_PORT=55999 \
  THYROX_INFRA_POSTGRES_USER=app THYROX_INFRA_POSTGRES_DB=appdb THYROX_INFRA_HEALTH_TIMEOUT=30 THYROX_INFRA_HEALTH_INTERVAL=3)"
expect_jq "postgres: imagen sobreescribible" "$pg_over" '.image == "registry.example/pg:1"'
expect_jq "postgres: puerto sobreescribible" "$pg_over" '.publishedPorts[0].hostPort == 55999'
expect_jq "postgres: usuario y base sobreescribibles, también en la salud" "$pg_over" \
  '.environment.POSTGRES_USER == "app" and .environment.POSTGRES_DB == "appdb" and .health.command == ["pg_isready", "-U", "app", "-d", "appdb"]'
expect_jq "plazo e intervalo de salud declarados" "$pg_over" '.health.timeoutSeconds == 30 and .health.intervalSeconds == 3'

# --- redis ---
redis="$(desired thyrox-redis)"; rc=$?
thyrox_check "redis: sale 0" "0" "$rc"
expect_jq "redis: sin volumen ni secretos" "$redis" '(.namedVolumes == []) and (.secrets == [])'
expect_jq "redis: persistencia desactivada en el comando" "$redis" '.command == ["redis-server", "--save", "", "--appendonly", "no"]'
expect_jq "redis: puerto en loopback" "$redis" '.publishedPorts == [{hostAddress: "127.0.0.1", hostPort: 56379, containerPort: 6379}]'
expect_jq "redis: salud redis-cli ping" "$redis" '.health.command == ["redis-cli", "ping"]'
redis_over="$(desired thyrox-redis THYROX_INFRA_REDIS_IMAGE=docker.io/library/redis:7.5 THYROX_INFRA_REDIS_PORT=56999)"
expect_jq "redis: imagen y puerto sobreescribibles" "$redis_over" \
  '.image == "docker.io/library/redis:7.5" and .publishedPorts[0].hostPort == 56999'

# --- ollama ---
ollama="$(desired thyrox-ollama)"; rc=$?
thyrox_check "ollama: sale 0 sin credenciales" "0" "$rc"
expect_jq "ollama: red del anfitrión, sin puertos publicados" "$ollama" '(.network == {mode: "host"}) and (.publishedPorts == [])'
expect_jq "ollama: API en loopback por OLLAMA_HOST" "$ollama" '.environment.OLLAMA_HOST == "127.0.0.1:51434"'
expect_jq "ollama: volumen de modelos" "$ollama" '.namedVolumes == [{volume: "thyrox-ollama-models", destination: "/root/.ollama"}]'
expect_jq "ollama: sin proxy declarado no lleva variables de proxy" "$ollama" '.environment | has("HTTPS_PROXY") | not'

printf 'THYROX_INFRA_OLLAMA_VOLUME=volume-from-env-file\n' > "$ISOLATED_HOMES/declared.env"
ollama_env="$(TEST_ENV_FILE="$ISOLATED_HOMES/declared.env" desired thyrox-ollama)"
expect_jq "ollama: el volumen declarado sólo en el .env gobierna" "$ollama_env" '.namedVolumes[0].volume == "volume-from-env-file"'

printf 'ca\n' > "$ISOLATED_HOMES/ca.crt"
ollama_proxy="$(desired thyrox-ollama HTTPS_PROXY=http://127.0.0.1:3128 THYROX_INFRA_PROXY_CA_BUNDLE="$ISOLATED_HOMES/ca.crt")"
expect_jq "ollama: con proxy, sus tres variables" "$ollama_proxy" \
  '.environment.HTTPS_PROXY == "http://127.0.0.1:3128" and .environment.https_proxy == "http://127.0.0.1:3128" and .environment.NO_PROXY == "localhost,127.0.0.1"'
expect_jq "ollama: con CA legible, montaje de sólo lectura y SSL_CERT_FILE" "$ollama_proxy" \
  "(.bindMounts == [{source: \"$ISOLATED_HOMES/ca.crt\", destination: \"/etc/ssl/certs/proxy-ca.crt\", readOnly: true}]) and (.environment.SSL_CERT_FILE == \"/etc/ssl/certs/proxy-ca.crt\")"

# Lo que antes medía el argv de `podman create` (tests/lib/test-infrastructure.sh),
# ahora sobre la declaración que entrega el bootstrap.
expect_jq "redis: etiquetas de rol y servicio" "$redis" '.labels == {"io.thyrox.role": "infrastructure", "io.thyrox.service": "redis"}'
expect_jq "ollama: etiquetas de rol y servicio" "$ollama" '.labels == {"io.thyrox.role": "infrastructure", "io.thyrox.service": "ollama"}'
expect_jq "ollama: sin proxy, ni variables de proxy ni CA" "$ollama" \
  '(.environment | (has("https_proxy") or has("NO_PROXY") or has("SSL_CERT_FILE")) | not) and (.bindMounts == [])'
for ca in "$ISOLATED_HOMES/absent.crt" "$ISOLATED_HOMES"; do
  unreadable="$(desired thyrox-ollama HTTPS_PROXY=http://127.0.0.1:3128 THYROX_INFRA_PROXY_CA_BUNDLE="$ca")"
  expect_jq "ollama: con CA no legible ($ca), proxy sí, montaje y SSL_CERT_FILE no" "$unreadable" \
    '(.environment.HTTPS_PROXY == "http://127.0.0.1:3128") and (.bindMounts == []) and (.environment | has("SSL_CERT_FILE") | not)'
done
ca_only="$(desired thyrox-ollama THYROX_INFRA_PROXY_CA_BUNDLE="$ISOLATED_HOMES/ca.crt")"
expect_jq "ollama: CA legible sin HTTPS_PROXY no se monta" "$ca_only" '(.bindMounts == []) and (.environment | has("SSL_CERT_FILE") | not)'
ollama_over="$(desired thyrox-ollama THYROX_INFRA_OLLAMA_PORT=41434 THYROX_INFRA_OLLAMA_IMAGE=docker.io/ollama/ollama:0.36.0)"
expect_jq "ollama: puerto e imagen sobreescribibles" "$ollama_over" \
  '.environment.OLLAMA_HOST == "127.0.0.1:41434" and .image == "docker.io/ollama/ollama:0.36.0"'

# --- una sola vía: la biblioteca declara, no compone órdenes de Podman ---
# ADR-007 1.15.0: la decisión de crear, arrancar y recrear vive en la primitiva.
# Un compositor de `podman create` en la biblioteca es una segunda vía, y el de
# PostgreSQL publicaba la contraseña en el entorno (`-e POSTGRES_PASSWORD=`).
defined="$(bash -c "source '$SUBJECT'; declare -F | awk '{print \$3}' | grep -c create_argv")"
thyrox_check "la biblioteca no define compositores de podman create" "0" "$defined"
thyrox_check "la biblioteca no pasa la contraseña por el entorno" "0" "$(grep -c "POSTGRES_PASSWORD=" "$SUBJECT")"

# --- nombre desconocido ---
out="$(desired thyrox-mongo 2>/dev/null)"; rc=$?
thyrox_check "nombre desconocido: sale 2" "2" "$rc"
thyrox_check "nombre desconocido: no imprime nada" "" "$out"

thyrox_summary
