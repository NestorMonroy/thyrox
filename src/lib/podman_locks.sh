#!/usr/bin/env bash
# =============================================================================
# podman_locks.sh — medida del balance de locks de Podman y diagnóstico de
# `podman system renumber` (H-THYROX-302, H-THYROX-308)
# =============================================================================
#
# Biblioteca para `source`: no fija opciones de shell. La consumen dos piezas
# que tienen que medir lo mismo:
#
# - `infrastructure_ensure`, que DETECTA el desfase, intenta el mecanismo
#   soportado (`podman system renumber`) y rehúsa con el diagnóstico real;
# - `podman_lock_recovery`, el procedimiento explícito que un operador corre
#   cuando renumber no basta.
#
# La reparación de internals de Podman no vive aquí ni en el ensure: es una
# operación explícita del operador.
#
# Podman se resuelve de `THYROX_TOOLCHAIN_PODMAN_BIN` (default `podman`).
# =============================================================================

if type thyrox_podman_lock_balance &>/dev/null; then return 0 2>/dev/null || true; fi

# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/infrastructure.sh"

# Las dos partes del stderr con que `podman system renumber` falla en Podman
# 4.9.3 sobre backend sqlite: la reescritura de la configuración de un volumen
# usa una columna `ID` que la tabla de volúmenes no tiene. Renumber asigna los
# locks de los contenedores y se detiene en el primer volumen.
readonly _PODMAN_SQLITE_VOLUME_RENUMBER_STAGE="updating volume config table"
readonly _PODMAN_SQLITE_VOLUME_RENUMBER_CAUSE="no such column: ID"

_podman_locks_bin() { echo "${THYROX_TOOLCHAIN_PODMAN_BIN:-podman}"; }

# @description Total de locks del motor: `num_locks` de containers.conf, o el
# default de Podman (2048) si ningún archivo lo declara. `podman info` sólo
# publica los libres. THYROX_INFRA_PODMAN_NUM_LOCKS lo fija en las suites.
# @stdout el total.
thyrox_podman_num_locks() {
  local declared conf
  declared="$(thyrox_infrastructure_setting THYROX_INFRA_PODMAN_NUM_LOCKS '')"
  if [[ -n "$declared" ]]; then
    echo "$declared"
    return
  fi
  for conf in /etc/containers/containers.conf /usr/share/containers/containers.conf; do
    [[ -f "$conf" ]] || continue
    declared="$(sed -n 's/^[[:space:]]*num_locks[[:space:]]*=[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$conf" | tail -1)"
    [[ -n "$declared" ]] && { echo "$declared"; return; }
  done
  echo 2048
}
export -f thyrox_podman_num_locks

# @description Locks asignados y números de lock DISTINTOS que la base
# referencia, separados por espacio. Se cuentan números y no objetos: en
# Podman 4.9.3 los volúmenes comparten números entre sí y con los
# contenedores. Sin medida de locks libres no imprime nada: un desfase no se
# infiere de una medida ausente.
# @stdout `<asignados> <referenciados>`
# @exitcode 1 Podman no publica los locks libres.
thyrox_podman_lock_balance() {
  local podman free referenced
  podman="$(_podman_locks_bin)"
  free="$("$podman" info --format '{{.Host.FreeLocks}}' 2>/dev/null)"
  [[ "$free" =~ ^[0-9]+$ ]] || return 1
  local -a containers
  mapfile -t containers < <("$podman" ps -a --format '{{.Names}}' 2>/dev/null)
  referenced="$( {
    [[ "${#containers[@]}" -gt 0 ]] && "$podman" container inspect --format '{{.LockNumber}}' "${containers[@]}" 2>/dev/null
    "$podman" pod inspect --all --format '{{.LockNumber}}' 2>/dev/null
    "$podman" volume inspect --all --format '{{.LockNumber}}' 2>/dev/null
  } | grep -E '^[0-9]+$' | sort -u | wc -l )"
  echo "$(( $(thyrox_podman_num_locks) - free )) $referenced"
}
export -f thyrox_podman_lock_balance

# @description Contenedores con proceso vivo: los que la base reporta
# `running` y cuyo PID existe. Uno solo basta para que renumerar o recuperar
# no sea seguro.
# @stdout un nombre por línea.
thyrox_podman_live_containers() {
  local podman name inspect_out pid
  podman="$(_podman_locks_bin)"
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    inspect_out="$("$podman" inspect --format '{{.State.Status}}\t{{.State.Pid}}' "$name" 2>/dev/null)" || continue
    pid="${inspect_out##*$'\t'}"
    [[ "${inspect_out%%$'\t'*}" == running && "$pid" != 0 ]] && kill -0 "$pid" 2>/dev/null && echo "$name"
  done < <("$podman" ps -a --format '{{.Names}}' 2>/dev/null)
}
export -f thyrox_podman_live_containers

# @description ¿El stderr de `podman system renumber` es el defecto conocido
# de Podman 4.9.3 sobre backend sqlite? Exige las dos partes del mensaje: un
# fallo cualquiera de renumber no se atribuye a este defecto.
# @arg $1 string stderr de renumber.
# @exitcode 0 es el defecto conocido.
# @exitcode 1 no lo es.
thyrox_podman_is_sqlite_volume_renumber_defect() {
  [[ "${1:-}" == *"$_PODMAN_SQLITE_VOLUME_RENUMBER_STAGE"* && "${1:-}" == *"$_PODMAN_SQLITE_VOLUME_RENUMBER_CAUSE"* ]]
}
export -f thyrox_podman_is_sqlite_volume_renumber_defect
