#!/usr/bin/env bash
# test-infrastructure-ensure.sh — contrato del bootstrap idempotente de
# infraestructura gestionada (TASK-THYROX-0606, ADR-THYROX-007 v1.2.0 Regla 4).
#
# `src/session/infrastructure_ensure.sh` consume la DECLARACION de
# `src/lib/infrastructure.sh` (argv puro, sin ejecutar nada) y es quien
# efectivamente corre `podman`. Aqui `podman` es siempre un binario FALSO
# —nunca se crea un contenedor real— que modela su estado con archivos en un
# directorio de trabajo, y cuyo `start` deja un proceso `sleep` real y vivo en
# el anfitrion para representar el PID que un `podman inspect` real reportaria.
# Eso es lo que permite probar, sin systemd ni Podman real, la mitad de juicio
# central del ADR: `running` con el PID muerto es STALE y se recrea; `running`
# con el PID vivo se CONSERVA.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/session/infrastructure_ensure.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

if [[ -x "$SUBJECT" ]]; then
  ok "el sujeto existe y es ejecutable: $SUBJECT"
else
  bad "no existe o no es ejecutable: $SUBJECT"
  thyrox_summary; exit 1
fi

WORK="$(mktemp -d)"
MARKER="fake-podman-container-$$"
cleanup() { pkill -f "$MARKER" 2>/dev/null; rm -rf "$WORK"; }
trap cleanup EXIT

STATE="$WORK/state"
mkdir -p "$STATE"

