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
  [[ -e "\$STATE/no-refresh" ]] && return
  echo \$(( 2048 - \$(referenced | grep -c .) )) > "\$STATE/free-locks"
  touch "\$LIBPOD/alive"
}
# Una guarda que cambia A PARTIR de la medida N (N = llamadas a `version`):
# modela el TOCTOU entre clasificar y mutar.
change_guard_if_due() {
  local due calls
  due="\$(cat "\$STATE/change-at-measure" 2>/dev/null)" || return 0
  calls="\$(grep -c '^version' "\$STATE/calls.log")"
  (( calls >= due )) || return 0
  case "\$(cat "\$STATE/change-kind")" in
    live) sed -i "1s/ [0-9]*\\\$/ \$(cat "\$STATE/live-pid")/" "\$STATE/containers" ;;
    current-boot) touch "\$LIBPOD/alive" ;;
    partial) echo 2045 > "\$STATE/free-locks" ;;
  esac
  rm -f "\$STATE/change-at-measure"
}
[[ "\$1" == version ]] && change_guard_if_due
case "\$1" in
  version) cat "\$STATE/version"; exit 0 ;;
  info)
    [[ "\$*" == *DatabaseBackend* ]] && { cat "\$STATE/backend"; exit 0; }
    [[ "\$*" == *FreeLocks* ]] && { refresh_if_needed; cat "\$STATE/free-locks" 2>/dev/null; exit 0; }
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
  THYROX_PODMAN_PROC_STAT="${TEST_PROC_STAT:-$WORK/proc-stat}" \
    bash "$SUBJECT" "$@"
}

# El arranque del núcleo de las suites: `btime` de un /proc/stat falso.
# El marcador sembrado por `seed_imbalanced` es de este instante, así que
# para los casos 1-6 pertenece al arranque actual.
BOOT_EPOCH="$(date +%s)"
printf 'cpu  0 0 0 0\nbtime %s\nprocesses 1\n' "$BOOT_EPOCH" > "$WORK/proc-stat"

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

# =============================================================================
# --classify — el veredicto que el composer consume (P0c1)
# =============================================================================
# Contrato: una sola línea en stdout, HEALTHY, KNOWN_POST_REBOOT_RECOVERABLE o
# REFUSED <razón>; exit 0 en los tres; exit 2 sólo por uso. No muta nada.
#
# La firma post-reboot es CONJUNTA: 4.9.x, sqlite, uid 0, marcador presente
# con mtime < btime, allocated == 0, referenced > 0 y ningún vivo. Es el estado
# medido tras reiniciar la VM: /run no es volátil aquí, el marcador del
# arranque anterior sobrevive, Podman no refresca y la memoria compartida de
# locks nace vacía (H-THYROX-442).

# @description Siembra el estado post-reboot: N números de lock distintos
# referenciados, `allocated` asignados, contenedores con PID muerto y el
# marcador del arranque ANTERIOR (mtime una hora antes de btime).
# @arg $1 int asignados. @arg $2 int referenciados (>= 2).
seed_post_reboot() {
  local allocated="$1" referenced="$2" i
  rm -rf "${STATE:?}" "${LIBPOD:?}"; mkdir -p "$STATE" "$LIBPOD"
  printf 'ctr-redis 0 running 999999\nctr-ollama 1 running 999998\n' > "$STATE/containers"
  : > "$STATE/volumes"
  for (( i = 0; i < referenced; i++ )); do printf 'vol-%s %s\n' "$i" "$i" >> "$STATE/volumes"; done
  echo $(( 2048 - allocated )) > "$STATE/free-locks"
  echo 4.9.3 > "$STATE/version"
  echo sqlite > "$STATE/backend"
  echo previous-boot > "$LIBPOD/alive"
  touch -d "@$(( BOOT_EPOCH - 3600 ))" "$LIBPOD/alive"
}
marker_fingerprint() { printf '%s:%s' "$(cat "$LIBPOD/alive" 2>/dev/null)" "$(stat -c %Y "$LIBPOD/alive" 2>/dev/null)"; }
classify() { run_recovery --classify 2>/dev/null; }

