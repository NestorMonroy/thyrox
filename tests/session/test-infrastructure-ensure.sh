#!/usr/bin/env bash
# test-infrastructure-ensure.sh — contrato del bootstrap de la infraestructura
# gestionada (ADR-007 Regla 4, enmienda 1.15.0; TASK-THYROX-0606, 0740).
#
# `src/session/infrastructure_ensure.sh` orquesta y declara: valida la
# selección y la credencial, mide el balance de locks de Podman, admite el
# disco de las imágenes que faltan y entrega el estado deseado a
# `bin/infrastructure-bootstrap`, que lo materializa por la primitiva Podman.
# El ensure no crea, no arranca, no retira ni ejecuta contenedores: cada caso lo
# comprueba sobre el argv real que recibe el `podman` falso.
#
# `podman`, el bootstrap y la admisión de disco son dobles que registran su
# argv en el mismo calls.log, para medir el orden.
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
cleanup() { pkill -f "$MARKER" 2>/dev/null; rm -rf "${WORK:?}"; }
trap cleanup EXIT
STATE="$WORK/state"
mkdir -p "$STATE"
readonly EXIT_LOCK_COLLISION=3

# --- el podman falso: sólo lo que el ensure puede invocar sin materializar ---
cat > "$WORK/podman-fake" <<STUB
#!/usr/bin/env bash
STATE="$STATE"
printf '%s\n' "\$*" >> "\$STATE/calls.log"
case "\$1" in
  info)
    [[ "\$*" == *FreeLocks* && -f "\$STATE/free-locks" ]] && cat "\$STATE/free-locks"
    exit 0 ;;
  ps)
    for f in "\$STATE"/*.status; do [[ -e "\$f" ]] && basename "\$f" .status; done
    exit 0 ;;
  container)
    shift 3
    for name in "\$@"; do cat "\$STATE/\${name}.lock" 2>/dev/null || echo 0; done
    exit 0 ;;
  pod|volume)
    file="\$STATE/\${1}s"
    [[ "\$2" == inspect ]] && { cut -d' ' -f2 "\$file" 2>/dev/null; exit 0; }
    exit 0 ;;
  system)
    if [[ "\$2" == renumber && -f "\$STATE/renumber-fails" ]]; then
      cat "\$STATE/renumber-fails"
      exit 125
    fi
    if [[ "\$2" == renumber && ! -f "\$STATE/renumber-noop" ]]; then
      referenced=\$(cat "\$STATE"/*.lock 2>/dev/null; cut -d' ' -f2 "\$STATE/pods" "\$STATE/volumes" 2>/dev/null)
      echo \$(( 2048 - \$(printf '%s\n' "\$referenced" | grep . | sort -u | wc -l) )) > "\$STATE/free-locks"
    fi
    exit 0 ;;
  inspect)
    name="\${@: -1}"
    [[ -f "\$STATE/\${name}.status" ]] || exit 1
    printf '%s\t%s\n' "\$(cat "\$STATE/\${name}.status")" "\$(cat "\$STATE/\${name}.pid" 2>/dev/null || echo 0)"
    exit 0 ;;
  image)
    [[ "\$2" == exists && -f "\$STATE/image-present" ]] && exit 0
    exit 1 ;;
esac
exit 1
STUB
chmod +x "$WORK/podman-fake"

# --- el bootstrap falso: guarda su stdin, su argv y el secreto que recibió por entorno ---
cat > "$WORK/bootstrap-fake" <<STUB
#!/usr/bin/env bash
STATE="$STATE"
printf 'bootstrap %s\n' "\$*" >> "\$STATE/calls.log"
cat > "\$STATE/bootstrap.stdin"
printf '%s' "\${THYROX_INFRA_POSTGRES_PASSWORD-<unset>}" > "\$STATE/bootstrap.password"
cat "\$STATE/bootstrap.stdout" 2>/dev/null
exit "\$(cat "\$STATE/bootstrap.exit" 2>/dev/null || echo 0)"
STUB
chmod +x "$WORK/bootstrap-fake"

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

reset_state() { rm -rf "${STATE:?}"; mkdir -p "$STATE"; touch "$STATE/image-present"; }
: > "$WORK/empty.env"
run_ensure() {
  THYROX_ENV_FILE="${TEST_ENV_FILE:-$WORK/empty.env}" \
  THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-fake" \
  THYROX_INFRA_BOOTSTRAP_BIN="$WORK/bootstrap-fake" \
  THYROX_INFRA_DISK_ADMISSION_BIN="$WORK/admission-fake" \
  THYROX_INFRA_POSTGRES_PASSWORD="${TEST_PASSWORD-secret123}" \
  THYROX_INFRA_PODMAN_NUM_LOCKS=2048 \
    bash "$SUBJECT" "$@"
}

# El ensure nunca materializa: ni create, ni start, ni rm, ni exec, ni run.
expect_no_materialization() {
  if [[ -f "$STATE/calls.log" ]] && grep -qE '^(create|start|rm|exec|run|stop|network create|volume create|secret) ' "$STATE/calls.log"; then
    bad "$1: el ensure invocó podman para materializar: $(grep -E '^(create|start|rm|exec|run|stop|network|volume create|secret)' "$STATE/calls.log" | head -3 | tr '\n' ';')"
  else
    ok "$1: ningún podman create/start/rm/exec/run desde el ensure"
  fi
}

declared_names() { jq -r '[.[].name] | join(",")' "$STATE/bootstrap.stdin" 2>/dev/null; }

# =====================================================================
# Caso 1 — los tres: el estado deseado llega al bootstrap, en orden.
# =====================================================================
reset_state
printf 'thyrox-postgres action=created\nthyrox-redis action=created\nthyrox-ollama action=created\n' > "$STATE/bootstrap.stdout"
out="$(run_ensure)"; rc=$?
thyrox_check "caso 1: los tres -> exit 0" "0" "$rc"
thyrox_check "caso 1: el bootstrap recibe los tres, en orden" "thyrox-postgres,thyrox-redis,thyrox-ollama" "$(declared_names)"
thyrox_check "caso 1: el bootstrap se invoca una vez" "1" "$(grep -c '^bootstrap' "$STATE/calls.log")"
if [[ "$out" == *"thyrox-postgres action=created"*"thyrox-ollama action=created"* ]]; then
  ok "caso 1: las líneas del bootstrap llegan a stdout"
else
  bad "caso 1: no se vieron las líneas del bootstrap: [$out]"
fi
expect_no_materialization "caso 1"

# =====================================================================
# Caso 2 — la credencial llega al bootstrap por su entorno, nunca por argv ni stdin.
# =====================================================================
reset_state
printf 'THYROX_INFRA_POSTGRES_PASSWORD=from-env-file-77\n' > "$WORK/declared.env"
TEST_ENV_FILE="$WORK/declared.env" TEST_PASSWORD='' run_ensure thyrox-postgres >/dev/null; rc=$?
thyrox_check "caso 2: credencial en el .env -> exit 0" "0" "$rc"
thyrox_check "caso 2: el bootstrap recibe la credencial por su entorno" "from-env-file-77" "$(cat "$STATE/bootstrap.password")"
if grep -q 'from-env-file-77' "$STATE/calls.log" "$STATE/bootstrap.stdin"; then
  bad "caso 2: la credencial viajó en argv o en la declaración"
else
  ok "caso 2: la credencial no viaja en argv ni en la declaración"
fi

# =====================================================================
# Caso 3 — sólo ollama: no exige la credencial ni la entrega.
# =====================================================================
reset_state
TEST_PASSWORD='' run_ensure thyrox-ollama >/dev/null; rc=$?
thyrox_check "caso 3: sólo ollama, sin credencial -> exit 0" "0" "$rc"
thyrox_check "caso 3: el bootstrap recibe sólo ollama" "thyrox-ollama" "$(declared_names)"
thyrox_check "caso 3: sin postgres, el bootstrap no recibe la credencial" "<unset>" "$(cat "$STATE/bootstrap.password")"

# =====================================================================
# Caso 4 — postgres sin credencial: exit 2 sin invocar nada.
# =====================================================================
reset_state
out="$(TEST_PASSWORD='' run_ensure thyrox-postgres 2>&1)"; rc=$?
thyrox_check "caso 4: postgres sin credencial -> exit 2" "2" "$rc"
[[ "$out" == *THYROX_INFRA_POSTGRES_PASSWORD* ]] && ok "caso 4: nombra la variable" || bad "caso 4: no nombra la variable: [$out]"
[[ ! -f "$STATE/calls.log" ]] && ok "caso 4: ni podman ni el bootstrap se invocan" || bad "caso 4: se invocó algo: $(cat "$STATE/calls.log")"

# =====================================================================
# Caso 5 — nombre desconocido: exit 2 sin invocar nada.
# =====================================================================
reset_state
run_ensure thyrox-mongo >/dev/null 2>&1; rc=$?
thyrox_check "caso 5: nombre desconocido -> exit 2" "2" "$rc"
[[ ! -f "$STATE/calls.log" ]] && ok "caso 5: no se invoca nada" || bad "caso 5: se invocó algo: $(cat "$STATE/calls.log")"

# =====================================================================
# Caso 6 — el exit del bootstrap es el del ensure.
# =====================================================================
for code in 1 2 3; do
  reset_state
  echo "$code" > "$STATE/bootstrap.exit"
  run_ensure thyrox-redis >/dev/null 2>&1; rc=$?
  thyrox_check "caso 6: el bootstrap sale $code -> el ensure sale $code" "$code" "$rc"
done

# =====================================================================
# Casos 7-10 — admisión de disco antes de que el bootstrap baje una imagen.
# =====================================================================
reset_state
rm -f "$STATE/image-present"
need_pg="$(bash -c "source '$ROOT/src/lib/infrastructure.sh'; thyrox_infrastructure_disk_need_bytes thyrox-postgres")"
need_redis="$(bash -c "source '$ROOT/src/lib/infrastructure.sh'; thyrox_infrastructure_disk_need_bytes thyrox-redis")"
run_ensure thyrox-postgres thyrox-redis >/dev/null; rc=$?
thyrox_check "caso 7: cabe -> exit 0" "0" "$rc"
if grep -q "^admission disk-admit --need-bytes $(( need_pg + need_redis )) --owner [0-9]" "$STATE/calls.log"; then
  ok "caso 7: reserva la suma de las imágenes que faltan, a nombre de un pid"
else
  bad "caso 7: no se vio la reserva de la suma: $(cat "$STATE/calls.log")"
fi
order="$(grep -E '^(admission disk-admit|bootstrap|admission disk-release)' "$STATE/calls.log" | sed -E 's/^(admission )?//; s/ .*//' | tr '\n' ' ')"
thyrox_check "caso 7: el orden es admitir, materializar y soltar" "disk-admit bootstrap disk-release " "$order"