# --- el podman falso ---
#
# Modela: info, network exists/create, inspect, create, start, rm, exec.
# Cada invocacion se registra en calls.log (una linea = argv completo), para
# que la prueba de "nunca borra el volumen" mida el argv real y no una
# promesa. `start` deja un `sleep 999` real, marcado con MARKER, y guarda su
# PID — asi un `kill -0` posterior lo ve vivo de verdad.
cat > "$WORK/podman-fake" <<STUB
#!/usr/bin/env bash
STATE="$STATE"
MARKER="$MARKER"
printf '%s\n' "\$*" >> "\$STATE/calls.log"
case "\$1" in
  info)
    # Con --format devuelve los locks libres sólo si el caso los declara: sin
    # ese archivo la medida no existe, como en un Podman que no la publica.
    [[ "\$*" == *FreeLocks* && -f "\$STATE/free-locks" ]] && cat "\$STATE/free-locks"
    exit 0
    ;;
  ps)
    for f in "\$STATE"/*.status; do [[ -e "\$f" ]] && basename "\$f" .status; done
    exit 0
    ;;
  container)
    # container inspect --format '{{.LockNumber}}' <nombres...>: el lock que
    # la base guarda por contenedor (\$STATE/<nombre>.lock, 0 si no se declara).
    shift 3
    for name in "\$@"; do cat "\$STATE/\${name}.lock" 2>/dev/null || echo 0; done
    exit 0
    ;;
  pod|volume)
    # \$STATE/pods y \$STATE/volumes: una línea «nombre lock» por objeto.
    # ls -q da los nombres; inspect --all --format da los locks.
    file="\$STATE/\${1}s"
    [[ "\$2" == inspect ]] && { cut -d' ' -f2 "\$file" 2>/dev/null; exit 0; }
    cut -d' ' -f1 "\$file" 2>/dev/null
    exit 0
    ;;
  system)
    # renumber deja asignado un lock por número distinto que la base
    # referencia (medido en 4.9.3: los volúmenes comparten números), salvo
    # que el caso declare que no corrige nada.
    # Con \$STATE/renumber-fails, renumber escribe su contenido en STDOUT y
    # sale 125 sin corregir nada: así lo hace Podman 4.9.3 con backend sqlite
    # (0 bytes en stderr).
    if [[ "\$2" == renumber && -f "\$STATE/renumber-fails" ]]; then
      cat "\$STATE/renumber-fails"
      exit 125
    fi
    if [[ "\$2" == renumber && ! -f "\$STATE/renumber-noop" ]]; then
      referenced=\$(cat "\$STATE"/*.lock 2>/dev/null; cut -d' ' -f2 "\$STATE/pods" "\$STATE/volumes" 2>/dev/null)
      echo \$(( 2048 - \$(printf '%s\n' "\$referenced" | grep . | sort -u | wc -l) )) > "\$STATE/free-locks"
    fi
    exit 0
    ;;
  network)
    case "\$2" in
      exists) [[ -f "\$STATE/network-\${3}" ]] && exit 0 || exit 1 ;;
      create) touch "\$STATE/network-\${3}"; exit 0 ;;
    esac
    exit 1
    ;;
  inspect)
    name="\${@: -1}"
    if [[ ! -f "\$STATE/\${name}.status" ]]; then
      echo "Error: no such container \$name" >&2
      exit 1
    fi
    if [[ "\$*" == *Mounts* ]]; then
      cat "\$STATE/\${name}.volumes" 2>/dev/null
      exit 0
    fi
    status="\$(cat "\$STATE/\${name}.status")"
    pid="\$(cat "\$STATE/\${name}.pid" 2>/dev/null || echo 0)"
    printf '%s\t%s\n' "\$status" "\$pid"
    exit 0
    ;;
  image)
    [[ "\$2" == exists && -f "\$STATE/image-present" ]] && exit 0
    exit 1
    ;;
  create)
    [[ -f "\$STATE/create-fails" ]] && exit 125
    if [[ -f "\$STATE/lock-collision-create" ]]; then
      echo "Error: deadlock due to lock mismatch" >&2
      exit 126
    fi
    name=""
    prev=""
    for a in "\$@"; do
      [[ "\$prev" == "--name" ]] && name="\$a"
      prev="\$a"
    done
    echo created > "\$STATE/\${name}.status"
    echo 0 > "\$STATE/\${name}.pid"
    # Los volúmenes con nombre que monta, para el inspect de .Mounts.
    prev=""; : > "\$STATE/\${name}.volumes"
    for a in "\$@"; do
      [[ "\$prev" == "-v" ]] && echo "\${a%%:*}" >> "\$STATE/\${name}.volumes"
      prev="\$a"
    done
    exit 0
    ;;
  start)
    name="\$2"
    if [[ -f "\$STATE/lock-collision-start" ]]; then
      echo "Error: deadlock due to lock mismatch" >&2
      exit 126
    fi
    nohup bash -c "exec -a \${MARKER}-\${name} sleep 999" >/dev/null 2>&1 &
    newpid=\$!
    disown "\$newpid" 2>/dev/null || true
    echo running > "\$STATE/\${name}.status"
    echo "\$newpid" > "\$STATE/\${name}.pid"
    exit 0
    ;;
  rm)
    name="\${@: -1}"
    rm -f "\$STATE/\${name}.status" "\$STATE/\${name}.pid"
    exit 0
    ;;
  exec)
    name="\$2"
    result="\$(cat "\$STATE/\${name}.health" 2>/dev/null || echo fail)"
    if [[ "\$result" == ok ]]; then
      echo "healthy (fake)"
      exit 0
    fi
    echo "unhealthy (fake)"
    exit 1
    ;;
esac
exit 1
STUB
chmod +x "$WORK/podman-fake"

# `sleep` falso: instantaneo, para que el bucle de salud no duerma de verdad.
cat > "$WORK/sleep-fake" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
chmod +x "$WORK/sleep-fake"

# La admision de disco falsa (TASK-THYROX-0671): registra su argv en el mismo
# calls.log que podman, para medir el ORDEN admitir -> create -> soltar, y
# admite salvo que el estado declare el disco lleno.
cat > "$WORK/admission-fake" <<STUB
#!/usr/bin/env bash
printf 'admission %s\n' "\$*" >> "$STATE/calls.log"
if [[ "\$1" == disk-admit && -f "$STATE/disk-full" ]]; then
  echo "resource_admission disk-admit: no cabe la necesidad; techo 1000 bytes, piso 0 bytes" >&2
  exit 3
fi
exit 0
STUB
chmod +x "$WORK/admission-fake"

reset_state() { rm -rf "$STATE"; mkdir -p "$STATE"; }
# Ningún .env del árbol gobierna la suite (TASK-THYROX-0735): un caso declara
# el suyo con TEST_ENV_FILE.
: > "$WORK/empty.env"
run_ensure() {
  THYROX_ENV_FILE="${TEST_ENV_FILE:-$WORK/empty.env}" \
  THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-fake" \
  THYROX_INFRA_ENSURE_SLEEP_BIN="$WORK/sleep-fake" \
  THYROX_INFRA_DISK_ADMISSION_BIN="$WORK/admission-fake" \
  THYROX_INFRA_HEALTH_TIMEOUT="${TEST_HEALTH_TIMEOUT:-6}" \
  THYROX_INFRA_HEALTH_INTERVAL="${TEST_HEALTH_INTERVAL:-2}" \
  THYROX_INFRA_POSTGRES_PASSWORD="${TEST_PASSWORD-secret123}" \
  THYROX_INFRA_PODMAN_NUM_LOCKS=2048 \
    bash "$SUBJECT" "$@"
}

# =====================================================================
# Caso 1 — ausente: se crea y se arranca, y queda sano.
# =====================================================================
reset_state
echo ok > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
out="$(run_ensure)"; rc=$?
thyrox_check "caso 1: ausente -> exit 0" "0" "$rc"
if [[ "$out" == *"thyrox-postgres"*"action=created"* ]]; then
  ok "caso 1: postgres ausente se reporta con action=created"
else
  bad "caso 1: no se vio action=created para postgres: [$out]"
fi
if [[ "$out" == *"thyrox-redis"*"action=created"* ]]; then
  ok "caso 1: redis ausente se reporta con action=created"
else
  bad "caso 1: no se vio action=created para redis: [$out]"
fi
if [[ "$out" == *"thyrox-ollama"*"action=created"* ]]; then
  ok "caso 1: ollama ausente se reporta con action=created"
else
  bad "caso 1: no se vio action=created para ollama: [$out]"
fi
thyrox_check "caso 1: el ensure recorre los tres en orden postgres, redis, ollama" \
  "thyrox-postgres thyrox-redis thyrox-ollama " "$(awk '{printf "%s ", $1}' <<<"$out")"
if grep -q -- '--network host' "$STATE/calls.log" && grep '^create ' "$STATE/calls.log" | grep -q 'thyrox-ollama'; then
  ok "caso 1: ollama se crea con la red del anfitrion"
else
  bad "caso 1: ollama no se creo con --network host: $(cat "$STATE/calls.log")"
fi
if grep -q '^network create thyrox-infra$' "$STATE/calls.log"; then
  ok "caso 1: la red thyrox-infra se crea cuando falta"
else
  bad "caso 1: no se creo la red thyrox-infra"
fi

# =====================================================================
# Caso 2 — running + PID vivo + sano: se conserva, sin create ni start ni rm.
# =====================================================================
reset_state
touch "$STATE/network-thyrox-infra"
( exec -a "${MARKER}-alive" sleep 999 ) &
alive_pid=$!
disown "$alive_pid" 2>/dev/null || true
for n in thyrox-postgres thyrox-redis thyrox-ollama; do
  echo running > "$STATE/$n.status"
  echo "$alive_pid" > "$STATE/$n.pid"
  echo ok > "$STATE/$n.health"
done
out="$(run_ensure)"; rc=$?
thyrox_check "caso 2: running+pid vivo+sano -> exit 0" "0" "$rc"
if [[ "$out" == *"thyrox-postgres"*"pid_alive=yes"*"action=kept"* ]]; then
  ok "caso 2: postgres vivo y sano se conserva (kept)"
else
  bad "caso 2: postgres no se conservo: [$out]"
fi
if grep -qE '^(create|start|rm) ' "$STATE/calls.log" 2>/dev/null; then
  bad "caso 2: se llamo create/start/rm sobre un contenedor que debia conservarse"
else
  ok "caso 2: ningun create/start/rm se invoco al conservar"
fi
kill "$alive_pid" 2>/dev/null; wait "$alive_pid" 2>/dev/null

# =====================================================================
# Caso 3 — running + PID MUERTO: stale, se recrea (rm -f + create + start).
# =====================================================================
reset_state
touch "$STATE/network-thyrox-infra"
( exit 0 ) & dead_pid=$!
wait "$dead_pid" 2>/dev/null
for n in thyrox-postgres thyrox-redis thyrox-ollama; do
  echo running > "$STATE/$n.status"
  echo "$dead_pid" > "$STATE/$n.pid"
  echo ok > "$STATE/$n.health"
done
out="$(run_ensure)"; rc=$?
thyrox_check "caso 3: running+pid muerto -> exit 0 tras recrear" "0" "$rc"
if [[ "$out" == *"thyrox-postgres"*"pid_alive=no"*"action=recreated"* ]]; then
  ok "caso 3: postgres con PID muerto se recrea (recreated)"
else
  bad "caso 3: postgres no se recreo: [$out]"
fi
if grep -q '^rm -f thyrox-postgres$' "$STATE/calls.log"; then
  ok "caso 3: se invoco rm -f sobre el contenedor stale"
else
  bad "caso 3: no se vio 'rm -f thyrox-postgres' en calls.log"
fi
if grep -E '^rm ' "$STATE/calls.log" | grep -q 'thyrox-postgres-data'; then
  bad "caso 3: el volumen thyrox-postgres-data aparece en una linea de rm"
else
  ok "caso 3: ningun rm -f toca el volumen thyrox-postgres-data"
fi
if [[ "$out" == *"thyrox-ollama"*"pid_alive=no"*"action=recreated"* ]]; then
  ok "caso 3: ollama con PID muerto se recrea (recreated)"
else
  bad "caso 3: ollama no se recreo: [$out]"
fi
if grep -q '^rm -f thyrox-ollama$' "$STATE/calls.log"; then
  ok "caso 3: se invoco rm -f sobre el ollama stale"
else
  bad "caso 3: no se vio 'rm -f thyrox-ollama' en calls.log"
fi
if grep -E '^rm ' "$STATE/calls.log" | grep -q 'thyrox-ollama-models'; then
  bad "caso 3: el volumen thyrox-ollama-models aparece en una linea de rm"
else
  ok "caso 3: ningun rm -f toca el volumen thyrox-ollama-models"
fi
if grep '^create ' "$STATE/calls.log" | grep 'thyrox-ollama' | grep -q 'thyrox-ollama-models:/root/.ollama'; then
  ok "caso 3: el ollama recreado vuelve a montar el volumen de modelos"
else
  bad "caso 3: el create de ollama no monta thyrox-ollama-models"
fi

# =====================================================================
# Caso 4 — exited: se arranca (start), sin create ni rm.
# =====================================================================
reset_state
touch "$STATE/network-thyrox-infra"
for n in thyrox-postgres thyrox-redis thyrox-ollama; do
  echo exited > "$STATE/$n.status"
  echo 0 > "$STATE/$n.pid"
  echo ok > "$STATE/$n.health"
done
out="$(run_ensure)"; rc=$?
thyrox_check "caso 4: exited -> exit 0 tras arrancar" "0" "$rc"
if [[ "$out" == *"thyrox-postgres"*"action=started"* ]]; then
  ok "caso 4: postgres exited se arranca (started)"
else
  bad "caso 4: postgres no se arranco: [$out]"
fi
if grep -qE '^create ' "$STATE/calls.log" 2>/dev/null; then
  bad "caso 4: se llamo create sobre un contenedor exited (solo debia arrancar)"
else
  ok "caso 4: exited no dispara create, solo start"
fi

# =====================================================================
# Caso 5 — nunca sano: exit 1, nombrando el contenedor y su salud.
# =====================================================================
reset_state
echo fail > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
err="$(TEST_HEALTH_TIMEOUT=4 TEST_HEALTH_INTERVAL=2 run_ensure 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 5: nunca sano -> exit 1" "1" "$rc"
if [[ "$err" == *"thyrox-postgres"* ]]; then
  ok "caso 5: el fallo nombra el contenedor que nunca sano"
else
  bad "caso 5: el stderr no nombro thyrox-postgres: [$err]"
fi

# =====================================================================
# Caso 6 — sin contraseña: exit 2, SIN llamar a podman.
# =====================================================================
reset_state
out="$(TEST_PASSWORD='' run_ensure 2>&1)"; rc=$?
thyrox_check "caso 6: sin contraseña -> exit 2" "2" "$rc"
if [[ "$out" == *THYROX_INFRA_POSTGRES_PASSWORD* ]]; then
  ok "caso 6: el rehuso nombra THYROX_INFRA_POSTGRES_PASSWORD"
else
  bad "caso 6: el rehuso no nombro la variable: [$out]"
fi
if [[ ! -f "$STATE/calls.log" ]]; then
  ok "caso 6: podman jamas se invoco (calls.log no existe)"
else
  bad "caso 6: podman se invoco pese a la contraseña faltante: $(cat "$STATE/calls.log")"
fi

# =====================================================================
# Caso 7 — idempotencia: dos invocaciones seguidas, la segunda conserva.
# =====================================================================
reset_state
echo ok > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
first_out="$(run_ensure)"; first_rc=$?
calls_after_first="$(wc -l < "$STATE/calls.log")"
second_out="$(run_ensure)"; second_rc=$?
thyrox_check "caso 7: primera invocacion -> exit 0" "0" "$first_rc"
if [[ "$first_out" == *"thyrox-postgres"*"action=created"* && \
      "$first_out" == *"thyrox-redis"*"action=created"* ]]; then
  ok "caso 7: la primera invocacion crea los dos contenedores (created)"
else
  bad "caso 7: la primera invocacion no creo los dos: [$first_out]"
fi
thyrox_check "caso 7: segunda invocacion -> exit 0" "0" "$second_rc"
if [[ "$second_out" == *"thyrox-postgres"*"action=kept"* && \
      "$second_out" == *"thyrox-redis"*"action=kept"* && \
      "$second_out" == *"thyrox-ollama"*"action=kept"* ]]; then
  ok "caso 7: la segunda invocacion conserva los tres contenedores (kept)"
else
  bad "caso 7: la segunda invocacion no conservo: [$second_out]"
fi
if tail -n +$((calls_after_first + 1)) "$STATE/calls.log" | grep -qE '^(create|rm) '; then
  bad "caso 7: la segunda invocacion volvio a crear o borrar algo"
else
  ok "caso 7: la segunda invocacion no recrea nada"
fi

# =====================================================================
# Caso 8 — TASK-THYROX-0671: imagen ausente y cabe -> admitir, crear, soltar.
# =====================================================================
reset_state
echo ok > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
need_pg="$(bash -c "source '$ROOT/src/lib/infrastructure.sh'; thyrox_infrastructure_disk_need_bytes thyrox-postgres")"
out="$(run_ensure)"; rc=$?
thyrox_check "caso 8: cabe -> exit 0" "0" "$rc"
if [[ "$out" == *"thyrox-postgres"*"action=created"* ]]; then
  ok "caso 8: con el disco admitido, postgres se crea"
else
  bad "caso 8: postgres no se creo: [$out]"
fi
if grep -q "^admission disk-admit --need-bytes $need_pg --owner [0-9]" "$STATE/calls.log"; then
  ok "caso 8: reserva la necesidad declarada de postgres a nombre de un pid"
else
  bad "caso 8: no se vio el disk-admit de postgres: $(cat "$STATE/calls.log")"
fi
order="$(grep -nE '^(admission disk-admit|create .*thyrox-postgres|admission disk-release)' "$STATE/calls.log" \
  | head -3 | sed -E 's/^[0-9]+:(admission )?//; s/ .*//' | tr '\n' ' ')"
