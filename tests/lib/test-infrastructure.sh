#!/usr/bin/env bash
# test-infrastructure.sh — contrato de la declaracion de infraestructura
# gestionada (TASK-THYROX-0607, ADR-THYROX-007 v1.2.0 Regla 4).
#
# `src/lib/infrastructure.sh` es DECLARACION, no ejecucion: cada funcion
# imprime el argv que el bootstrap (TASK-THYROX-0606) correra explicitamente,
# nunca invoca `podman` para crear ni arrancar nada. Por eso estas pruebas no
# necesitan Podman real — solo un `podman` falso para el caso de inspeccion,
# que si lee un binario.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/lib/infrastructure.sh"
source "$ROOT/src/lib/assert.sh"
source "$ROOT/src/lib/test_homes.sh"
# Ningún .env del árbol gobierna esta suite: sin aislar, sus valores por
# defecto dependerían de lo que declare la máquina (TASK-THYROX-0735).
ISOLATED_HOMES="$(mktemp -d)"
thyrox_isolate_homes "$ISOLATED_HOMES"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

if [[ -f "$SUBJECT" ]]; then
  ok "el sujeto existe: $SUBJECT"
else
  bad "no existe: $SUBJECT"
  thyrox_summary; exit 1
fi

if source "$SUBJECT" 2>/dev/null; then
  ok "el sujeto se sourcea sin error"
else
  bad "sourcear $SUBJECT fallo"
  thyrox_summary; exit 1
fi

for fn in thyrox_infrastructure_container_names \
          thyrox_infrastructure_health_check_argv thyrox_infrastructure_inspect; do
  if type "$fn" &>/dev/null; then
    ok "declara $fn"
  else
    bad "falta $fn"
  fi
done

# Un `export -f` en ESTE proceso contamina cada `bash -c` que sigue: el
# guard de doble inclusion del sujeto veria la funcion ya declarada y
# retornaria antes de fijar los arrays/variables que las pruebas de abajo
# necesitan (el mismo defecto que test-toolchain-podman.sh ya documenta).
# Se retira aqui para que cada `bash -c` de aqui en mas fuente desde cero.
for fn in thyrox_infrastructure_container_names \
          thyrox_infrastructure_health_check_argv thyrox_infrastructure_inspect; do
  unset -f "$fn"
done

# --- nombres fijos ---
names="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_container_names")"
thyrox_check "container_names lista los tres nombres fijos, en orden" \
  "$(printf 'thyrox-postgres\nthyrox-redis\nthyrox-ollama')" "$names"

# --- usuario y base de postgres sobreescribibles en la salud (la declaración: test-infrastructure-desired.sh) ---
health_identity_over="$(THYROX_INFRA_POSTGRES_USER='app_owner' THYROX_INFRA_POSTGRES_DB='app_data' \
  bash -c "source '$SUBJECT'; thyrox_infrastructure_health_check_argv thyrox-postgres")"
thyrox_check "la salud de postgres usa el usuario y la base declarados" \
  "$(printf 'pg_isready\n-U\napp_owner\n-d\napp_data')" "$health_identity_over"

# --- comando de salud, por contenedor ---
health_pg="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_health_check_argv thyrox-postgres")"
thyrox_check "health_check_argv(postgres) es pg_isready" \
  "$(printf 'pg_isready\n-U\nthyrox\n-d\nthyrox')" "$health_pg"

health_redis="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_health_check_argv thyrox-redis")"
thyrox_check "health_check_argv(redis) es redis-cli ping" \
  "$(printf 'redis-cli\nping')" "$health_redis"

# --- TASK-THYROX-0671: necesidad de disco e imagen, por contenedor ---
need_pg="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_disk_need_bytes thyrox-postgres")"; rc=$?
thyrox_check "disk_need_bytes(postgres) sale 0" "0" "$rc"
thyrox_check "disk_need_bytes(postgres): capas comprimidas medidas x factor de pull" \
  "$(( 156322638 * 4 ))" "$need_pg"