reset_state
rm -f "$STATE/image-present"
touch "$STATE/disk-full"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 8: no cabe -> exit 2" "2" "$rc"
thyrox_check "caso 8: sin disco admitido no se invoca el bootstrap" "0" "$(grep -c '^bootstrap' "$STATE/calls.log")"
for piece in thyrox-postgres "$need_pg" techo disk-reserve-reach-20260930T191002; do
  [[ "$err" == *"$piece"* ]] && ok "caso 8: el rehúso nombra $piece" || bad "caso 8: el rehúso no nombra $piece: [$err]"
done

reset_state
touch "$STATE/disk-full"
run_ensure >/dev/null 2>&1; rc=$?
thyrox_check "caso 9: imágenes presentes -> exit 0 aunque el disco no admita" "0" "$rc"
thyrox_check "caso 9: con las imágenes presentes no se pide disco" "0" "$(grep -c '^admission' "$STATE/calls.log")"

reset_state
rm -f "$STATE/image-present"
echo 1 > "$STATE/bootstrap.exit"
run_ensure thyrox-redis >/dev/null 2>&1
thyrox_check "caso 10: con el bootstrap fallido, la reserva se suelta" "1" "$(grep -c '^admission disk-release --owner [0-9]' "$STATE/calls.log")"

# =====================================================================
# Caso 11 — las variables de inyección están declaradas en .env.example.
# =====================================================================
for key in THYROX_INFRA_DISK_ADMISSION_BIN THYROX_INFRA_BOOTSTRAP_BIN; do
  grep -q "^${key}=$" "$ROOT/.env.example" && ok "caso 11: .env.example declara $key" || bad "caso 11: .env.example no declara $key"
