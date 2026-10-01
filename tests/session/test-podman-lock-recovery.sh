#!/usr/bin/env bash
# test-podman-lock-recovery.sh — contrato del procedimiento EXPLÍCITO de
# recuperación de locks de Podman.
#
# `src/session/podman_lock_recovery.sh` es la reparación que el ensure NO
# hace: retirar el marcador `alive` del directorio temporal de libpod para que
# el siguiente comando de Podman refresque y vuelva a asignar el lock que la
# base guarda por objeto. Aquí `podman` es un binario FALSO: el refresco se
# modela como «sin marcador, el siguiente `ps` asigna cada número distinto
# referenciado y recrea el marcador», que es la conducta medida en Podman
# 4.9.3 con backend sqlite.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/session/podman_lock_recovery.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

[[ -x "$SUBJECT" ]] && ok "el sujeto existe y es ejecutable" || { bad "no existe o no es ejecutable: $SUBJECT"; thyrox_summary; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK:?}"' EXIT
STATE="$WORK/state"
LIBPOD="$WORK/libpod"

cat > "$WORK/podman-fake" <<STUB
#!/usr/bin/env bash
STATE="$STATE"
LIBPOD="$LIBPOD"
printf '%s\n' "\$*" >> "\$STATE/calls.log"
referenced() { cat "\$STATE/containers" "\$STATE/volumes" 2>/dev/null | cut -d' ' -f2 | sort -u; }
refresh_if_needed() {
  [[ -e "\$LIBPOD/alive" ]] && return
  echo \$(( 2048 - \$(referenced | grep -c .) )) > "\$STATE/free-locks"
  touch "\$LIBPOD/alive"
}
case "\$1" in
  version) cat "\$STATE/version"; exit 0 ;;
  info)
    [[ "\$*" == *DatabaseBackend* ]] && { cat "\$STATE/backend"; exit 0; }
    [[ "\$*" == *FreeLocks* ]] && { refresh_if_needed; cat "\$STATE/free-locks"; exit 0; }
    exit 0 ;;
  ps) refresh_if_needed; cut -d' ' -f1 "\$STATE/containers" 2>/dev/null; exit 0 ;;
  container)
    shift 3
    for n in "\$@"; do grep "^\$n " "\$STATE/containers" | cut -d' ' -f2; done; exit 0 ;;
  pod) exit 0 ;;
  volume) cut -d' ' -f2 "\$STATE/volumes"; exit 0 ;;
  inspect)
    n="\${@: -1}"
    printf '%s\t%s\n' "\$(grep "^\$n " "\$STATE/containers" | cut -d' ' -f3)" "\$(grep "^\$n " "\$STATE/containers" | cut -d' ' -f4)"
    exit 0 ;;
esac
exit 1
STUB
chmod +x "$WORK/podman-fake"

# Estado medido tras el renumber fallido: dos contenedores con PID muerto en
# los locks 0 y 1, volúmenes en 0, 1, 3 y 4, y tres locks asignados.
seed_imbalanced() {
  rm -rf "${STATE:?}" "${LIBPOD:?}"; mkdir -p "$STATE" "$LIBPOD"
  printf 'ctr-a 0 running 999999\nctr-b 1 running 999998\n' > "$STATE/containers"
  printf 'vol-a 1\nvol-b 0\nvol-c 3\nvol-d 4\n' > "$STATE/volumes"
  echo 2045 > "$STATE/free-locks"
  echo 4.9.3 > "$STATE/version"
  echo sqlite > "$STATE/backend"
  touch "$LIBPOD/alive"
}
run_recovery() {
  THYROX_TOOLCHAIN_PODMAN_BIN="$WORK/podman-fake" \
  THYROX_INFRA_PODMAN_NUM_LOCKS=2048 \
  THYROX_PODMAN_LIBPOD_TMP_DIR="${TEST_LIBPOD:-$LIBPOD}" \
  THYROX_PODMAN_LOCK_RECOVERY_UID="${TEST_UID:-0}" \
    bash "$SUBJECT" "$@"
}