thyrox_check "caso 8: el orden es admitir, crear y soltar" "disk-admit create disk-release " "$order"

# =====================================================================
# Caso 9 — imagen ausente y NO cabe: exit 2 sin podman create, con la causa.
# =====================================================================
reset_state
touch "$STATE/disk-full"
echo ok > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
err="$(run_ensure 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 9: no cabe -> exit 2" "2" "$rc"
if grep -qE '^create ' "$STATE/calls.log"; then
  bad "caso 9: se llamo podman create sin disco admitido"
else
  ok "caso 9: ningun podman create sin disco admitido"
fi
for piece in thyrox-postgres "$need_pg" "techo" "disk-reserve-reach-20260930T191002"; do
  if [[ "$err" == *"$piece"* ]]; then
    ok "caso 9: el rehuso nombra $piece"
  else
    bad "caso 9: el rehuso no nombro $piece: [$err]"
  fi
done

# =====================================================================
# Caso 10 — imagen presente con techo pequeño: crea sin pasar por la admision.
# =====================================================================
reset_state
touch "$STATE/disk-full" "$STATE/image-present"
echo ok > "$STATE/thyrox-postgres.health"
echo ok > "$STATE/thyrox-redis.health"
echo ok > "$STATE/thyrox-ollama.health"
out="$(run_ensure)"; rc=$?
thyrox_check "caso 10: imagen presente -> exit 0 aunque el disco no admita" "0" "$rc"
if grep -q '^admission ' "$STATE/calls.log"; then
  bad "caso 10: se paso por la admision con la imagen presente"
