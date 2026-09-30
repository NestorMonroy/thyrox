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

for fn in thyrox_infrastructure_container_names thyrox_infrastructure_create_argv \
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
for fn in thyrox_infrastructure_container_names thyrox_infrastructure_create_argv \
          thyrox_infrastructure_health_check_argv thyrox_infrastructure_inspect; do
  unset -f "$fn"
done

# --- nombres fijos ---
names="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_container_names")"
thyrox_check "container_names lista los tres nombres fijos, en orden" \
  "$(printf 'thyrox-postgres\nthyrox-redis\nthyrox-ollama')" "$names"

# --- postgres: rehusa sin THYROX_INFRA_POSTGRES_PASSWORD, sin emitir argv ---
out="$(THYROX_INFRA_POSTGRES_PASSWORD='' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-postgres" 2>/dev/null)"; rc=$?
thyrox_check "sin contraseña, create_argv(postgres) sale 2" "2" "$rc"
thyrox_check "sin contraseña, create_argv(postgres) no imprime nada" "" "$out"

err="$(THYROX_INFRA_POSTGRES_PASSWORD='' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-postgres" 2>&1 >/dev/null)"
if [[ "$err" == *THYROX_INFRA_POSTGRES_PASSWORD* ]]; then
  ok "el rehuso nombra THYROX_INFRA_POSTGRES_PASSWORD en stderr"
else
  bad "el rehuso no nombro la variable: [$err]"
fi

# --- postgres: argv exacto con contraseña, imagen y puerto por defecto ---
expected_pg="$(printf '%s\n' \
  create \
  --name thyrox-postgres \
  --network thyrox-infra \
  --label io.thyrox.role=infrastructure \
  --restart=on-failure \
  -p 127.0.0.1:55432:5432 \
  -v thyrox-postgres-data:/var/lib/postgresql/data \
  -e POSTGRES_PASSWORD=secret123 \
  -e POSTGRES_USER=thyrox \
  -e POSTGRES_DB=thyrox \
  docker.io/pgvector/pgvector:0.8.0-pg16)"
actual_pg="$(THYROX_INFRA_POSTGRES_PASSWORD='secret123' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-postgres")"
thyrox_check "argv exacto de postgres (imagen, red, etiqueta, puerto, volumen, restart)" \
  "$expected_pg" "$actual_pg"

# --- postgres: imagen y puerto sobreescribibles por variable ---
actual_pg_over="$(THYROX_INFRA_POSTGRES_PASSWORD='secret123' \
  THYROX_INFRA_POSTGRES_IMAGE='docker.io/pgvector/pgvector:0.8.1-pg17' \
  THYROX_INFRA_POSTGRES_PORT='15432' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-postgres")"
if [[ "$actual_pg_over" == *"docker.io/pgvector/pgvector:0.8.1-pg17"* \
   && "$actual_pg_over" == *"127.0.0.1:15432:5432"* ]]; then
  ok "imagen y puerto de postgres se sobreescriben por variable"
else
  bad "sobreescritura de postgres no tomo efecto: [$actual_pg_over]"
fi

# --- redis: argv exacto, sin volumen, persistencia desactivada ---
expected_redis="$(printf '%s\n' \
  create \
  --name thyrox-redis \
  --network thyrox-infra \
  --label io.thyrox.role=infrastructure \
  --restart=on-failure \
  -p 127.0.0.1:56379:6379 \
  docker.io/library/redis:7.4 \
  redis-server \
  --save \
  '' \
  --appendonly \
  no)"
actual_redis="$(bash -c "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-redis")"
thyrox_check "argv exacto de redis (imagen, red, etiqueta, puerto, restart, sin volumen)" \
  "$expected_redis" "$actual_redis"

if [[ "$actual_redis" != *"thyrox-postgres-data"* && "$actual_redis" != *"-v "* ]]; then
  ok "redis no declara ningun volumen"
else
  bad "redis declaro un volumen: [$actual_redis]"
