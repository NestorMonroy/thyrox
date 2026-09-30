#!/usr/bin/env bash
# Mide la recuperacion de un contenedor de Podman en una maquina sin systemd.
# Un caso por invocacion; imprime «caso<TAB>clave=valor ...».
# Escenario A: el proceso del contenedor falla con la maquina viva.
# Escenario B: desaparece todo el arbol de procesos (equivalente a reiniciar la
# microVM: conmon y el proceso del contenedor mueren sin aviso).
set -uo pipefail
case_name="$1"
image="${RECOVERY_IMAGE:?falta RECOVERY_IMAGE}"
state_dir="${RECOVERY_STATE_DIR:?falta RECOVERY_STATE_DIR}"
name="recovery-$case_name-$$"
cleanup() { podman rm -f "$name" >/dev/null 2>&1; }
trap cleanup EXIT

field() { podman inspect "$name" --format "$1" 2>/dev/null; }
report() { printf '%s\t%s\n' "$case_name" "$*"; }

run_serving() {  # $@: opciones extra de podman run
  podman run -d --name "$name" --network none -v "$state_dir:/state" "$@" \
    "$image" /helper serve >/dev/null
}

case "$case_name" in
  restart-always-kill|restart-on-failure-kill|restart-no-kill)
    policy="${case_name#restart-}"; policy="${policy%-kill}"
    run_serving --restart="$policy"
    pid="$(field '{{.State.Pid}}')"
    kill -9 "$pid"
    sleep 6
    report "policy=$policy running=$(field '{{.State.Running}}') restarts=$(field '{{.RestartCount}}') pid_changed=$([ "$(field '{{.State.Pid}}')" != "$pid" ] && echo yes || echo no)"
    ;;
  health-runs-alone)
    touch "$state_dir/ok"
    run_serving --health-cmd '["/helper","check","/state/ok"]' --health-interval 2s
    sleep 10
    alone="$(field '{{len .State.Health.Log}}')"
    podman healthcheck run "$name" >/dev/null 2>&1; manual_rc=$?
    report "log_after_10s=$alone status=$(field '{{.State.Health.Status}}') manual_rc=$manual_rc log_after_manual=$(field '{{len .State.Health.Log}}')"
    ;;
  health-on-failure-restart)
    rm -f "$state_dir/ok"
    run_serving --health-cmd '["/helper","check","/state/ok"]' --health-interval 2s \
      --health-retries 1 --health-on-failure=restart
    sleep 10
    alone="$(field '{{.RestartCount}}')"
    podman healthcheck run "$name" >/dev/null 2>&1; manual_rc=$?
    sleep 3
    report "restarts_after_10s=$alone manual_rc=$manual_rc restarts_after_manual=$(field '{{.RestartCount}}') status=$(field '{{.State.Health.Status}}')"
    ;;
  whole-tree-dies)
    touch "$state_dir/persisted"
    run_serving --restart=always
    pid="$(field '{{.State.Pid}}')"
    conmon="$(field '{{.State.ConmonPid}}')"
    kill -9 "$conmon" "$pid"
    sleep 6
    # Sin conmon nadie le avisa a Podman: `inspect` sigue diciendo lo ultimo que
    # supo. `ps --sync` consulta el runtime y corrige la base de datos.
    stale_state="$(field '{{.State.Status}}')"
    synced_state="$(podman ps -a --sync --filter "name=^${name}\$" --format '{{.State}}' 2>/dev/null)"
    old_alive="$(kill -0 "$pid" 2>/dev/null && echo yes || echo no)"
    podman start "$name" >/dev/null 2>&1; start_rc=$?
    new_pid="$(field '{{.State.Pid}}')"
    new_alive="$( [ -n "$new_pid" ] && [ "$new_pid" != 0 ] && kill -0 "$new_pid" 2>/dev/null && echo yes || echo no)"
    report "defined_after=$([ -n "$stale_state" ] && echo yes || echo no) stale_state=${stale_state:-none} synced_state=${synced_state:-none} old_pid_alive=$old_alive restarts=$(field '{{.RestartCount}}') volume_file_kept=$([ -e "$state_dir/persisted" ] && echo yes || echo no) podman_start_rc=$start_rc new_pid_alive=$new_alive new_pid_differs=$([ "$new_pid" != "$pid" ] && echo yes || echo no)"
    ;;
  whole-tree-dies-recover)
    # Tras morir el arbol, `podman start` no hace nada (el estado dice running).
    # Se mide que orden devuelve un proceso vivo, de la menos a la mas invasiva.
    run_serving --restart=always
    pid="$(field '{{.State.Pid}}')"; conmon="$(field '{{.State.ConmonPid}}')"
    kill -9 "$conmon" "$pid"; sleep 3
    alive_pid() { local p; p="$(field '{{.State.Pid}}')"; [ -n "$p" ] && [ "$p" != 0 ] && [ "$p" != "$pid" ] && kill -0 "$p" 2>/dev/null; }
    podman stop -t 0 "$name" >/dev/null 2>&1; stop_rc=$?
    podman start "$name" >/dev/null 2>&1; start_rc=$?
    after_stop_start="$(alive_pid && echo yes || echo no)"
    recreate="skipped"
    if [ "$after_stop_start" = no ]; then
      podman rm -f "$name" >/dev/null 2>&1
      run_serving --restart=always && recreate="$( [ "$(field '{{.State.Running}}')" = true ] && echo yes || echo no)"
    fi
    report "stop_rc=$stop_rc start_rc=$start_rc alive_after_stop_start=$after_stop_start alive_after_recreate=$recreate"
    ;;
  host)
    report "pid1=$(cat /proc/1/comm) systemd=$(systemctl is-system-running 2>&1 | head -1) cgroups=$(podman info --format '{{.Host.CgroupsVersion}}') podman=$(podman info --format '{{.Version.Version}}') restart_unit=$(ls /usr/lib/systemd/system/podman-restart.service 2>/dev/null && echo present || echo absent)"
    ;;
  *) echo "caso desconocido: $case_name" >&2; exit 2 ;;
esac