else
  ok "caso 10: con la imagen presente no se pide disco"
fi

# =====================================================================
# Caso 11 — el create falla: la reserva se suelta igual.
# =====================================================================
reset_state
touch "$STATE/create-fails"
out="$(TEST_HEALTH_TIMEOUT=2 run_ensure 2>/dev/null)"
if grep -q '^admission disk-release --owner [0-9]' "$STATE/calls.log"; then
  ok "caso 11: con el create fallido, la reserva se suelta"
else
  bad "caso 11: no se solto la reserva tras un create fallido: $(cat "$STATE/calls.log")"
fi

# =====================================================================
# Caso 12 — la variable de la admision esta declarada en .env.example.
# =====================================================================
if grep -q '^THYROX_INFRA_DISK_ADMISSION_BIN=$' "$ROOT/.env.example"; then
  ok "caso 12: .env.example declara THYROX_INFRA_DISK_ADMISSION_BIN"
else
  bad "caso 12: .env.example no declara THYROX_INFRA_DISK_ADMISSION_BIN"
fi

# =====================================================================
# Caso 13 — TASK-THYROX-0693: una seleccion sin postgres no exige su
# credencial y asegura sólo lo nombrado.
# =====================================================================
reset_state
echo ok > "$STATE/thyrox-ollama.health"
out="$(TEST_PASSWORD='' run_ensure thyrox-ollama 2>&1)"; rc=$?
thyrox_check "caso 13: sólo ollama, sin contraseña -> exit 0" "0" "$rc"
thyrox_check "caso 13: publica una sola linea, la de ollama" "thyrox-ollama " \
  "$(awk '{printf "%s ", $1}' <<<"$out")"
