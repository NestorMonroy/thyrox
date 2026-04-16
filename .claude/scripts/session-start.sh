#!/usr/bin/env bash
# session-start.sh — SessionStart hook para Claude Code
# Inyecta contexto de activación del SKILL al inicio de cada sesión.
# Install: configurar en .claude/settings.json como hook SessionStart

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTEXT_DIR="${PROJECT_ROOT}/.thyrox/context"

# ─── ARQUITECTURA DE RUTAS (ADR-015, ADR-019) ──────────────────────────────
# Interfaz pública: /thyrox:* commands (plugin namespace, FASE 31)
# Implementación interna: workflow-* skills (no expuestos directamente al usuario)
# TD-008 completado (FASE 22). ADR-019 aceptado (FASE 31).
COMMANDS_SYNCED=true

# Mapa phase → /thyrox:* command (interfaz pública del plugin)
_phase_to_command() {
    case "$1" in
        "Phase 1")  echo "/thyrox:discover" ;;
        "Phase 2")  echo "/thyrox:measure" ;;
        "Phase 3")  echo "/thyrox:analyze" ;;
        "Phase 4")  echo "/thyrox:constraints" ;;
        "Phase 5")  echo "/thyrox:strategy" ;;
        "Phase 6")  echo "/thyrox:plan" ;;
        "Phase 7")  echo "/thyrox:design" ;;
        "Phase 8")  echo "/thyrox:decompose" ;;
        "Phase 9")  echo "/thyrox:pilot" ;;
        "Phase 10") echo "/thyrox:execute" ;;
        "Phase 11") echo "/thyrox:track" ;;
        "Phase 12") echo "/thyrox:standardize" ;;
        *)          echo "/thyrox:discover" ;;
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
echo "=== THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
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
    # Alerta B-09: Phase 10 activa sin execution-log (TD-014, SPEC-003)
    if [ "$PHASE" = "Phase 10" ]; then
        EXEC_LOG=$(find "$WP_DIR" -maxdepth 1 -name "*-execution-log.md" 2>/dev/null | head -1)
        if [ -z "$EXEC_LOG" ]; then
            echo ""
            echo "  ⚠  ALERTA B-09: Phase 10 activa pero no existe execution-log en el WP."
            echo "     Crear ${ACTIVE_WP}-execution-log.md antes de continuar."
        fi
    fi
    echo ""
    # Mostrar las dos rutas de ejecución (ADR-015 D-04 + D-06)
    WF_CMD=$(_phase_to_command "$PHASE")
    echo "  Opciones de ejecución:"
    echo "    A (calidad alta HOY):    invocar thyrox SKILL → ${PHASE}"
    if [ "$COMMANDS_SYNCED" = "true" ]; then
        echo "    B (determinístico):      ${WF_CMD}"
    else
        echo "    B (determinístico):      ${WF_CMD}  [outdated — esperar TD-008]"
    fi
else
    echo "  Sin work package activo"
    echo ""
    echo "  Opciones de ejecución:"
    echo "    A (calidad alta HOY):    invocar thyrox SKILL → Phase 1: DISCOVER"
    if [ "$COMMANDS_SYNCED" = "true" ]; then
        echo "    B (determinístico):      /thyrox:discover"
    fi
fi

# Detectar tech skills activos (generados por _generator.sh)
SKILLS_DIR="${PROJECT_ROOT}/.claude/skills"
TECH_SKILLS=""
if [ -d "$SKILLS_DIR" ]; then
    for skill_dir in "$SKILLS_DIR"/*/; do
        skill_name="$(basename "$skill_dir")"
        # Excluir thyrox (management skill)
        if [ "$skill_name" != "thyrox" ] && [ -f "${skill_dir}SKILL.md" ]; then
            TECH_SKILLS="${TECH_SKILLS} ${skill_name}"
        fi
    done
fi

if [ -n "$TECH_SKILLS" ]; then
    echo "  Tech skills activos:$(echo "$TECH_SKILLS" | tr ' ' '\n' | grep -v '^$' | sed 's/^/    - /')"
else
    echo "  Tech skills: ninguno — ejecuta /thyrox:init para configurar"
fi
echo ""
echo "===================================================="
echo ""
