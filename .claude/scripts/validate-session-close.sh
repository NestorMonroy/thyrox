#!/usr/bin/env bash
# validate-session-close.sh — Valida estado del WP y agentes antes de cerrar sesión
# TD-001: detecta timestamps incompletos (created_at sin hora)
# Uso: bash .claude/scripts/validate-session-close.sh
# Exit 0 → todo OK (advertencias no bloquean Stop hook)

ERRORS=0

# ── Directorios con soporte de migración ──────────────────────────────────────
# Durante la migración .claude/context/ → .thyrox/context/ ambos pueden coexistir.
WORK_DIRS=()
[ -d ".claude/context/work" ]  && WORK_DIRS+=(".claude/context/work")
[ -d ".thyrox/context/work" ]  && WORK_DIRS+=(".thyrox/context/work")

CONTEXT_DIRS=()
[ -d ".claude/context" ]       && CONTEXT_DIRS+=(".claude/context")
[ -d ".thyrox/context" ]       && CONTEXT_DIRS+=(".thyrox/context")

# ── Check 1: TD-001 — timestamps incompletos (created_at sin hora) ─────────────
for WORK_DIR in "${WORK_DIRS[@]}"; do
  INCOMPLETE=$(grep -rlE "^created_at: [0-9]{4}-[0-9]{2}-[0-9]{2}$" "$WORK_DIR" 2>/dev/null)
  if [ -n "$INCOMPLETE" ]; then
    echo "⚠ TD-001: timestamps incompletos en $WORK_DIR (fecha sin hora):"
    echo "$INCOMPLETE" | sed 's/^/  /'
    echo "  Corregir: created_at: YYYY-MM-DD → created_at: YYYY-MM-DD HH:MM:SS"
    ERRORS=$((ERRORS + 1))
  fi
done

# ── Check 2: Agentes en background — now-{agent-id}.md huérfanos ──────────────
# Si exists now-{agent-id}.md al cerrar sesión, el agente puede:
#   a) Seguir corriendo — sus notificaciones se pierden si la sesión se compacta
#   b) Haber terminado — su resultado puede no haber sido recolectado
# Referencia: subagent-patterns.md — "Limitaciones de notificación y compactación"
ORPHANED=()
for CTX_DIR in "${CONTEXT_DIRS[@]}"; do
  while IFS= read -r -d '' f; do
    ORPHANED+=("$f")
  done < <(find "$CTX_DIR" -maxdepth 1 -name "now-*.md" -print0 2>/dev/null)
done

if [ ${#ORPHANED[@]} -gt 0 ]; then
  echo "⚠ AGENTES EN BACKGROUND: ${#ORPHANED[@]} state file(s) de agente sin cerrar:"
  for f in "${ORPHANED[@]}"; do
    echo "  $f"
  done
  echo ""
  echo "  Riesgo: si la sesión se compacta antes de que el agente complete,"
  echo "  las notificaciones se pierden (bug documentado v2.1.83)."
  echo "  Antes de cerrar: verificar que el artefacto de resultado existe."
  echo "  Si el agente ya terminó y el resultado fue recolectado: eliminar el now-*.md."
  ERRORS=$((ERRORS + 1))
fi

# ── Check 3: Consistencia now.md — current_work vs WPs en disco ───────────────
NOW_FILE=""
[ -f ".thyrox/context/now.md" ] && NOW_FILE=".thyrox/context/now.md"
[ -f ".claude/context/now.md" ] && NOW_FILE=".claude/context/now.md"

if [ -n "$NOW_FILE" ]; then
  CURRENT_WORK=$(grep "^current_work:" "$NOW_FILE" | sed 's/^current_work:[[:space:]]*//')

  # Solo contar WPs en .thyrox/context/work/ — son los activos (la migración los pone ahí).
  # .claude/context/work/ contiene WPs históricos cerrados — ignorar para este check.
  THYROX_WPS=0
  THYROX_WP_LIST=""
  if [ -d ".thyrox/context/work" ]; then
    THYROX_WPS=$(find ".thyrox/context/work" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)
    THYROX_WP_LIST=$(find ".thyrox/context/work" -mindepth 1 -maxdepth 1 -type d 2>/dev/null)
  fi

  # now.md dice null pero hay WPs activos en .thyrox/context/work/
  if [ "$CURRENT_WORK" = "null" ] && [ "$THYROX_WPS" -gt 0 ]; then
    echo "⚠ INCONSISTENCIA: $NOW_FILE::current_work es null pero existen $THYROX_WPS WP(s) activo(s):"
    echo "$THYROX_WP_LIST" | sed 's/^/  /'
    echo "  Actualizar current_work en $NOW_FILE antes de cerrar sesión."
    ERRORS=$((ERRORS + 1))
  fi

  # now.md apunta a WP que no existe en disco
  if [ -n "$CURRENT_WORK" ] && [ "$CURRENT_WORK" != "null" ]; then
    if [ ! -d "$CURRENT_WORK" ]; then
      echo "⚠ INCONSISTENCIA: $NOW_FILE::current_work apunta a directorio inexistente:"
      echo "  $CURRENT_WORK"
      echo "  Corregir la ruta o actualizar current_work a null si el WP cerró."
      ERRORS=$((ERRORS + 1))
    fi
  fi
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
if [ "$ERRORS" -eq 0 ]; then
  echo "✓ validate-session-close: sin problemas detectados"
else
  echo ""
  echo "  ($ERRORS advertencia(s) — el Stop hook no se bloquea, pero revisar antes de cerrar)"
fi

exit 0  # Nunca bloquear Stop hook