if ! grep -q -- '--name thyrox-postgres\|--name thyrox-redis' "$STATE/calls.log"; then
  ok "caso 13: no crea postgres ni redis"
else
  bad "caso 13: creo un contenedor no seleccionado: [$(cat "$STATE/calls.log")]"
fi

# =====================================================================
# Caso 14 — una seleccion que incluye postgres sigue exigiendo su credencial.
# =====================================================================
reset_state
out="$(TEST_PASSWORD='' run_ensure thyrox-ollama thyrox-postgres 2>&1)"; rc=$?
thyrox_check "caso 14: con postgres seleccionado y sin contraseña -> exit 2" "2" "$rc"
thyrox_check "caso 14: no invoca podman" "0" "$(wc -l < "$STATE/calls.log" 2>/dev/null || echo 0)"

# =====================================================================
# Caso 15 — un nombre que la declaracion no conoce se rehusa sin tocar nada.
# =====================================================================
reset_state
out="$(run_ensure thyrox-mongo 2>&1)"; rc=$?
thyrox_check "caso 15: nombre desconocido -> exit 2" "2" "$rc"
if [[ "$out" == *thyrox-mongo* ]]; then ok "caso 15: el rehuso nombra el contenedor"; else bad "caso 15: no lo nombro: [$out]"; fi
thyrox_check "caso 15: no invoca podman" "0" "$(wc -l < "$STATE/calls.log" 2>/dev/null || echo 0)"

# =====================================================================
# Casos 16-18 — TASK-THYROX-0695: colision de locks de Podman tras un
# reinicio. El ensure la reconoce por su literal, nombra contenedor, literal
# y remedio, sale con su codigo propio y no reintenta ni renumera.
# =====================================================================
LOCK_LITERAL='deadlock due to lock mismatch'
EXIT_LOCK_COLLISION=3

