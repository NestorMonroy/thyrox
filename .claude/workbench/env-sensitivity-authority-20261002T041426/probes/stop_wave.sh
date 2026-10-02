#!/usr/bin/env bash
# Detiene una ejecución del controlador de continuación de forma comprobada y
# conserva su evidencia. `thyrox-bg` no tiene orden de parada y `wait-jobs forget`
# sólo retira el registro del ledger: ninguno termina procesos. Por eso cada paso
# se ejecuta y se mide aquí:
#   1. el controlador (su sesión entera) recibe TERM, y KILL tras la gracia;
#   2. el cliente de cada unidad (dueño registrado del contenedor) igual;
#   3. con el dueño muerto, la primitiva retira la unidad (`reconcile-orphans`:
#      stop con gracia y rm); sólo se invoca si los únicos huérfanos de tarea
#      son los de esta ejecución;
#   4. se comprueba que no queda proceso, contenedor ni escritor vivo.
# Uso: stop_wave.sh <banco> <job thyrox-bg> <sid del controlador> <sid de unidad>...
# Sale 0 sólo si los cuatro pasos se comprobaron; 1 si algo sigue vivo.
set -uo pipefail
workbench="$1" job="$2" controller_sid="$3"; shift 3
unit_sids=("$@")
grace_seconds="${STOP_GRACE_SECONDS:-20}"
root="$(git -C "$workbench" rev-parse --show-toplevel)"
cd "$root" || exit 1
stamp() { date -u +%Y-%m-%dT%H:%M:%S; }
members_of() { ps -eo pid=,sid= | gawk -v sid="$1" '$2 == sid { print $1 }'; }
terminate_session() {
  local sid="$1" waited=0 pids
  mapfile -t pids < <(members_of "$sid")
  [[ "${#pids[@]}" -gt 0 ]] || { echo "$(stamp) sesión $sid: ya vacía"; return 0; }
  echo "$(stamp) sesión $sid: TERM a ${pids[*]}"
  kill -TERM "${pids[@]}" 2>/dev/null
  while (( waited < grace_seconds )) && [[ -n "$(members_of "$sid")" ]]; do sleep 1; waited=$((waited + 1)); done
  mapfile -t pids < <(members_of "$sid")
  if [[ "${#pids[@]}" -gt 0 ]]; then
    echo "$(stamp) sesión $sid: KILL a ${pids[*]} tras ${grace_seconds}s"
    kill -KILL "${pids[@]}" 2>/dev/null; sleep 1
  fi
  [[ -z "$(members_of "$sid")" ]] && echo "$(stamp) sesión $sid: vacía" || { echo "$(stamp) sesión $sid: SIGUE VIVA"; return 1; }
}
task_units() {
  bash bin/podman-execution-execute observe containers \
    | jq -r '.[] | select(.labels["thyrox.owner-kind"] == "task") | [.name, .labels["thyrox.owner-pid"]] | @tsv'
}
rc=0
echo "$(stamp) antes:"; ps -eo pid,ppid,sid,etime,args | gawk -v c="$controller_sid" -v u=" ${unit_sids[*]} " \
  'NR == 1 || $3 == c || index(u, " " $3 " ")' | cut -c1-200
terminate_session "$controller_sid" || rc=1
for sid in "${unit_sids[@]}"; do terminate_session "$sid" || rc=1; done
echo "$(stamp) unidades de tarea antes de reconciliar:"; task_units
live_owner=0
while IFS=$'\t' read -r name pid; do
  [[ -n "$name" ]] || continue
  if kill -0 "$pid" 2>/dev/null; then echo "$(stamp) $name: dueño $pid VIVO, no se retira"; live_owner=1; fi
done < <(task_units)
(( live_owner == 0 )) || rc=1
bash bin/podman-execution-execute reconcile-orphans || rc=1
remaining="$(task_units)"
[[ -z "$remaining" ]] && echo "$(stamp) sin unidades de tarea" || { echo "$(stamp) quedan unidades: $remaining"; rc=1; }
echo "$(stamp) estado del trabajo: $(bash bin/thyrox-bg status "$job")"
# El registro de este guion lo escribe el propio guion: medirlo daría un escritor
# vivo falso. Se excluye por la ruta que declara STOP_LOG.
mapfile -t evidence < <(find "$workbench/outputs" .claude/jobs/cont-s1-* .claude/jobs/cont-secret-gate-* .claude/jobs/"$job"-* -type f 2>/dev/null \
  | gawk -v own="${STOP_LOG:-}" 'own == "" || index($0, own) == 0')
if bash bin/writer_inspector "${evidence[@]}"; then echo "$(stamp) 0 escritores vivos sobre ${#evidence[@]} archivo(s) de evidencia"
else echo "$(stamp) hay escritores vivos sobre la evidencia"; rc=1; fi
echo "$(stamp) exit=$rc"
exit "$rc"