# Caso 7 — 0/4 con todas las guardas: la firma conocida, sin mutar nada.
seed_post_reboot 0 4
before="$(marker_fingerprint)"
out="$(run_recovery --classify 2>/dev/null)"; rc=$?
thyrox_check "caso 7: 0/4 -> KNOWN_POST_REBOOT_RECOVERABLE" "KNOWN_POST_REBOOT_RECOVERABLE" "$out"
thyrox_check "caso 7: exit 0" "0" "$rc"
thyrox_check "caso 7: --classify no toca el marcador" "$before" "$(marker_fingerprint)"
thyrox_check "caso 7: --classify no refresca los locks" "2048" "$(cat "$STATE/free-locks")"

# Caso 8 — la firma no depende de N: 0/21 también.
seed_post_reboot 0 21
thyrox_check "caso 8: 0/21 -> KNOWN_POST_REBOOT_RECOVERABLE" "KNOWN_POST_REBOOT_RECOVERABLE" "$(classify)"

# Caso 9 — un desfase PARCIAL no es la firma: allocated < referenced no basta.
for pair in 3:4 5:21 20:21; do
  seed_post_reboot "${pair%%:*}" "${pair#*:}"
  thyrox_check "caso 9: ${pair/:/\/} -> REFUSED partial-allocation" "REFUSED partial-allocation" "$(classify)"
done

# Caso 10 — 0/N con un contenedor realmente vivo: rehúsa.
seed_post_reboot 0 4
sleep 999 & live_pid=$!
printf 'ctr-redis 0 running %s\nctr-ollama 1 running 999998\n' "$live_pid" > "$STATE/containers"
out="$(classify)"
kill "$live_pid" 2>/dev/null
thyrox_check "caso 10: 0/4 con un vivo -> REFUSED live-containers" "REFUSED live-containers" "$out"

# Caso 11 — fuera del alcance medido: versión, backend, uid.
for variant in version:5.0.1:unsupported-version backend:boltdb:unsupported-backend uid:1000:unsupported-uid; do
  seed_post_reboot 0 4
  IFS=: read -r key value reason <<< "$variant"
  if [[ "$key" == uid ]]; then
    out="$(TEST_UID="$value" run_recovery --classify 2>/dev/null)"
  else
    echo "$value" > "$STATE/$key"; out="$(classify)"
  fi
  thyrox_check "caso 11: $key=$value -> REFUSED $reason" "REFUSED $reason" "$out"
done

# Caso 12 — el marcador del arranque ACTUAL no es la firma: rehúsa.
seed_post_reboot 0 4
touch -d "@$(( BOOT_EPOCH + 5 ))" "$LIBPOD/alive"
thyrox_check "caso 12: marcador del boot actual -> REFUSED marker-current-boot" "REFUSED marker-current-boot" "$(classify)"
seed_post_reboot 0 4
touch -d "@$BOOT_EPOCH" "$LIBPOD/alive"
thyrox_check "caso 12: mtime == btime tampoco es anterior" "REFUSED marker-current-boot" "$(classify)"
seed_post_reboot 0 4
out="$(TEST_LIBPOD="$WORK/absent" run_recovery --classify 2>/dev/null)"
thyrox_check "caso 12: sin marcador -> REFUSED marker-absent" "REFUSED marker-absent" "$out"

# Caso 13 — medida incompleta: rehúsa, nunca infiere.
seed_post_reboot 0 4
rm -f "$STATE/free-locks"
thyrox_check "caso 13: sin locks libres -> REFUSED measurement-incomplete" "REFUSED measurement-incomplete" "$(classify)"
seed_post_reboot 0 4
printf 'cpu 0 0 0 0\n' > "$WORK/proc-stat-nobtime"
out="$(TEST_PROC_STAT="$WORK/proc-stat-nobtime" run_recovery --classify 2>/dev/null)"
thyrox_check "caso 13: sin btime -> REFUSED measurement-incomplete" "REFUSED measurement-incomplete" "$out"
seed_post_reboot 0 4
: > "$STATE/version"
thyrox_check "caso 13: sin versión -> REFUSED measurement-incomplete" "REFUSED measurement-incomplete" "$(classify)"

# Caso 14 — balance sano: HEALTHY, sin mirar el resto de la firma.
seed_post_reboot 4 4
thyrox_check "caso 14: 4/4 -> HEALTHY" "HEALTHY" "$(classify)"
seed_post_reboot 4 4; echo boltdb > "$STATE/backend"
thyrox_check "caso 14: sano con otro backend sigue siendo HEALTHY" "HEALTHY" "$(classify)"

