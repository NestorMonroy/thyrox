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
    # Mostrar próxima tarea pendiente si existe task-plan.md (o fallback plan.md)
    WP_DIR="${CONTEXT_DIR}/work/${ACTIVE_WP}"
    TASK_PLAN=$(find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md" 2>/dev/null | head -1)
    [ -z "$TASK_PLAN" ] && [ -f "${WP_DIR}/plan.md" ] && TASK_PLAN="${WP_DIR}/plan.md"
    if [ -n "$TASK_PLAN" ]; then
        NEXT=$(grep -m1 "^\- \[ \]" "$TASK_PLAN" 2>/dev/null | sed 's/- \[ \] //')
        [ -n "$NEXT" ] && echo "  Próxima tarea: ${NEXT}"
    fi
else
    echo "  Sin work package activo → empezar Phase 1: ANALYZE"
fi

# Detectar tech skills activos (generados por _generator.sh)
SKILLS_DIR="${PROJECT_ROOT}/.claude/skills"
TECH_SKILLS=""
if [ -d "$SKILLS_DIR" ]; then
    for skill_dir in "$SKILLS_DIR"/*/; do
        skill_name="$(basename "$skill_dir")"
        # Excluir pm-thyrox (management skill)
        if [ "$skill_name" != "pm-thyrox" ] && [ -f "${skill_dir}SKILL.md" ]; then
            TECH_SKILLS="${TECH_SKILLS} ${skill_name}"
        fi
    done
fi

if [ -n "$TECH_SKILLS" ]; then
    echo "  Tech skills activos:$(echo "$TECH_SKILLS" | tr ' ' '\n' | grep -v '^$' | sed 's/^/    - /')"
else
    echo "  Tech skills: ninguno — ejecuta /workflow_init para configurar"
fi
echo ""
echo "===================================================="
echo ""