need_redis="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_disk_need_bytes thyrox-redis")"
thyrox_check "disk_need_bytes(redis): capas comprimidas medidas x factor de pull" \
  "$(( 43594077 * 4 ))" "$need_redis"
out_unknown_need="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_disk_need_bytes thyrox-mongo" 2>/dev/null)"; rc=$?
thyrox_check "disk_need_bytes de un nombre desconocido sale 2" "2" "$rc"
thyrox_check "disk_need_bytes de un nombre desconocido no imprime nada" "" "$out_unknown_need"

image_pg="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_image thyrox-postgres")"
thyrox_check "image(postgres) es la imagen declarada" "docker.io/pgvector/pgvector:0.8.0-pg16" "$image_pg"
image_redis="$(THYROX_INFRA_REDIS_IMAGE='docker.io/library/redis:7.5' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_image thyrox-redis")"
thyrox_check "image(redis) respeta la variable" "docker.io/library/redis:7.5" "$image_redis"
bash -c "source '$SUBJECT'; thyrox_infrastructure_image thyrox-mongo" >/dev/null 2>&1
thyrox_check "image de un nombre desconocido sale 2" "2" "$?"

# --- TASK-THYROX-0662: thyrox-ollama (su declaración: test-infrastructure-desired.sh) ---
image_ollama="$(THYROX_INFRA_OLLAMA_IMAGE=docker.io/ollama/ollama:0.36.0 bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_image thyrox-ollama")"
thyrox_check "image(ollama) respeta la variable" "docker.io/ollama/ollama:0.36.0" "$image_ollama"

health_ollama="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_health_check_argv thyrox-ollama")"
thyrox_check "health_check_argv(ollama) es ollama list" "$(printf 'ollama\nlist')" "$health_ollama"

need_ollama="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_disk_need_bytes thyrox-ollama")"
thyrox_check "disk_need_bytes(ollama): comprimido + desempaquetado medidos" \
  "$(( 3750477083 + 5513676936 ))" "$need_ollama"

for key in THYROX_INFRA_OLLAMA_IMAGE THYROX_INFRA_OLLAMA_PORT THYROX_INFRA_PROXY_CA_BUNDLE; do
  if grep -qx "$key=" "$ROOT/.env.example"; then
    ok ".env.example declara $key vacia"
  else
    bad ".env.example no declara $key="
  fi
done

# --- TASK-THYROX-0695: colision de locks de Podman tras un reinicio ---
lock_literal='deadlock due to lock mismatch'
if bash -c "source '$SUBJECT'; thyrox_infrastructure_is_lock_collision \"\$1\"" _ "Error: $lock_literal"; then
  ok "is_lock_collision reconoce el literal de Podman 4.9.3"
else
  bad "is_lock_collision no reconocio el literal"
fi
# El mismo desfase visto desde el borrado (`podman volume rm`, 2026-10-01).
release_literal="Error: freeing lock for volume thyrox-quantization-lab-sources: no such file or directory"
if bash -c "source '$SUBJECT'; thyrox_infrastructure_is_lock_collision \"\$1\"" _ "$release_literal"; then
  ok "is_lock_collision reconoce el lock que Podman no puede liberar"
else
  bad "is_lock_collision no reconocio el lock que Podman no puede liberar"
fi
for other in "Error: no such image" ""; do
  if bash -c "source '$SUBJECT'; thyrox_infrastructure_is_lock_collision \"\$1\"" _ "$other"; then
    bad "is_lock_collision clasifico como colision: [$other]"
  else
    ok "is_lock_collision no clasifica como colision: [$other]"
  fi
