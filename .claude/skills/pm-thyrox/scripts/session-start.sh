#!/usr/bin/env bash
# session-start.sh — SessionStart hook para Claude Code
# Inyecta contexto de activación del SKILL al inicio de cada sesión.
# Install: configurar en .claude/settings.json como hook SessionStart

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && cd .. && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.claude/context"

# ─── ARQUITECTURA DE RUTAS (ADR-015) ───────────────────────────────────────
# COMMANDS_SYNCED=false → /workflow_* commands desactualizados vs SKILL.md
# COMMANDS_SYNCED=true  → /workflow_* sincronizados (post-TD-008), eliminar etiqueta [outdated]
# TD-008 completado (FASE 22). workflow_* ahora en .claude/skills/ (Capa 2, hidden).
COMMANDS_SYNCED=true

# Mapa phase → /workflow_* command
_phase_to_command() {
    case "$1" in
        "Phase 1") echo "/workflow_analyze" ;;
        "Phase 2") echo "/workflow_strategy" ;;
        "Phase 3") echo "/workflow_plan" ;;
        "Phase 4") echo "/workflow_structure" ;;
        "Phase 5") echo "/workflow_decompose" ;;
        "Phase 6") echo "/workflow_execute" ;;
        "Phase 7") echo "/workflow_track" ;;
        *) echo "/workflow_analyze" ;;
    esac
}
# ───────────────────────────────────────────────────────────────────────────

# Detectar work package activo
# Fuente 1 (primaria): now.md::current_work si phase != complete
# Fuente 2 (fallback): directorio más reciente por nombre (YYYY-MM-DD prefijo), no por mtime
ACTIVE_WP=""
PHASE=""

if [ -f "${CONTEXT_DIR}/now.md" ]; then
    PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
    if [ "$PHASE" != "complete" ] && [ -n "$PHASE" ]; then
        CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//')
        if [ -n "$CURRENT_WORK" ] && [ "$CURRENT_WORK" != "null" ]; then
            ACTIVE_WP=$(basename "$CURRENT_WORK")
        fi
    fi
fi

# Fallback: sort por nombre (timestamp prefix garantiza orden cronológico)
# Filtrar solo directorios con prefijo YYYY- para evitar que archivos como INDEX.md ganen el sort -r
if [ -z "$ACTIVE_WP" ] && [ "$PHASE" != "complete" ] && [ -d "${CONTEXT_DIR}/work" ]; then
    ACTIVE_WP=$(ls -1 "${CONTEXT_DIR}/work" 2>/dev/null | grep -E '^[0-9]{4}-' | sort -r | head -1)
fi

echo ""
echo "=== PM-THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
echo ""
if [ -n "$ACTIVE_WP" ]; then
    echo "  Work package activo: context/work/${ACTIVE_WP}/"
    [ -n "$PHASE" ] && echo "  Fase actual: ${PHASE}"
    # Mostrar próxima tarea pendiente si existe task-plan.md (o fallback plan.md)
    WP_DIR="${CONTEXT_DIR}/work/${ACTIVE_WP}"
    TASK_PLAN=$(find "$WP_DIR" -maxdepth 1 -name "*-task-plan.md" 2>/dev/null | head -1)
    [ -z "$TASK_PLAN" ] && [ -f "${WP_DIR}/plan.md" ] && TASK_PLAN="${WP_DIR}/plan.md"
    if [ -n "$TASK_PLAN" ]; then
        NEXT=$(grep -m1 "^\- \[ \]" "$TASK_PLAN" 2>/dev/null | sed 's/- \[ \] //')
        [ -n "$NEXT" ] && echo "  Próxima tarea: ${NEXT}"
    fi
    echo ""
    # Mostrar las dos rutas de ejecución (ADR-015 D-04 + D-06)
    WF_CMD=$(_phase_to_command "$PHASE")
    echo "  Opciones de ejecución:"
    echo "    A (calidad alta HOY):    invocar pm-thyrox SKILL → ${PHASE}"
    if [ "$COMMANDS_SYNCED" = "true" ]; then
        echo "    B (determinístico):      ${WF_CMD}"
    else
        echo "    B (determinístico):      ${WF_CMD}  [outdated — esperar TD-008]"
    fi
else
    echo "  Sin work package activo"
    echo ""
    echo "  Opciones de ejecución:"
    echo "    A (calidad alta HOY):    invocar pm-thyrox SKILL → Phase 1: ANALYZE"
    if [ "$COMMANDS_SYNCED" = "true" ]; then
        echo "    B (determinístico):      /workflow_analyze"
    else
        echo "    B (determinístico):      /workflow_analyze  [outdated — esperar TD-008]"
    fi
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