# assert_collision_reported <caso> <stderr> — las cuatro piezas de la linea.
assert_collision_reported() {
  local label="$1" text="$2" piece
  for piece in thyrox-postgres "$LOCK_LITERAL" retirar "podman system renumber"; do
    if [[ "$text" == *"$piece"* ]]; then
      ok "$label: el stderr nombra $piece"
    else
      bad "$label: el stderr no nombra $piece: [$text]"
    fi
  done
}

reset_state
touch "$STATE/lock-collision-create"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 16: colision en create -> exit propio $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
assert_collision_reported "caso 16" "$err"
thyrox_check "caso 16: un solo create, sin reintento" "1" "$(grep -c '^create ' "$STATE/calls.log")"
if grep -qE '^(start|exec) ' "$STATE/calls.log"; then
  bad "caso 16: tras la colision se arranco o se sondeo la salud"
else
  ok "caso 16: tras la colision no se arranca ni se sondea la salud"
fi
if grep -q '^admission disk-release --owner [0-9]' "$STATE/calls.log"; then
  ok "caso 16: la reserva de disco se suelta antes de salir"
else
  bad "caso 16: no se solto la reserva de disco: $(cat "$STATE/calls.log")"
fi
if grep -q '^system ' "$STATE/calls.log"; then
  bad "caso 16: el ensure invoco podman system por su cuenta"
else
  ok "caso 16: el ensure nunca invoca podman system"
fi

reset_state
touch "$STATE/network-thyrox-infra" "$STATE/lock-collision-start"
echo exited > "$STATE/thyrox-postgres.status"
echo 0 > "$STATE/thyrox-postgres.pid"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 17: colision en start -> exit propio $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
assert_collision_reported "caso 17" "$err"
thyrox_check "caso 17: un solo start, sin reintento" "1" "$(grep -c '^start ' "$STATE/calls.log")"

reset_state
touch "$STATE/create-fails"
err="$(TEST_HEALTH_TIMEOUT=2 run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 18: un create fallido sin el literal sigue siendo el fallo generico" "1" "$rc"
if [[ "$err" == *"$LOCK_LITERAL"* || "$err" == *"podman system renumber"* ]]; then
  bad "caso 18: un fallo sin el literal se reporto como colision: [$err]"
else
  ok "caso 18: un fallo sin el literal no se reporta como colision"
fi

if grep -qE '^# Exit 3 ' "$SUBJECT"; then
  ok "caso 18: la cabecera del sujeto declara el exit 3"
else
  bad "caso 18: la cabecera del sujeto no declara el exit 3"
fi

# =====================================================================
# Casos 19-23 — locks desfasados tras reiniciar la VM (H-THYROX-302).
# La memoria compartida de Podman se rehace vacía y la base conserva el
# número de lock de cada objeto: locks asignados < objetos. El ensure lo mide
# ANTES de tocar nada y renumera sólo si ningún contenedor tiene proceso vivo.
# Episodio real (2026-10-01): 2048 libres de 2048 con 2 contenedores y 5
# volúmenes en la base.
# =====================================================================

# seed_stale_base — el estado del episodio: un contenedor «running» con el
# PID muerto, dos volúmenes y la memoria de locks vacía.
seed_stale_base() {
  reset_state
  touch "$STATE/network-thyrox-infra"
  echo running > "$STATE/thyrox-postgres.status"
  echo 999999 > "$STATE/thyrox-postgres.pid"
  echo 0 > "$STATE/thyrox-postgres.lock"
  printf 'vol-a 1\nvol-b 1\n' > "$STATE/volumes"
  echo 2048 > "$STATE/free-locks"
  echo ok > "$STATE/thyrox-postgres.health"
}

# first_line_matching <regex> — número de la primera línea de calls.log que casa.
first_line_matching() { grep -nE "$1" "$STATE/calls.log" | head -1 | cut -d: -f1; }

seed_stale_base
out="$(run_ensure thyrox-postgres 2>&1)"; rc=$?
thyrox_check "caso 19: locks desfasados con todo parado -> exit 0" "0" "$rc"
thyrox_check "caso 19: renumera una sola vez" "1" "$(grep -c '^system renumber' "$STATE/calls.log")"
renumber_at="$(first_line_matching '^system renumber')"
mutation_at="$(first_line_matching '^(rm|create|start) ')"
if [[ -n "$renumber_at" && -n "$mutation_at" && "$renumber_at" -lt "$mutation_at" ]]; then
  ok "caso 19: renumera ANTES de retirar, crear o arrancar"
else
  bad "caso 19: el orden no es renumerar primero: $(cat "$STATE/calls.log")"
fi
if [[ "$out" == *"locks"*"asignados 0"*"referenciados 2"*"renumerados"* ]]; then
  ok "caso 19: publica la medida y la acción"
else
  bad "caso 19: no publica asignados, objetos y acción: [$out]"
fi