# Caso 1 — sin --confirm es un plan: publica la medida y no toca nada.
seed_imbalanced
out="$(run_recovery 2>&1)"; rc=$?
thyrox_check "caso 1: plan -> exit 0" "0" "$rc"
[[ -e "$LIBPOD/alive" ]] && ok "caso 1: el plan no retira el marcador" || bad "caso 1: el plan retiró el marcador"
if [[ "$out" == *"4.9.3"*"sqlite"*"asignados 3"*"referenciados 4"* && "$out" == *"--confirm"* ]]; then
  ok "caso 1: el plan publica versión, backend, medida y cómo confirmar"
else
  bad "caso 1: el plan no publica la medida: [$out]"
fi

# Caso 2 — con --confirm retira el marcador, Podman refresca y la medida cuadra.
seed_imbalanced
out="$(run_recovery --confirm 2>&1)"; rc=$?
thyrox_check "caso 2: recuperación -> exit 0" "0" "$rc"
if [[ "$out" == *"asignados 4"*"referenciados 4"* ]]; then
  ok "caso 2: publica la medida equilibrada tras refrescar"
else
  bad "caso 2: no publica la medida posterior: [$out]"
fi

# Caso 3 — idempotente: con la medida equilibrada no hay nada que recuperar.
# El marcador lleva un contenido que el refresco del falso no reproduce: si
# sigue ahí, nadie lo retiró.
echo sentinel > "$LIBPOD/alive"
out="$(run_recovery --confirm 2>&1)"; rc=$?
thyrox_check "caso 3: equilibrado -> exit 0" "0" "$rc"
thyrox_check "caso 3: equilibrado -> no vuelve a retirar el marcador" "sentinel" "$(cat "$LIBPOD/alive" 2>/dev/null)"
[[ "$out" == *"nada que recuperar"* ]] && ok "caso 3: lo dice" || bad "caso 3: no dice que no hay nada que recuperar: [$out]"

# Caso 4 — con un contenedor vivo rehúsa sin tocar el marcador.
seed_imbalanced
sleep 999 & live_pid=$!
printf 'ctr-a 0 running %s\nctr-b 1 running 999998\n' "$live_pid" > "$STATE/containers"
err="$(run_recovery --confirm 2>&1 >/dev/null)"; rc=$?
kill "$live_pid" 2>/dev/null
thyrox_check "caso 4: contenedor vivo -> exit 2" "2" "$rc"
[[ -e "$LIBPOD/alive" ]] && ok "caso 4: no retira el marcador" || bad "caso 4: retiró el marcador con un contenedor vivo"
[[ "$err" == *"ctr-a"* ]] && ok "caso 4: nombra el contenedor vivo" || bad "caso 4: no nombra el contenedor vivo: [$err]"

# Caso 5 — fuera del alcance medido (otra versión, otro backend, sin root)
# rehúsa: el procedimiento sólo se midió en Podman 4.9.3, sqlite, root.
for variant in version:5.0.1 backend:boltdb uid:1000; do
  seed_imbalanced
  key="${variant%%:*}"; value="${variant#*:}"
  if [[ "$key" == uid ]]; then
    err="$(TEST_UID="$value" run_recovery --confirm 2>&1 >/dev/null)"; rc=$?
  else
    echo "$value" > "$STATE/$key"
    err="$(run_recovery --confirm 2>&1 >/dev/null)"; rc=$?
  fi
  thyrox_check "caso 5: $variant -> exit 2" "2" "$rc"
  [[ -e "$LIBPOD/alive" ]] && ok "caso 5: $variant no retira el marcador" || bad "caso 5: $variant retiró el marcador"
  [[ "$err" == *"$value"* ]] && ok "caso 5: $variant nombra lo que está fuera de alcance" || bad "caso 5: $variant no lo nombra: [$err]"
done

# Caso 6 — sin marcador no se infiere su semántica: rehúsa.
seed_imbalanced
err="$(TEST_LIBPOD="$WORK/absent" run_recovery --confirm 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 6: sin marcador -> exit 2" "2" "$rc"
[[ "$err" == *"$WORK/absent/alive"* ]] && ok "caso 6: nombra el marcador ausente" || bad "caso 6: no nombra el marcador: [$err]"

thyrox_summary
