#!/bin/bash
# DEPRECATED: 2026-08-24 — omite la columna `Capa` y sólo ve una sesión
# SUCESOR: el hook stop-gate-tablero-desactualizado.sh — refrescar-tablero.sh quedó DEPRECATED (H-DOCS-1042)
# HALLAZGO: H-DOCS-405
# =============================================================================
# snapshot-tasks.sh — volcar el task-store nativo de Claude Code a un
# artefacto RST git-tracked, ANTES de que el contenedor lo pierda
# =============================================================================
#
# Por qué existe
# --------------
# El board que TaskCreate/TaskList/TaskGet/TaskUpdate usan (Team = TaskList,
# 1:1) persiste en disco — pero en el disco EFÍMERO del contenedor, no en
# ningún repo:
#
#   ~/.claude/tasks/<team_name>/<id>.json   (un archivo por tarea)
#   ~/.claude/tasks/<team_name>/.lock       (lock advisorio, 0 bytes)
#
# Cuando no se llamó a TeamCreate, <team_name> es el UUID de la sesión —
# verificado en este contenedor: el directorio se llama exactamente el mismo
# UUID que aparece en la ruta del scratchpad de la sesión (system prompt).
#
# La sección "Entorno" del system prompt ya lo advierte para el resto del
# árbol: *"the container is reclaimed after a period of inactivity...
# anything worth keeping needs to be committed and pushed first"*. El task
# board no es una excepción — es JSON suelto en `~/.claude/`, fuera de
# cualquier working tree. Si el contenedor se recicla, desaparece con él.
#
# Qué hace este script, y qué NO hace
# -------------------------------------
#   (a) leer <team_name>/*.json y volcarlos a una tabla RST     → SÍ
#   (b) resolver el team_name con la prioridad del binario      → SÍ
#   (c) escribir en el registro canónico SIN pedir argumentos   → SÍ
#   (d) auto-ejecutarse en cada cierre de turno (hook Stop)     → NO — no
#       cableado; ver DESCONOCIDO al final de este comentario
#
# El destino por defecto es el registro, no stdout
# --------------------------------------------------
# Hasta 2026-08-13 `OUT="${2:-}"` hacía que una invocación sin argumentos
# imprimiera a stdout y **no escribiera nada**. Para refrescar el registro
# había que acordarse de DOS posicionales — y del truco de pasar `""` como
# primero:
#
#     bash .claude/scripts/task/snapshot-tasks.sh "" source/gestion/pm/reportes/…
#
# Medido en la sesión del 2026-08-13: la primera corrida no escribió el
# archivo y el registro quedó parado en #282 mientras el board iba por #296.
# El guion salía **0**: un fallo silencioso, la misma forma que H-DOCS-100
# registró para los tres guiones con fallback silencioso.
#
# Ahora el destino por defecto es el registro versionado y `--stdout` pide
# explícitamente el comportamiento viejo. Ver :ref:`h-docs-137`.
#
# Qué se leyó del binario para esto (rango 1: el código que corre)
# -----------------------------------------------------------------
# `/opt/node22/lib/node_modules/@anthropic-ai/claude-code/cli.js`
# (`@anthropic-ai/claude-code@2.1.42`, 11 495 956 B):
#
#   • `${O8()}/tasks/${q.teamContext.teamName}/` — la ruta del store.
#   • `CLAUDE_CODE_TASK_LIST_ID` (2 hits) y `CLAUDE_CODE_TEAM_NAME` (1) —
#     las dos variables que fijan qué lista se usa. Por eso la resolución
#     de abajo las honra ANTES que la heurística de mtime: adivinar por
#     fecha de modificación cuando el entorno lo declara es medir mal.
#   • `.highwatermark` (1 hit) y `highWaterMark` (15) — el archivo que
#     guarda el mayor id jamás usado, para que un id borrado no se reutilice.
#
# La (c) sigue el mismo criterio que ya fijó `bg.sh` para su propio
# DESCONOCIDO: cablear sin evidencia de que hace falta es mecanizar de más.
# Documentado en
# `docs: …/evaluar-agent-sdk-orquestacion/analisis-task-store-binario-claude-code.rst`.
#
# DESCONOCIDO con condición de cierre: si en sesiones futuras se pierde un
# task board por reciclado del contenedor sin snapshot previo — medible
# porque `~/.claude/tasks/<team>/` existía en un summary post-compactación
# y ya no existe al reanudar—, el paso siguiente es cablear este script a
# un hook `Stop` no-bloqueante (mismo slot que `stop-gate-*.sh`). Hasta
# entonces, es una herramienta disponible bajo demanda, no un gate.
#
# =============================================================================

set -euo pipefail