reset_state
touch "$STATE/network-thyrox-infra"
printf 'vol-a 1\nvol-b 1\n' > "$STATE/volumes"
echo 2047 > "$STATE/free-locks"
echo ok > "$STATE/thyrox-postgres.health"
run_ensure thyrox-postgres >/dev/null 2>&1; rc=$?
thyrox_check "caso 20: base coherente -> exit 0" "0" "$rc"
thyrox_check "caso 20: base coherente -> no renumera" "0" "$(grep -c '^system ' "$STATE/calls.log")"

seed_stale_base
nohup bash -c "exec -a ${MARKER}-live sleep 999" >/dev/null 2>&1 &
live_pid=$!; disown "$live_pid" 2>/dev/null || true
echo running > "$STATE/thyrox-redis.status"
echo "$live_pid" > "$STATE/thyrox-redis.pid"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 21: desfase con un contenedor vivo -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
thyrox_check "caso 21: con un contenedor vivo no renumera" "0" "$(grep -c '^system ' "$STATE/calls.log")"
if [[ "$err" == *thyrox-redis* && "$err" == *"podman system renumber"* ]]; then
  ok "caso 21: nombra el contenedor vivo y el remedio"
else
  bad "caso 21: el stderr no nombra el contenedor vivo ni el remedio: [$err]"
fi
if grep -qE '^(rm|create|start) ' "$STATE/calls.log"; then
  bad "caso 21: tocó contenedores tras rehusar"
else
  ok "caso 21: rehúsa antes de tocar ningún contenedor"
fi

seed_stale_base
rm -f "$STATE/free-locks"
run_ensure thyrox-postgres >/dev/null 2>&1; rc=$?
thyrox_check "caso 22: sin medida de locks -> sigue (exit 0)" "0" "$rc"
thyrox_check "caso 22: sin medida de locks no renumera a ciegas" "0" "$(grep -c '^system ' "$STATE/calls.log")"

seed_stale_base
touch "$STATE/renumber-noop"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 23: renumerar no corrige -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
if [[ "$err" == *"asignados 0"*"referenciados 2"* ]]; then
  ok "caso 23: el diagnóstico publica la medida tras renumerar"
else
  bad "caso 23: el diagnóstico no publica la medida: [$err]"
fi

# Caso 24 — el estado REAL medido el 2026-10-01 tras `podman system renumber`
# en Podman 4.9.3: los contenedores tienen los locks 0 y 1, y los cinco
# volúmenes comparten números (1, 1, 0, 4, 1). Distintos referenciados {0,1,4}
# = 3 = asignados 3: coherente. Contar objetos (7) lo declaraba desfasado.
reset_state
touch "$STATE/network-thyrox-infra"
echo running > "$STATE/thyrox-postgres.status"; echo 999999 > "$STATE/thyrox-postgres.pid"
echo 0 > "$STATE/thyrox-postgres.lock"
echo exited > "$STATE/thyrox-redis.status"; echo 1 > "$STATE/thyrox-redis.lock"
printf 'probe 1\nlab-models 1\nlab-artifacts 0\nbench 4\nanon 1\n' > "$STATE/volumes"
echo 2045 > "$STATE/free-locks"
echo ok > "$STATE/thyrox-postgres.health"
run_ensure thyrox-postgres >/dev/null 2>&1; rc=$?
thyrox_check "caso 24: estado real tras renumerar -> exit 0" "0" "$rc"
thyrox_check "caso 24: estado real tras renumerar -> no renumera" "0" "$(grep -c '^system ' "$STATE/calls.log")"

# Caso 25 — reinicio (TASK-THYROX-0727): Redis y Ollama persistidos como
# `running` con el PID muerto y los locks desfasados. La reconciliación no
# confía en lo persistido: renumera, invalida los dos `running`, los recrea y
# sólo los declara listos tras su health check.
reset_state
touch "$STATE/network-thyrox-infra" "$STATE/image-present"
for svc in thyrox-redis thyrox-ollama; do
  echo running > "$STATE/$svc.status"
  echo 999999 > "$STATE/$svc.pid"
  echo ok > "$STATE/$svc.health"
done
echo 0 > "$STATE/thyrox-redis.lock"; echo 1 > "$STATE/thyrox-ollama.lock"
printf 'models 1\n' > "$STATE/volumes"
echo 2048 > "$STATE/free-locks"
out="$(run_ensure thyrox-redis thyrox-ollama 2>&1)"; rc=$?
thyrox_check "caso 25: reinicio -> exit 0" "0" "$rc"
thyrox_check "caso 25: reinicio -> renumera una vez" "1" "$(grep -c '^system renumber' "$STATE/calls.log")"
for svc in thyrox-redis thyrox-ollama; do
  if [[ "$out" == *"$svc status=running pid_alive=no action=recreated health=healthy"* ]]; then
    ok "caso 25: $svc persistido running con PID muerto -> recreado y sano"
  else
    bad "caso 25: $svc no se reconcilió a recreado y sano: [$out]"
  fi
done

