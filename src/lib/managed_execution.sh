#!/usr/bin/env bash
# =============================================================================
# managed_execution.sh — el paso de un orquestador a la primitiva de ejecución
# (ADR-THYROX-007 Regla 4, enmienda 1.16.0)
# =============================================================================
#
# Biblioteca para `source`. Un orquestador (thyrox-bg, run-task-pool,
# headless-pool, parallel_map) coordina CUÁNDO corre un trabajo y lo observa;
# DÓNDE corre lo decide la primitiva: el payload gestionado se entrega como
# argv al runner de `@thyrox/podman-execution`, que lo materializa en un
# contenedor de ejecución. El anfitrión sólo supervisa al runner.
#
# Lo único que un orquestador lanza directamente en el anfitrión es una entrada
# declarada del plano de control (`src/session/control_plane_entries.tsv`): un
# envoltorio de `bin/` cuyo `exec` apunta al módulo declarado. Se decide por el
# módulo, no por el nombre: un envoltorio con ese nombre que ejecute otra cosa
# no es la entrada.
#
# `THYROX_MANAGED_EXECUTION_RUNNER` sólo declara un doble que habla el contrato
# del runner (`run --task … --kind … -- <argv>`), como `HEADLESS_POOL_RUNNER`.
# `THYROX_CONTROL_PLANE_ENTRIES` sólo reemplaza la lista en las suites.
# =============================================================================

if type thyrox_managed_execution_runner_argv &>/dev/null; then return 0 2>/dev/null || true; fi

_MANAGED_EXECUTION_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly _MANAGED_EXECUTION_RUNNER_SOURCE="src/packages/podman-execution/bin/execute.ts"

# Identidad de la entrada: el payload de la unidad la escribe como campo `entry`
# en cada línea del manifiesto (`probes/unit_identity.sh`). La hereda del
# anfitrión porque el orquestador la pide como `--env` al runner (bg.sh), y sólo
# así llega a la unidad. Una unidad materializada sin ella —la deuda de
# arranque, `bin/podman-execution-execute`— se declara `bootstrap-cli`. Un
# orquestador que materialice con otro nombre lo deja puesto antes de cargar
# esta biblioteca.
export THYROX_EXECUTION_ENTRY="${THYROX_EXECUTION_ENTRY:-thyrox-bg}"

# @description El argv del runner de la primitiva, un elemento por línea.
# @stdout el argv.
thyrox_managed_execution_runner_argv() {
  if [[ -n "${THYROX_MANAGED_EXECUTION_RUNNER:-}" ]]; then
    printf '%s\n' "$THYROX_MANAGED_EXECUTION_RUNNER"
    return
  fi
  printf '%s\n' "${THYROX_TOOLCHAIN_BUN_BIN:-bun}" "$_MANAGED_EXECUTION_ROOT/$_MANAGED_EXECUTION_RUNNER_SOURCE"
}

# @description ¿Es la ruta una entrada declarada del plano de control? Lo es si
# su nombre está en la lista y su línea `exec` nombra el módulo declarado.
# @arg $1 string ruta o nombre del comando.
# @exitcode 0 es una entrada declarada.
# @exitcode 1 no lo es.
thyrox_control_plane_entry() {
  local candidate="${1:-}" entries name module
  entries="${THYROX_CONTROL_PLANE_ENTRIES:-$_MANAGED_EXECUTION_ROOT/src/session/control_plane_entries.tsv}"
  [[ -f "$candidate" ]] || candidate="$(command -v -- "$candidate" 2>/dev/null)" || return 1
  [[ -f "$candidate" && -f "$entries" ]] || return 1
  name="$(basename -- "$candidate")"
  module="$(gawk -F'\t' -v wanted="$name" '!/^#/ && $1 == wanted { print $2; exit }' "$entries")"
  [[ -n "$module" ]] || return 1
  grep -E '^[[:space:]]*exec[[:space:]]' "$candidate" | grep -qF -- "$module"
}