# Desactivado, no retirado: se conserva como evidencia y como reserva
# declarada. El guard avisa siempre y rehúsa salvo que el llamador declare
# `ACCEPT_DEPRECATED=snapshot-tasks.sh` — hoy sólo lo hace el hook del
# tablero, en la rama que corre cuando el renderizador canónico no pudo.
source "$(dirname "${BASH_SOURCE[0]}")/../deprecated.sh"
deprecated_guard snapshot-tasks.sh

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"
TASKS_ROOT="$CLAUDE_HOME/tasks"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REGISTRO_CANONICO="$REPO_ROOT/source/gestion/pm/reportes/tablero-de-tareas.rst"

usage() {
  cat <<'EOF'
Uso: snapshot-tasks.sh [-t team_name] [-o archivo.rst | --stdout] [team] [salida]

  Sin argumentos escribe el REGISTRO CANÓNICO del proyecto:
      source/gestion/pm/reportes/tablero-de-tareas.rst

  -t, --team NOMBRE  Task-list a volcar. Sin esto se resuelve con la misma
                     prioridad que el binario declara:
                        1. $CLAUDE_CODE_TASK_LIST_ID
                        2. $CLAUDE_CODE_TEAM_NAME
                        3. el directorio más reciente de ~/.claude/tasks/
  -o, --out RUTA     Escribir en RUTA en vez del registro canónico.
      --stdout       Imprimir a stdout sin escribir ningún archivo.
  -h, --help         Esta ayuda.

  Los dos posicionales viejos ([team] [salida]) siguen funcionando.

Ejemplos:
  snapshot-tasks.sh                          # refresca el registro del repo
  snapshot-tasks.sh --stdout | head -40      # inspección sin escribir
  snapshot-tasks.sh -t otro-team -o /tmp/t.rst
EOF
}

TEAM_NAME=""
OUT=""
A_STDOUT=0
POSICIONALES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)   usage; exit 0 ;;
    -t|--team)   TEAM_NAME="${2:-}"; shift 2 ;;
    -o|--out)    OUT="${2:-}";       shift 2 ;;
    --stdout)    A_STDOUT=1;         shift ;;
    -*)          echo "snapshot-tasks.sh: opción desconocida: $1" >&2; usage >&2; exit 2 ;;
    *)           POSICIONALES+=("$1"); shift ;;
  esac
done

# Retrocompatibilidad con `snapshot-tasks.sh [team] [salida]`. Un primer
# posicional vacío ("") era el truco para llegar al segundo — se sigue
# aceptando, pero ya no hace falta.
[[ -z "$TEAM_NAME" && -n "${POSICIONALES[0]:-}" ]] && TEAM_NAME="${POSICIONALES[0]}"
[[ -z "$OUT"       && -n "${POSICIONALES[1]:-}" ]] && OUT="${POSICIONALES[1]}"

if [[ ! -d "$TASKS_ROOT" ]]; then
  echo "snapshot-tasks.sh: no existe $TASKS_ROOT — ningún task-list en este entorno" >&2
  exit 1
fi

# Prioridad de resolución del task-list — leída del binario, no inventada.
# `cli.js` consulta CLAUDE_CODE_TASK_LIST_ID y CLAUDE_CODE_TEAM_NAME; el
# mtime es sólo el último recurso, y es una heurística: con dos sesiones
# vivas elige la que escribió al final, que no tiene por qué ser ésta.
if [[ -z "$TEAM_NAME" ]]; then
  TEAM_NAME="${CLAUDE_CODE_TASK_LIST_ID:-}"
fi
if [[ -z "$TEAM_NAME" ]]; then
  TEAM_NAME="${CLAUDE_CODE_TEAM_NAME:-}"