fi

# --- redis: imagen y puerto sobreescribibles por variable ---
actual_redis_over="$(THYROX_INFRA_REDIS_IMAGE='docker.io/library/redis:7.5' \
  THYROX_INFRA_REDIS_PORT='16379' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-redis")"
if [[ "$actual_redis_over" == *"docker.io/library/redis:7.5"* \
   && "$actual_redis_over" == *"127.0.0.1:16379:6379"* ]]; then
  ok "imagen y puerto de redis se sobreescriben por variable"
else
  bad "sobreescritura de redis no tomo efecto: [$actual_redis_over]"
fi

# --- nombre desconocido rehusa ---
out_unknown="$(THYROX_INFRA_POSTGRES_PASSWORD='x' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-mongo" 2>/dev/null)"; rc=$?
thyrox_check "create_argv de un nombre desconocido sale 2" "2" "$rc"
thyrox_check "create_argv de un nombre desconocido no imprime nada" "" "$out_unknown"

out_unknown_health="$(bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_health_check_argv thyrox-mongo" 2>/dev/null)"; rc=$?
thyrox_check "health_check_argv de un nombre desconocido sale 2" "2" "$rc"
thyrox_check "health_check_argv de un nombre desconocido no imprime nada" "" "$out_unknown_health"

# --- usuario y base de postgres sobreescribibles: en la creacion y en la salud ---
pg_identity_over="$(THYROX_INFRA_POSTGRES_PASSWORD='x' \
  THYROX_INFRA_POSTGRES_USER='app_owner' THYROX_INFRA_POSTGRES_DB='app_data' bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-postgres")"
if [[ "$pg_identity_over" == *"POSTGRES_USER=app_owner"* \
   && "$pg_identity_over" == *"POSTGRES_DB=app_data"* ]]; then
  ok "THYROX_INFRA_POSTGRES_USER y THYROX_INFRA_POSTGRES_DB llegan a la creacion"
else
  bad "usuario o base no tomaron efecto en la creacion: [$pg_identity_over]"
fi
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

# --- etiqueta de infraestructura presente en los dos contenedores ---
if [[ "$actual_pg" == *"io.thyrox.role=infrastructure"* && \
      "$actual_redis" == *"io.thyrox.role=infrastructure"* ]]; then
  ok "la etiqueta io.thyrox.role=infrastructure esta en los dos contenedores"
else
  bad "falta la etiqueta en alguno de los dos"
fi

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

# --- TASK-THYROX-0662: thyrox-ollama, red del anfitrion y API en loopback ---
# `env -u` retira el proxy del entorno de la suite: el argv por defecto no
# puede depender de que quien corre la prueba tenga un proxy de salida.
ollama_argv() { env -u HTTPS_PROXY -u https_proxy "$@" bash -c \
  "source '$SUBJECT'; thyrox_infrastructure_create_argv thyrox-ollama"; }
expected_ollama="$(printf '%s\n' \
  create \
  --name thyrox-ollama \
  --network host \
  --label io.thyrox.role=infrastructure \
  --restart=on-failure \
  -v thyrox-ollama-models:/root/.ollama \
  -e OLLAMA_HOST=127.0.0.1:51434 \
  docker.io/ollama/ollama:0.35.0)"
actual_ollama="$(ollama_argv)"; rc=$?
thyrox_check "create_argv(ollama) sale 0 sin credenciales" "0" "$rc"
thyrox_check "argv exacto de ollama sin proxy (red host, loopback, etiqueta, volumen)" \
  "$expected_ollama" "$actual_ollama"
if [[ "$actual_ollama" != *"thyrox-infra"* && "$(grep -cx -- '-p' <<<"$actual_ollama")" == 0 ]]; then
  ok "ollama no usa la red thyrox-infra ni publica puertos"
else
  bad "ollama declara thyrox-infra o -p: [$actual_ollama]"
