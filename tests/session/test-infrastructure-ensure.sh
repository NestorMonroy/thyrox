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
  info) exit 0 ;;
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
    name=""
    prev=""
    for a in "\$@"; do
      [[ "\$prev" == "--name" ]] && name="\$a"
      prev="\$a"
    done
    echo created > "\$STATE/\${name}.status"
    echo 0 > "\$STATE/\${name}.pid"
    exit 0
    ;;
  start)
    name="\$2"
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
run_ensure() {
  THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-fake" \
  THYROX_INFRA_ENSURE_SLEEP_BIN="$WORK/sleep-fake" \
  THYROX_INFRA_DISK_ADMISSION_BIN="$WORK/admission-fake" \
  THYROX_INFRA_HEALTH_TIMEOUT="${TEST_HEALTH_TIMEOUT:-6}" \
  THYROX_INFRA_HEALTH_INTERVAL="${TEST_HEALTH_INTERVAL:-2}" \
  THYROX_INFRA_POSTGRES_PASSWORD="${TEST_PASSWORD-secret123}" \
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

thyrox_summary