# =====================================================================
# Casos 26-28 — TASK-THYROX-0735: un contenedor vivo y sano montado sobre un
# volumen distinto del declarado no se conserva: se recrea sobre el
# declarado, sin borrar ningún volumen. El declarado sale del proceso o del
# .env (H-THYROX-307: thyrox-ollama quedó sobre un volumen vacío).
# =====================================================================
live_ollama_on() {
  reset_state
  touch "$STATE/network-thyrox-infra"
  ( exec -a "${MARKER}-drift" sleep 999 ) &
  local pid=$!
  disown "$pid" 2>/dev/null || true
  echo running > "$STATE/thyrox-ollama.status"
  echo "$pid" > "$STATE/thyrox-ollama.pid"
  echo ok > "$STATE/thyrox-ollama.health"
  echo "$1" > "$STATE/thyrox-ollama.volumes"
}

live_ollama_on old-empty-volume
out="$(THYROX_INFRA_OLLAMA_VOLUME=declared-volume run_ensure thyrox-ollama 2>&1)"; rc=$?
thyrox_check "caso 26: volumen distinto del declarado -> exit 0" "0" "$rc"
if [[ "$out" == *"thyrox-ollama status=running pid_alive=yes action=recreated health=healthy"* ]]; then
  ok "caso 26: vivo sobre otro volumen -> recreado y sano"
else
  bad "caso 26: no se recreó el ollama montado sobre otro volumen: [$out]"
fi
if grep -q '^create .*-v declared-volume:/root/.ollama' "$STATE/calls.log"; then
  ok "caso 26: el recreado monta el volumen declarado"
else
  bad "caso 26: el create no monta declared-volume: $(cat "$STATE/calls.log")"
fi
if grep -E '^(rm|volume rm)' "$STATE/calls.log" | grep -q old-empty-volume; then
  bad "caso 26: se tocó el volumen anterior en un rm"
else
  ok "caso 26: el volumen anterior no se borra"
fi

live_ollama_on thyrox-ollama-models
out="$(run_ensure thyrox-ollama 2>&1)"; rc=$?
if [[ "$out" == *"thyrox-ollama status=running pid_alive=yes action=kept health=healthy"* ]] \
   && ! grep -qE '^(create|rm|start)' "$STATE/calls.log"; then
  ok "caso 27: vivo sobre el volumen declarado -> se conserva sin create/rm/start"
else
  bad "caso 27: el ollama sobre su volumen declarado no se conservó: [$out]"
fi

live_ollama_on thyrox-ollama-models
printf 'THYROX_INFRA_OLLAMA_VOLUME=volume-from-env-file\n' > "$WORK/declared.env"
out="$(TEST_ENV_FILE="$WORK/declared.env" run_ensure thyrox-ollama 2>&1)"; rc=$?
if [[ "$out" == *"action=recreated"* ]] && grep -q '^create .*-v volume-from-env-file:/root/.ollama' "$STATE/calls.log"; then
  ok "caso 28: el volumen declarado sólo en el .env gobierna el ensure"
else
  bad "caso 28: el .env no gobernó el volumen del ensure: [$out] $(cat "$STATE/calls.log")"
fi

# Caso 29 — renumber falla con el defecto conocido de Podman 4.9.3 sobre
# backend sqlite («updating volume config table with new configuration for
# volume …: no such column: ID», exit 125; H-THYROX-308). El ensure
# conserva la salida de Podman, nombra el defecto y el procedimiento explícito
# de recuperación, y rehúsa: no repara internals de Podman por su cuenta.
SQLITE_RENUMBER_ERROR="updating volume config table with new configuration for volume vol-a: no such column: ID"
seed_stale_base
echo "$SQLITE_RENUMBER_ERROR" > "$STATE/renumber-fails"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 29: renumber falla -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
if [[ "$err" == *"$SQLITE_RENUMBER_ERROR"* ]]; then
  ok "caso 29: la salida de renumber se publica verbatim"
else
  bad "caso 29: la salida de renumber se perdió: [$err]"
fi
if [[ "$err" == *"defecto conocido"*"sqlite"* ]]; then
  ok "caso 29: nombra el defecto conocido del backend sqlite"
else
  bad "caso 29: no nombra el defecto conocido: [$err]"
fi
if [[ "$err" == *"bin/podman_lock_recovery"* ]]; then
  ok "caso 29: nombra el procedimiento explícito de recuperación"
else
  bad "caso 29: no nombra el procedimiento de recuperación: [$err]"
fi
if grep -qE '^(create|start|rm) ' "$STATE/calls.log"; then
  bad "caso 29: tocó contenedores tras rehusar"
else
  ok "caso 29: rehúsa antes de tocar ningún contenedor"
fi

# Caso 30 — renumber falla por otra causa: salida verbatim, sin atribuirla al
# defecto de sqlite. El diagnóstico no se infiere de un fallo cualquiera.
seed_stale_base
echo "Error: some other renumber failure" > "$STATE/renumber-fails"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 30: renumber falla por otra causa -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
if [[ "$err" == *"Error: some other renumber failure"* && "$err" != *"defecto conocido"* ]]; then
  ok "caso 30: publica la salida sin atribuirla al defecto de sqlite"
else
  bad "caso 30: diagnóstico equivocado: [$err]"
fi

thyrox_summary