done

# =====================================================================
# Casos 12-18 — gate de locks: el balance se mide antes de invocar el
# bootstrap, y renumber sólo se intenta sin contenedores vivos.
# =====================================================================
seed_stale_base() {
  reset_state
  echo running > "$STATE/thyrox-postgres.status"
  echo 999999 > "$STATE/thyrox-postgres.pid"
  echo 0 > "$STATE/thyrox-postgres.lock"
  printf 'vol-a 1\nvol-b 1\n' > "$STATE/volumes"
  echo 2048 > "$STATE/free-locks"
}
first_line_matching() { grep -nE "$1" "$STATE/calls.log" | head -1 | cut -d: -f1; }

seed_stale_base
out="$(run_ensure thyrox-postgres 2>&1)"; rc=$?
thyrox_check "caso 12: locks desfasados con todo parado -> exit 0" "0" "$rc"
thyrox_check "caso 12: renumera una sola vez" "1" "$(grep -c '^system renumber' "$STATE/calls.log")"
renumber_at="$(first_line_matching '^system renumber')"
bootstrap_at="$(first_line_matching '^bootstrap')"
if [[ -n "$renumber_at" && -n "$bootstrap_at" && "$renumber_at" -lt "$bootstrap_at" ]]; then
  ok "caso 12: renumera ANTES de materializar"
