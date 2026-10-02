#!/bin/sh
# Identidad de un payload gestionado vista DESDE DENTRO, escrita antes de que
# corra: el cgroup del proceso, el contenedor que ese cgroup nombra y el pid. Es
# la mitad del payload de ManagedExecutionContainmentGate
# (src/verify/managed_execution_containment.py); la otra la escribe el primitivo
# con `run --attest`. Corrido en el anfitrión, el cgroup no nombra un contenedor
# y la fila dice inUnit=false: el gate lo rechaza.
#
# POSIX sh y sólo órdenes internas del shell más /proc: la atestación no puede
# depender de las herramientas de la imagen invitada que se está probando (una
# imagen de PostgreSQL no trae gawk ni jq). La primitiva monta el repositorio,
# así que este guion llega a cualquier unidad.
#
# Uso: unit_attest.sh <archivo.jsonl> <tarea> <paso> -- <payload...>
set -eu
out="${1:?archivo}" task="${2:?tarea}" step="${3:?paso}"
shift 3
[ "${1:-}" = "--" ] || { echo "unit_attest: falta -- antes del payload" >&2; exit 2; }
shift
[ $# -gt 0 ] || { echo "unit_attest: falta el payload" >&2; exit 2; }

# Escapa una cadena para un valor JSON: barra invertida y comillas dobles.
json_escape() {
  rest="$1" escaped=""
  while [ -n "$rest" ]; do
    char="${rest%"${rest#?}"}"
    rest="${rest#?}"
    case "$char" in
      '\' | '"') escaped="$escaped\\$char" ;;
      *) escaped="$escaped$char" ;;
    esac
  done
  printf '%s' "$escaped"
}

# cgroup v2 (`0::<ruta>`) o, en v1, el controlador pids.
cgroup=""
while IFS=: read -r hierarchy controllers path; do
  if [ "$hierarchy" = "0" ] || [ "$controllers" = "pids" ]; then cgroup="$path"; break; fi
done < /proc/self/cgroup

container=""
case "$cgroup" in
  *libpod-*)
    candidate="${cgroup#*libpod-}"
    candidate="${candidate%%.scope*}"
    candidate="${candidate%%/*}"
    case "$candidate" in
      *[!0-9a-f]*) ;;
      *) [ "${#candidate}" -eq 64 ] && container="$candidate" ;;
    esac
    ;;
esac

in_unit=false
if [ -n "$container" ] && [ -e /run/.containerenv ]; then in_unit=true; fi
utc="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || printf unknown)"
case "$out" in */*) mkdir -p "${out%/*}" ;; esac
printf '{"task":"%s","step":"%s","payload":"%s","containerId":"%s","cgroup":"%s","pid":%s,"inUnit":%s,"utc":"%s"}\n' \
  "$(json_escape "$task")" "$(json_escape "$step")" "$(json_escape "$1")" "$container" \
  "$(json_escape "$cgroup")" "$$" "$in_unit" "$utc" >> "$out"
exec "$@"
