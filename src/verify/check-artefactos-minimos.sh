#!/bin/bash
# =============================================================================
# .claude/scripts/gates/check-artefactos-minimos.sh — gate de artefactos mínimos
# =============================================================================
# Verifica que cada iniciativa ACTIVA tenga sus artefactos MÍNIMOS obligatorios
# según DEC-AM-01 (definir-artefactos-minimos-iniciativa):
#
#   - SIEMPRE: index.rst
#   - alcance-<slug>.rst OBLIGATORIO en cuanto la iniciativa deja DISCOVER
#     (:estado: en {en-definicion, en-ejecucion, en-revision, aprobado,
#      bloqueada}). En borrador/en-analisis puede no existir aún.
#   - Si existe alcance en iniciativa ACTIVA: debe contener
#     "Premisa verificada" + ":flow:".
#   - :estado: en-ejecucion  → progreso-<slug>.rst OBLIGATORIO.
#
# EXENTAS de los checks de contenido (retrofit prospectivo, DEC-R-01/DEC-SM-01):
#   estados TERMINALES {completada, cerrada, descartada, absorbida} — sólo se
#   exige index.rst; su :flow:/Premisa son históricos y NO se retrofitean.
#
# El alcance es la "puerta de la ejecución" del principio rector
# ("sin análisis previo confirmado, no hay ejecución").
#
# Uso:
#   bash .claude/scripts/gates/check-artefactos-minimos.sh          # reporte
#   bash .claude/scripts/gates/check-artefactos-minimos.sh --strict # exit 1 si falta
#   bash .claude/scripts/gates/check-artefactos-minimos.sh --quiet  # solo el conteo
# =============================================================================
set -uo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; cd "$ROOT"
STRICT=false; QUIET=false
for a in "$@"; do
  [[ "$a" == "--strict" ]] && STRICT=true
  [[ "$a" == "--quiet" ]]  && QUIET=true
done

TERMINAL_RE='^(completada|cerrada|descartada|absorbida)$'
NEEDS_ALCANCE_RE='^(en-definicion|en-ejecucion|en-revision|aprobado|bloqueada)$'

VIOL=0; TOTAL=0; ACTIVE=0
report() { $QUIET || echo "$1"; }

for d in source/gestion/pm/*/iniciativas/*/; do
  [[ -d "$d" ]] || continue
  slug="$(basename "$d")"
  TOTAL=$((TOTAL+1))
  idx="$d/index.rst"

  # 1. index.rst siempre (aplica a TODA iniciativa, incl. terminales)
  if [[ ! -f "$idx" ]]; then
    VIOL=$((VIOL+1)); report "FALTA · $slug; falta index.rst"; continue
  fi

  estado="$(grep -m1 -oE '^ *:estado:[[:space:]]*[A-Za-zñáéíó_-]+' "$idx" \
            | sed -E 's/^ *:estado:[[:space:]]*//' | tr 'A-Z' 'a-z')"

  # Terminales: sólo index.rst (retrofit prospectivo — no se auditan más)
  [[ "$estado" =~ $TERMINAL_RE ]] && continue

  ACTIVE=$((ACTIVE+1))
  problems=""

  alc="$(ls "$d"alcance-*.rst 2>/dev/null | head -1)"
  if [[ -z "$alc" ]]; then
    [[ "$estado" =~ $NEEDS_ALCANCE_RE ]] && \
      problems="$problems; falta alcance-*.rst (estado=$estado exige alcance)"
  else
    grep -qE '^Premisa verificada' "$alc" || problems="$problems; alcance sin 'Premisa verificada'"
    grep -qE '^ *:flow:[[:space:]]*\S' "$alc" || problems="$problems; alcance sin :flow:"
  fi

  [[ "$estado" == "en-ejecucion" ]] && \
    { ls "$d"progreso-*.rst >/dev/null 2>&1 || problems="$problems; en-ejecucion sin progreso-*.rst"; }

  if [[ -n "$problems" ]]; then
    VIOL=$((VIOL+1))
    report "FALTA · $slug (estado=${estado:-<none>})$problems"
  fi
done

report ""
report "## Artefactos mínimos: $VIOL incumplidoras · $ACTIVE activas auditadas · $TOTAL totales"
$QUIET && echo "$VIOL"

# Universo vacío = el gate no encontró su árbol (se corrió fuera del repo docs).
# No puede afirmar nada, así que no sale verde. Ver H-API-336.
if [[ "$TOTAL" -eq 0 ]]; then
  $QUIET || echo "check-artefactos-minimos: 0 iniciativas que medir — el gate no puede afirmar nada. ¿Se corrió fuera de kaupamex-docs?"
  exit 2
fi

$STRICT && [[ "$VIOL" -gt 0 ]] && exit 1
exit 0