else
  bad "caso 12: el orden no es renumerar primero: $(cat "$STATE/calls.log")"
fi
[[ "$out" == *"asignados 0"*"referenciados 2"*"renumerados"* ]] && ok "caso 12: publica la medida y la acción" || bad "caso 12: no publica la medida: [$out]"
expect_no_materialization "caso 12"

reset_state
printf 'vol-a 1\nvol-b 1\n' > "$STATE/volumes"
echo 2047 > "$STATE/free-locks"
run_ensure thyrox-postgres >/dev/null 2>&1; rc=$?
thyrox_check "caso 13: base coherente -> exit 0" "0" "$rc"
thyrox_check "caso 13: base coherente -> no renumera" "0" "$(grep -c '^system ' "$STATE/calls.log")"

seed_stale_base
nohup bash -c "exec -a ${MARKER}-live sleep 999" >/dev/null 2>&1 &
live_pid=$!; disown "$live_pid" 2>/dev/null || true
echo running > "$STATE/thyrox-redis.status"
echo "$live_pid" > "$STATE/thyrox-redis.pid"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 14: desfase con un contenedor vivo -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
thyrox_check "caso 14: con un contenedor vivo no renumera" "0" "$(grep -c '^system ' "$STATE/calls.log")"
thyrox_check "caso 14: con un contenedor vivo no se invoca el bootstrap" "0" "$(grep -c '^bootstrap' "$STATE/calls.log")"
[[ "$err" == *thyrox-redis* && "$err" == *"podman system renumber"* ]] && ok "caso 14: nombra el contenedor vivo y el remedio" || bad "caso 14: no nombra el contenedor ni el remedio: [$err]"

seed_stale_base
rm -f "$STATE/free-locks"
run_ensure thyrox-postgres >/dev/null 2>&1; rc=$?
thyrox_check "caso 15: sin medida de locks -> sigue (exit 0)" "0" "$rc"
thyrox_check "caso 15: sin medida de locks no renumera a ciegas" "0" "$(grep -c '^system ' "$STATE/calls.log")"

seed_stale_base
touch "$STATE/renumber-noop"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 16: renumerar no corrige -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
[[ "$err" == *"asignados 0"*"referenciados 2"* ]] && ok "caso 16: publica la medida tras renumerar" || bad "caso 16: no publica la medida: [$err]"
thyrox_check "caso 16: sin locks corregidos no se invoca el bootstrap" "0" "$(grep -c '^bootstrap' "$STATE/calls.log")"

SQLITE_RENUMBER_ERROR="updating volume config table with new configuration for volume vol-a: no such column: ID"
seed_stale_base
echo "$SQLITE_RENUMBER_ERROR" > "$STATE/renumber-fails"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 17: renumber falla -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
[[ "$err" == *"$SQLITE_RENUMBER_ERROR"* ]] && ok "caso 17: la salida de renumber se publica verbatim" || bad "caso 17: la salida de renumber se perdió: [$err]"
[[ "$err" == *"defecto conocido"*"sqlite"* ]] && ok "caso 17: nombra el defecto conocido del backend sqlite" || bad "caso 17: no nombra el defecto conocido: [$err]"
[[ "$err" == *"bin/podman_lock_recovery"* ]] && ok "caso 17: nombra el procedimiento explícito de recuperación" || bad "caso 17: no nombra la recuperación: [$err]"
expect_no_materialization "caso 17"

seed_stale_base
echo "Error: some other renumber failure" > "$STATE/renumber-fails"
err="$(run_ensure thyrox-postgres 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 18: renumber falla por otra causa -> exit $EXIT_LOCK_COLLISION" "$EXIT_LOCK_COLLISION" "$rc"
if [[ "$err" == *"Error: some other renumber failure"* && "$err" != *"defecto conocido"* ]]; then
  ok "caso 18: publica la salida sin atribuirla al defecto de sqlite"
else
  bad "caso 18: diagnóstico equivocado: [$err]"
fi

thyrox_summary