# Caso 15 — el veredicto es UNA línea de la gramática, y lo humano va a stderr.
seed_post_reboot 3 4
out="$(run_recovery --classify 2>/dev/null)"
thyrox_check "caso 15: una sola línea" "1" "$(printf '%s\n' "$out" | grep -c .)"
[[ "$out" =~ ^(HEALTHY|KNOWN_POST_REBOOT_RECOVERABLE|REFUSED\ [a-z-]+)$ ]] \
  && ok "caso 15: cumple la gramática" || bad "caso 15: fuera de la gramática: [$out]"

# Caso 16 — un argumento desconocido es error de uso: exit 2.
run_recovery --classify-typo >/dev/null 2>&1; rc=$?
thyrox_check "caso 16: argumento desconocido -> exit 2" "2" "$rc"

# =============================================================================
# --after-reboot — repara SÓLO la firma conocida (P0c1)
# =============================================================================

# Caso 17 — firma conocida: repara, vuelve a medir y queda HEALTHY.
seed_post_reboot 0 4
out="$(run_recovery --after-reboot 2>&1)"; rc=$?
thyrox_check "caso 17: --after-reboot sobre 0/4 -> exit 0" "0" "$rc"
thyrox_check "caso 17: los locks quedan asignados" "2044" "$(cat "$STATE/free-locks")"
thyrox_check "caso 17: después clasifica HEALTHY" "HEALTHY" "$(classify)"

# Casos 18-20 — fuera de la firma rehúsa SIN mutar: nunca cae a --confirm.
for scenario in partial:3 live:0 current-boot:0; do
  name="${scenario%%:*}"
  seed_post_reboot "${scenario#*:}" 4
  live_pid=""
  case "$name" in
    live) sleep 999 & live_pid=$!
          printf 'ctr-redis 0 running %s\nctr-ollama 1 running 999998\n' "$live_pid" > "$STATE/containers" ;;
    current-boot) touch -d "@$(( BOOT_EPOCH + 5 ))" "$LIBPOD/alive" ;;
  esac
  before="$(marker_fingerprint)"; free_before="$(cat "$STATE/free-locks")"
  run_recovery --after-reboot >/dev/null 2>&1; rc=$?
  [[ -n "$live_pid" ]] && kill "$live_pid" 2>/dev/null
  thyrox_check "caso 18-20 ($name): --after-reboot rehúsa -> exit 2" "2" "$rc"
  thyrox_check "caso 18-20 ($name): el marcador queda intacto" "$before" "$(marker_fingerprint)"
  thyrox_check "caso 18-20 ($name): los locks no cambian" "$free_before" "$(cat "$STATE/free-locks")"
done

# Caso 22 — TOCTOU: la guarda cambia DESPUÉS de la clasificación y antes de
# la mutación (segunda medida). --after-reboot tiene que revalidar sobre la
# medida que precede a la mutación y rehusar sin tocar nada.
for kind in live current-boot partial; do
  seed_post_reboot 0 4
  sleep 999 & live_pid=$!
  echo "$live_pid" > "$STATE/live-pid"
  echo 2 > "$STATE/change-at-measure"; echo "$kind" > "$STATE/change-kind"
  run_recovery --after-reboot >/dev/null 2>&1; rc=$?
  kill "$live_pid" 2>/dev/null
  thyrox_check "caso 22 ($kind tras clasificar): --after-reboot rehúsa -> exit 2" "2" "$rc"
  [[ -e "$LIBPOD/alive" && "$(cat "$LIBPOD/alive")" == previous-boot ]] \
    && ok "caso 22 ($kind tras clasificar): el marcador no se retiró" \
    || bad "caso 22 ($kind tras clasificar): se retiró el marcador tras el cambio de guarda"
done

# Caso 21 — si tras reparar la medida no queda sana: exit 3, no éxito.
seed_post_reboot 0 4
touch "$STATE/no-refresh"
run_recovery --after-reboot >/dev/null 2>&1; rc=$?
thyrox_check "caso 21: reparación que no equilibra -> exit 3" "3" "$rc"

thyrox_summary