done
remedy="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_lock_collision_remedy thyrox-ollama")"
# La reparación del motor es explícita y tiene un solo camino (decisión del
# ejecutor 2026-10-02): el remedio nombra bin/podman_lock_recovery, no
# `podman system renumber` suelto.
for piece in thyrox-ollama retirar "bin/podman_lock_recovery"; do
  if [[ "$remedy" == *"$piece"* ]]; then
    ok "el remedio nombra $piece"
  else
    bad "el remedio no nombra $piece: [$remedy]"
  fi
done
[[ "$remedy" != *"podman system renumber"* ]] && ok "el remedio no manda a renumerar a mano" || bad "el remedio manda a renumerar a mano: [$remedy]"

# --- inspeccion contra un podman falso ---
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK" "$ISOLATED_HOMES"' EXIT
cat > "$WORK/podman-fake" <<'STUB'
#!/usr/bin/env bash
if [[ "$1" == "inspect" ]]; then
  printf 'running\t4242\n'
  exit 0
fi
exit 1
STUB
chmod +x "$WORK/podman-fake"

inspect_out="$(THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-fake" bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_inspect thyrox-postgres")"
thyrox_check "inspect usa THYROX_TOOLCHAIN_PODMAN_BIN y publica estado y pid" \
  "$(printf 'running\t4242')" "$inspect_out"


# =====================================================================
# TASK-THYROX-0735 — las claves THYROX_INFRA_* se resuelven también desde el
# `.env` declarado (`THYROX_ENV_FILE`), con el proceso por encima del archivo y
# el valor por defecto sólo si ninguno declara. Un `bin/infrastructure_ensure`
# lanzado sin el `.env` en su entorno creó `thyrox-ollama` sobre un volumen
# vacío (H-THYROX-307).
# =====================================================================
DECLARED_ENV="$WORK/env/declared.env"
mkdir -p "$WORK/env"
printf 'THYROX_INFRA_OLLAMA_VOLUME=vol-from-file\nTHYROX_INFRA_OLLAMA_PORT=51999\n' > "$DECLARED_ENV"

# La declaración que recibe el bootstrap, proyectada a «volumen:destino OLLAMA_HOST=…».
ollama_declared_with() {
  env -u THYROX_INFRA_OLLAMA_VOLUME -u THYROX_INFRA_OLLAMA_PORT "$@" bash -c \
    "source '$SUBJECT'; thyrox_infrastructure_desired_resource thyrox-ollama" \
    | jq -r '"\(.namedVolumes[0].volume):\(.namedVolumes[0].destination) OLLAMA_HOST=\(.environment.OLLAMA_HOST)"'
}

from_file="$(ollama_declared_with THYROX_ENV_FILE="$DECLARED_ENV")"
if [[ "$from_file" == *"vol-from-file:/root/.ollama"* ]]; then
  ok "0735: el volumen declarado en el .env se monta sin exportarlo"
else
  bad "0735: el volumen del .env no se usó: [$from_file]"
fi
if [[ "$from_file" == *"OLLAMA_HOST=127.0.0.1:51999"* ]]; then
  ok "0735: el puerto declarado en el .env se usa sin exportarlo"
else
  bad "0735: el puerto del .env no se usó: [$from_file]"
fi

process_wins="$(ollama_declared_with THYROX_ENV_FILE="$DECLARED_ENV" THYROX_INFRA_OLLAMA_VOLUME=vol-from-process)"
if [[ "$process_wins" == *"vol-from-process:/root/.ollama"* && "$process_wins" != *"vol-from-file"* ]]; then
  ok "0735: la variable del proceso gana sobre el .env"
else
  bad "0735: el proceso no ganó sobre el .env: [$process_wins]"
fi

: > "$WORK/env/empty.env"
default_only="$(ollama_declared_with THYROX_ENV_FILE="$WORK/env/empty.env")"
if [[ "$default_only" == *"thyrox-ollama-models:/root/.ollama"* ]]; then
  ok "0735: sin declaración en proceso ni archivo queda el volumen por defecto"
else
  bad "0735: sin declaración no quedó el valor por defecto: [$default_only]"
fi

thyrox_summary
