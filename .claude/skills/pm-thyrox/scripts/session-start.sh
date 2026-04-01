#!/usr/bin/env bash
# session-start.sh — SessionStart hook para Claude Code
# Inyecta contexto de activación del SKILL al inicio de cada sesión.
# Install: configurar en .claude/settings.json como hook SessionStart

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"

# Detectar work package activo (más reciente en context/work/)
ACTIVE_WP=""
if [ -d "${CONTEXT_DIR}/work" ]; then
    ACTIVE_WP=$(ls -1t "${CONTEXT_DIR}/work" 2>/dev/null | head -1)
fi

echo ""
echo "=== PM-THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
echo ""
echo "  REQUERIDO: Invocar Skill tool → pm-thyrox"
echo "  Si no disponible: leer .claude/skills/pm-thyrox/SKILL.md"
echo ""
if [ -n "$ACTIVE_WP" ]; then
    echo "  Work package activo: context/work/${ACTIVE_WP}/"
    # Detectar phase actual desde now.md
    if [ -f "${CONTEXT_DIR}/now.md" ]; then
        PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
        [ -n "$PHASE" ] && echo "  Fase actual: ${PHASE}"
    fi
    # Mostrar próxima tarea pendiente si existe plan.md
    PLAN="${CONTEXT_DIR}/work/${ACTIVE_WP}/plan.md"
    if [ -f "$PLAN" ]; then
        NEXT=$(grep -m1 "^\- \[ \]" "$PLAN" 2>/dev/null | sed 's/- \[ \] //')
        [ -n "$NEXT" ] && echo "  Próxima tarea: ${NEXT}"
    fi
else
    echo "  Sin work package activo → empezar Phase 1: ANALYZE"
fi
echo ""
echo "===================================================="
echo ""