fi
if [[ -z "$TEAM_NAME" ]]; then
  TEAM_NAME=$(find "$TASKS_ROOT" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' \
    | sort -rn | head -1 | cut -d' ' -f2-)
  ORIGEN_TEAM="mtime (heurística)"
else
  ORIGEN_TEAM="declarado"
fi

TEAM_DIR="$TASKS_ROOT/$TEAM_NAME"
if [[ ! -d "$TEAM_DIR" ]]; then
  echo "snapshot-tasks.sh: no existe $TEAM_DIR" >&2
  exit 1
fi

if [[ "$A_STDOUT" -eq 1 ]]; then
  OUT=""
elif [[ -z "$OUT" ]]; then
  OUT="$REGISTRO_CANONICO"
fi

# --- Detector de subject corrupto -------------------------------------------
# El saneo de `celda` (abajo) REPARA en silencio: colapsa los saltos de línea
# y escapa el markup, así que un `subject` que traiga el payload entero de la
# llamada saldría como una fila larguísima pero VÁLIDA, y nadie lo notaría.
# Reparar en silencio es peor que fallar: el defecto se vuelve invisible.
#
# Este detector separa las dos funciones — `celda` repara para que la tabla no
# aborte, esto AVISA para que la anomalía se pueda medir. Es lo que #261 pedía
# como "qué medir si reaparece": sin él, la próxima corrupción se descubre
# leyendo el RST a ojo, que es como se descubrió la de 169/170.
#
# La firma es la de aquella corrupción: fragmentos de la sintaxis de invocación
# de herramienta filtrados al campo, o un salto de línea en un `subject` (que
# es de una sola línea por construcción).
detectar_corruptos() {
  local sospechosos
  sospechosos=$(find "$TEAM_DIR" -maxdepth 1 -name '*.json' -print0 \
    | xargs -0 jq -r '
        select((.subject // "") | test("</?(subject|parameter|description|activeForm)\\b|<parameter name=|\n"))
        | .id' 2>/dev/null | sort -n | tr '\n' ' ')
  if [[ -n "${sospechosos// /}" ]]; then
    echo "snapshot-tasks.sh: AVISO — subject con firma de payload filtrado en: ${sospechosos}" >&2
    echo "snapshot-tasks.sh: la tabla se genera igual (celda lo sanea), pero el registro de origen está corrupto." >&2
  fi
}

# --- Firma de estados -------------------------------------------------------
# H-DOCS-172: el conteo de archivos ("Tareas en el store") es ciego a un
# cambio de `status` sobre una tarea YA existente — el número de archivos no
# se mueve. Medido: la tarea #80 pasó de `in_progress` a `completed` en el
# store real y el registro siguió declarando `in_progress`, porque nada
# comparaba el `status` — sólo el conteo (`stop-gate-tablero-desactualizado.sh`).
#
# La firma es un hash de TODOS los pares id:status del store, así que
# cualquier drift (alta, baja, cambio de estado o RE-DEFINICION del texto)
# cambia el hash. El texto entra desde H-DOCS-183: sin el, re-enunciar una
# tarea sin moverle el estado era invisible al disparo. Sustituye
# al umbral de conteo (`UMBRAL_DRIFT_TABLERO`) como condición de disparo del
# hook — un cambio de estado por sí solo nunca movía ese umbral.
firma_estados() {
  local team_dir="$1"
  find "$team_dir" -maxdepth 1 -name '*.json' -printf '%f\n' \
    | sed 's/\.json$//' \
    | sort -n \
    | while read -r id; do
        jq -r --arg id "$id" '$id + ":" + (.status // "—") + ":" + ((.subject // "") + "\u0000" + (.description // "") | @base64)' "$team_dir/$id.json"
      done \
    | sha256sum | cut -d' ' -f1
}

render() {
  local now title
  now=$(date -u +"%Y-%m-%dT%H:%M:%S")
  title="Task board — team \`\`$TEAM_NAME\`\`"

  # Metadata IACT — el artefacto es un RST versionado, no un volcado suelto
  # (`metadata-standards.md`). Es un documento VIVO: cada corrida lo
  # sobrescribe y git guarda las versiones (I-002).
  echo ".. meta::"
  echo "   :artefacto: tablero-de-tareas"
  echo "   :tipo: Reporte de estado"
  echo "   :dominio: gestion"
  echo "   :estado: vigente"
  echo "   :fecha_actualizacion: $now"
  echo "   :autor: Equipo Kaupamex"
  echo "   :clasificacion: interno"
  echo "   :generado_por: .claude/scripts/task/snapshot-tasks.sh"
  echo "   :fuente: $TEAM_DIR (efímera al contenedor — ver cabecera del script)"
  echo
  echo ".. _tablero-de-tareas:"
  echo
  # El subrayado se calcula: el título lleva el team_name, de longitud
  # variable. Un literal fijo daba "Title underline too short" con un UUID
  # de 36 caracteres.
  echo "$title"
  printf '%*s\n' "${#title}" '' | tr ' ' '='
  echo
  echo ".. list-table::"
  echo "   :header-rows: 1"
  echo "   :widths: 8 14 60 18"
  echo
  echo "   * - ID"
  echo "     - Estado"
  echo "     - Subject"
  echo "     - Bloqueada por"

  # Orden numérico por id — los archivos son <id>.json, no <NNN>.json
  find "$TEAM_DIR" -maxdepth 1 -name '*.json' -printf '%f\n' \
    | sed 's/\.json$//' \
    | sort -n \
    | while read -r id; do
        # `celda` sanea CADA campo antes de meterlo en la list-table. Sin
        # esto, un solo registro mal formado rompe la tabla ENTERA: docutils
        # aborta la directiva con "row N does not contain the same number of
        # items as row 1". Medido con los registros 169 y 170, cuyo `subject`
        # traía el payload completo de la llamada, saltos de línea incluidos.
        #   (a) colapsa todo espacio en blanco (incluidos \n y \t) a uno solo
        #   (b) escapa el markup inline de RST que quedaría sin cerrar
        #   (c) sustituye la celda vacía por "—": una celda de list-table
        #       vacía es legal, pero deja una línea con espacio final
        #
        # El orden del escapado importa y el conjunto tiene que ser COMPLETO.
        # La contrabarra va PRIMERO (si no, se re-escapan las que introducen
        # los pasos siguientes), y el guion bajo NO es opcional: escapar sólo
        # `*` convierte `authz_*` en `authz_\*`, donde RST lee `authz_` como
        # referencia con nombre y falla con "Unknown target name". Medido:
        # 6 errores de esa forma exacta en la primera versión del saneo.
        jq -r --arg id "$id" '
          def celda:
            (. // "" | tostring)
            | gsub("\\s+"; " ")
            | sub("^ +"; "") | sub(" +$"; "")
            | gsub("\\\\"; "\\\\")
            | gsub("`"; "\\`") | gsub("\\*"; "\\*")
            | gsub("_"; "\\_") | gsub("\\|"; "\\|")
            | if . == "" then "—" else . end;
          "   * - " + ($id | celda) + "\n" +
          "     - " + (.status | celda) + "\n" +
          "     - " + (.subject | celda) + "\n" +
          "     - " + ((.blockedBy // []) | join(", ") | celda)
        ' "$TEAM_DIR/$id.json"
      done

  # --- Alcance del volcado ---------------------------------------------------
  # Un conteo sin denominador no es un resultado
  # (`hallazgo-abierto-genera-sucesor.md`). Aquí el denominador tiene una
  # parte que NO está en los archivos: los ids BORRADOS.
  #
  # El binario numera con enteros crecientes y guarda el mayor id jamás usado
  # en `.highwatermark`, para que borrar #206 no permita que un #206 nuevo
  # reutilice la referencia. Consecuencia para este volcado: una tarea
  # borrada desaparece de la tabla **sin dejar rastro**, y quien lea el
  # registro no puede distinguir "nunca existió" de "existió y se borró".
  # Eso ya costó trabajo: H-DOCS-122 fue exactamente limpiar 8 citas a #206,
  # una tarea borrada.
  local ids maximo hwm huecos
  ids=$(find "$TEAM_DIR" -maxdepth 1 -name '*.json' -printf '%f\n' | sed 's/\.json$//' | sort -n)
  maximo=$(echo "$ids" | tail -1)
  hwm=$(cat "$TEAM_DIR/.highwatermark" 2>/dev/null || echo "—")
  # Los huecos se calculan con awk, NO con `comm`: `comm` exige orden
  # lexicográfico y estos ids están ordenados numéricamente, así que se queja
  # ("file 1 is not in sorted order") y sale != 0 — bajo `set -euo pipefail`
  # eso aborta `render` a media tabla y el volcado sale TRUNCADO con exit 0,
  # porque el código de salida lo pone la última etapa de la tubería.
  # Medido al escribir este mismo bloque; es la forma de H-DOCS-120 otra vez.
  huecos=$(echo "$ids" | awk -v max="${maximo:-0}" \
    '{visto[$1]=1} END {for (i=1; i<=max; i++) if (!(i in visto)) printf "%s ", i}')

  echo
  echo "Alcance del volcado"
  echo "-------------------"
  echo
  echo "- **Tareas en el store:** $(echo "$ids" | grep -c .) archivo(s) \`\`<id>.json\`\`."
  echo "- **Mayor id presente:** ${maximo:-—}."
  echo "- **High water mark** (\`\`.highwatermark\`\`): ${hwm}. Es el mayor id"
  echo "  **jamás** usado, no el mayor presente: el binario lo escribe al"
  echo "  **borrar**, para que un id borrado no se reutilice."
  echo "- **Ids ausentes (borrados):** ${huecos:-ninguno}"
  echo "- **Origen del team:** ${ORIGEN_TEAM}."
  echo "- **Firma de estados:** \`\`$(firma_estados "$TEAM_DIR")\`\`"
  echo "  (sha256 de \`\`id:status\`\` — detecta drift de ESTADO, no sólo de"
  echo "  conteo; ver H-DOCS-172)."
}

detectar_corruptos

if [[ -n "$OUT" ]]; then
  mkdir -p "$(dirname "$OUT")"
  render > "$OUT"
  echo "snapshot-tasks.sh: escrito $OUT" >&2
else
  render
fi
