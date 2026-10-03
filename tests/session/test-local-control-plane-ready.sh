#!/usr/bin/env bash
# test-local-control-plane-ready.sh — contrato del composer que deja listo el
# plano de control local tras un arranque (P0c2).
#
# `src/session/local_control_plane_ready.sh` COMPONE dos autoridades y no sabe
# nada de Podman: consume el veredicto de `podman_lock_recovery --classify`,
# repara sólo con `--after-reboot`, exige HEALTHY al reclasificar y entonces
# converge con `infrastructure_ensure`. Cualquier otro veredicto cierra en
# falso. Aquí las dos autoridades son DOBLES que registran cada llamada.
#
# Qué haría fallar a esta suite:
# - converger sin reclasificar tras la reparación (caso 4);
# - converger o reparar ante REFUSED o un veredicto desconocido (casos 5-6);
# - que el composer gane conocimiento del motor: verbos de Podman, la versión,
#   el backend o la firma (caso 9).
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
SUBJECT="$ROOT/src/session/local_control_plane_ready.sh"
source "$ROOT/src/lib/assert.sh"
ok()  { thyrox_ok "$*"; }
bad() { thyrox_fail "$*" || true; }

[[ -x "$SUBJECT" ]] && ok "el sujeto existe y es ejecutable" || { bad "no existe o no es ejecutable: $SUBJECT"; thyrox_summary; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "${WORK:?}"' EXIT
CALLS="$WORK/calls.log"

# El doble de la recuperación: cada --classify consume la siguiente línea de
# `verdicts`; `after-reboot-exit` fija la salida de la reparación.
cat > "$WORK/recovery-double" <<STUB
#!/usr/bin/env bash
printf 'recovery %s\n' "\$*" >> "$CALLS"
case "\$1" in
  --classify)
    n=\$(grep -c '^recovery --classify' "$CALLS")
    sed -n "\${n}p" "$WORK/verdicts"
    exit "\$(cat "$WORK/classify-exit" 2>/dev/null || echo 0)" ;;
  --after-reboot) exit "\$(cat "$WORK/after-reboot-exit" 2>/dev/null || echo 0)" ;;
esac
exit 2
STUB
cat > "$WORK/ensure-double" <<STUB
#!/usr/bin/env bash
printf 'ensure %s\n' "\$*" >> "$CALLS"
exit "\$(cat "$WORK/ensure-exit" 2>/dev/null || echo 0)"
STUB
chmod +x "$WORK/recovery-double" "$WORK/ensure-double"

# @description Prepara un escenario: los veredictos sucesivos de --classify.
scenario() {
  rm -f "$CALLS" "$WORK/classify-exit" "$WORK/after-reboot-exit" "$WORK/ensure-exit"
  : > "$CALLS"
  printf '%s\n' "$@" > "$WORK/verdicts"
}
run_ready() {
  THYROX_CONTROL_PLANE_LOCK_RECOVERY_BIN="$WORK/recovery-double" \
  THYROX_CONTROL_PLANE_INFRA_ENSURE_BIN="$WORK/ensure-double" \
    bash "$SUBJECT" "$@"
}
calls() { paste -sd'|' "$CALLS"; }

# Caso 1 — HEALTHY: converge directamente.
scenario HEALTHY
run_ready >/dev/null 2>&1; rc=$?
thyrox_check "caso 1: HEALTHY -> exit 0" "0" "$rc"
thyrox_check "caso 1: clasifica y converge" "recovery --classify|ensure " "$(calls)"

# Caso 2 — la firma post-reboot: repara, reclasifica, y converge si es HEALTHY.
scenario KNOWN_POST_REBOOT_RECOVERABLE HEALTHY
run_ready >/dev/null 2>&1; rc=$?
thyrox_check "caso 2: firma conocida -> exit 0" "0" "$rc"
thyrox_check "caso 2: classify, after-reboot, classify, ensure" \
  "recovery --classify|recovery --after-reboot|recovery --classify|ensure " "$(calls)"

# Caso 3 — la reparación falla: no converge y propaga su salida.
scenario KNOWN_POST_REBOOT_RECOVERABLE HEALTHY
echo 3 > "$WORK/after-reboot-exit"
run_ready >/dev/null 2>&1; rc=$?
thyrox_check "caso 3: after-reboot sale 3 -> exit 3" "3" "$rc"
thyrox_check "caso 3: no converge" "recovery --classify|recovery --after-reboot" "$(calls)"

# Caso 4 — reparó, pero la reclasificación no es HEALTHY: cierra en falso.
scenario KNOWN_POST_REBOOT_RECOVERABLE "REFUSED partial-allocation"
err="$(run_ready 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 4: reclasificación no sana -> exit 2" "2" "$rc"
thyrox_check "caso 4: no converge" "recovery --classify|recovery --after-reboot|recovery --classify" "$(calls)"
[[ "$err" == *"partial-allocation"* ]] && ok "caso 4: nombra el veredicto" || bad "caso 4: no nombra el veredicto: [$err]"

# Caso 5 — REFUSED: ni repara ni converge.
scenario "REFUSED live-containers"
err="$(run_ready 2>&1 >/dev/null)"; rc=$?
thyrox_check "caso 5: REFUSED -> exit 2" "2" "$rc"
thyrox_check "caso 5: sólo clasifica" "recovery --classify" "$(calls)"
[[ "$err" == *"live-containers"* ]] && ok "caso 5: nombra la razón" || bad "caso 5: no nombra la razón: [$err]"

# Caso 6 — un veredicto fuera del contrato, vacío, o una clasificación que
# falla: cierra en falso sin interpretar.
for verdict in "healthy" "" "HEALTHY extra" "KNOWN_POST_REBOOT_RECOVERABLE?"; do
  scenario "$verdict"
  run_ready >/dev/null 2>&1; rc=$?
  thyrox_check "caso 6: veredicto [$verdict] -> exit 2" "2" "$rc"
  thyrox_check "caso 6: veredicto [$verdict] no repara ni converge" "recovery --classify" "$(calls)"
done
scenario HEALTHY
echo 2 > "$WORK/classify-exit"
run_ready >/dev/null 2>&1; rc=$?
thyrox_check "caso 6: --classify sale 2 -> exit 2" "2" "$rc"
thyrox_check "caso 6: --classify sale 2 -> no converge" "recovery --classify" "$(calls)"

# Caso 7 — la convergencia falla: su salida es la del composer.
scenario HEALTHY
echo 1 > "$WORK/ensure-exit"
run_ready >/dev/null 2>&1; rc=$?
thyrox_check "caso 7: ensure sale 1 -> exit 1" "1" "$rc"

# Caso 8 — los argumentos son la selección de infrastructure_ensure.
scenario HEALTHY
run_ready thyrox-redis thyrox-ollama >/dev/null 2>&1
thyrox_check "caso 8: pasa la selección al ensure" "recovery --classify|ensure thyrox-redis thyrox-ollama" "$(calls)"

# Caso 9 — el composer no sabe nada del motor: ni verbos de Podman, ni la
# versión, el backend o la firma. Se mide sobre el código, sin comentarios.
code="$(grep -vE '^[[:space:]]*#' "$SUBJECT")"
for forbidden in 'podman ' '"$PODMAN"' '4\.9' 'sqlite' 'btime' 'mtime' 'alive' 'renumber' 'FreeLocks'; do
  if grep -qiE -- "$forbidden" <<< "$code"; then
    bad "caso 9: el código del composer menciona [$forbidden]"
  else
    ok "caso 9: el código del composer no menciona [$forbidden]"
  fi
done

thyrox_summary