fi
for piece in HTTPS_PROXY https_proxy NO_PROXY SSL_CERT_FILE proxy-ca.crt; do
  if [[ "$actual_ollama" != *"$piece"* ]]; then
    ok "sin HTTPS_PROXY, el argv de ollama no lleva $piece"
  else
    bad "sin HTTPS_PROXY, el argv de ollama lleva $piece: [$actual_ollama]"
  fi
done

CA_DIR="$(mktemp -d)"
printf 'ca\n' > "$CA_DIR/ca.crt"
with_proxy="$(ollama_argv HTTPS_PROXY=http://127.0.0.1:3128 THYROX_INFRA_PROXY_CA_BUNDLE="$CA_DIR/ca.crt")"
for piece in "-e"$'\n'"HTTPS_PROXY=http://127.0.0.1:3128" \
             "-e"$'\n'"https_proxy=http://127.0.0.1:3128" \
             "-e"$'\n'"NO_PROXY=localhost,127.0.0.1" \
             "-v"$'\n'"$CA_DIR/ca.crt:/etc/ssl/certs/proxy-ca.crt:ro" \
             "-e"$'\n'"SSL_CERT_FILE=/etc/ssl/certs/proxy-ca.crt"; do
  if [[ "$with_proxy" == *"$piece"* ]]; then
    ok "con proxy y CA legible, ollama lleva ${piece//$'\n'/ }"
  else
    bad "con proxy y CA legible, falta ${piece//$'\n'/ }: [$with_proxy]"
  fi
done
thyrox_check "con proxy, la imagen sigue siendo el ultimo argumento" \
  "docker.io/ollama/ollama:0.35.0" "$(tail -n 1 <<<"$with_proxy")"

# Como root `-r` es verdadero aun con modo 000, asi que «ilegible» se ejercita
# con lo que ningun uid puede leer como archivo: una ruta ausente y un directorio.
for ca in "$CA_DIR/absent.crt" "$CA_DIR"; do
  proxy_no_ca="$(ollama_argv HTTPS_PROXY=http://127.0.0.1:3128 THYROX_INFRA_PROXY_CA_BUNDLE="$ca")"
  if [[ "$proxy_no_ca" == *"HTTPS_PROXY=http://127.0.0.1:3128"* \
     && "$proxy_no_ca" != *"proxy-ca.crt"* && "$proxy_no_ca" != *"SSL_CERT_FILE"* ]]; then
    ok "con CA no legible ($ca): proxy si, montaje y SSL_CERT_FILE no"
  else
    bad "con CA no legible ($ca) el argv no es el esperado: [$proxy_no_ca]"
  fi
done
ca_no_proxy="$(ollama_argv THYROX_INFRA_PROXY_CA_BUNDLE="$CA_DIR/ca.crt")"
if [[ "$ca_no_proxy" != *"proxy-ca.crt"* && "$ca_no_proxy" != *"SSL_CERT_FILE"* ]]; then
  ok "con CA legible pero sin HTTPS_PROXY no se monta la CA"
else
  bad "sin HTTPS_PROXY se monto la CA: [$ca_no_proxy]"
fi
rm -rf "$CA_DIR"

ollama_over="$(ollama_argv THYROX_INFRA_OLLAMA_PORT=41434 THYROX_INFRA_OLLAMA_IMAGE=docker.io/ollama/ollama:0.36.0)"
if [[ "$ollama_over" == *"OLLAMA_HOST=127.0.0.1:41434"* && "$ollama_over" != *"51434"* ]]; then
  ok "THYROX_INFRA_OLLAMA_PORT gana al puerto por defecto"
else
  bad "el puerto de ollama no se sobreescribio: [$ollama_over]"
fi
thyrox_check "THYROX_INFRA_OLLAMA_IMAGE gana a la imagen por defecto" \
  "docker.io/ollama/ollama:0.36.0" "$(tail -n 1 <<<"$ollama_over")"
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

# --- inspeccion contra un podman falso ---
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
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

thyrox_summary
