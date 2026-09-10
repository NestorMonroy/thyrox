#!/usr/bin/env bash
# session-start.sh — SessionStart hook para Claude Code
# Inyecta contexto de activación del SKILL al inicio de cada sesión.
# Install: configurar en .claude/settings.json como hook SessionStart

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" && -n "${THYROX_ENV_FILE:-}" && -f "${THYROX_ENV_FILE}" ]]; then
    _thyrox_root="$(sed -n 's/^[[:space:]]*THYROX_ROOT[[:space:]]*=[[:space:]]*//p' \
        "$THYROX_ENV_FILE" | tail -1 | tr -d '"'"'"'')"
fi
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
PROJECT_ROOT="$(thyrox_root)" || exit 2
CONTEXT_DIR="${PROJECT_ROOT}/.thyrox/context"

# Interfaz pública: /thyrox:* (plugin, FASE 31). Impl: workflow-* skills. ADR-015/019.
# Mapa stage/phase → /thyrox:* command (interfaz pública del plugin)
# Acepta tanto "Stage N" (nuevo) como "Phase N" (retrocompat)
_phase_to_command() {
    # Normalizar: extraer número de "Stage N" o "Phase N"
    local n
    n=$(echo "$1" | grep -oE '[0-9]+' | head -1)
    case "$n" in
        1)  echo "/thyrox:discover" ;;
        2)  echo "/thyrox:measure" ;;
        3)  echo "/thyrox:analyze" ;;
        4)  echo "/thyrox:constraints" ;;
        5)  echo "/thyrox:strategy" ;;
        6)  echo "/thyrox:plan" ;;
        7)  echo "/thyrox:design" ;;
        8)  echo "/thyrox:decompose" ;;
        9)  echo "/thyrox:pilot" ;;
        10) echo "/thyrox:execute" ;;
        11) echo "/thyrox:track" ;;
        12) echo "/thyrox:standardize" ;;
        *)  echo "/thyrox:discover" ;;
    esac
}
# Detectar work package activo
ACTIVE_WP=""
PHASE=""
METHODOLOGY_STEP=""

if [ -f "${CONTEXT_DIR}/now.md" ]; then
    # stage: toma precedencia sobre phase: (retrocompat)
    PHASE=$(grep "^stage:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/stage: *//')
    [ -z "$PHASE" ] && PHASE=$(grep "^phase:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/phase: *//')
    METHODOLOGY_STEP=$(grep "^methodology_step:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/methodology_step: *//')
    if [ "$PHASE" != "complete" ] && [ -n "$PHASE" ]; then
        CURRENT_WORK=$(grep "^current_work:" "${CONTEXT_DIR}/now.md" 2>/dev/null | head -1 | sed 's/current_work: *//')
        if [ -n "$CURRENT_WORK" ] && [ "$CURRENT_WORK" != "null" ]; then
            ACTIVE_WP=$(basename "$CURRENT_WORK")
        fi
    fi
fi

echo ""
echo "=== THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
echo ""
if [ -n "$ACTIVE_WP" ]; then
    echo "  Work package activo: context/work/${ACTIVE_WP}/"
    [ -n "$PHASE" ] && echo "  Stage actual: ${PHASE}"
    [ -n "$METHODOLOGY_STEP" ] && [ "$METHODOLOGY_STEP" != "null" ] && echo "  Methodology step: ${METHODOLOGY_STEP}"
    # Mostrar próxima tarea pendiente si existe task-plan.md (o fallback plan.md)
    WP_DIR="${CONTEXT_DIR}/work/${ACTIVE_WP}"
    TASK_PLAN=$(find "$WP_DIR" -maxdepth 2 -name "*-task-plan.md" 2>/dev/null | head -1)
    [ -z "$TASK_PLAN" ] && [ -f "${WP_DIR}/plan.md" ] && TASK_PLAN="${WP_DIR}/plan.md"
    if [ -n "$TASK_PLAN" ]; then
        NEXT=$(grep -m1 "^\- \[ \]" "$TASK_PLAN" 2>/dev/null | sed 's/- \[ \] //')
        [ -n "$NEXT" ] && echo "  Próxima tarea: ${NEXT}"
    fi
    # Alerta B-09: Stage/Phase 10 activa sin execution-log (TD-014, SPEC-003)
    if [ "$PHASE" = "Phase 10" ] || [ "$PHASE" = "Stage 10" ] || echo "$PHASE" | grep -qE "^Stage 10"; then
        EXEC_LOG=$(find "$WP_DIR" -maxdepth 2 -name "*-execution-log.md" 2>/dev/null | head -1)
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
    echo "[sync] Commands: up to date"
    echo "    B (determinístico):      ${WF_CMD}"
else
    echo "  Sin work package activo"
    echo ""
    echo "  Opciones de ejecución:"
    echo "    A (calidad alta HOY):    invocar thyrox SKILL → Phase 1: DISCOVER"
    echo "[sync] Commands: up to date"
    echo "    B (determinístico):      /thyrox:discover"
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

# --- reconciliar los archivos sueltos de ~/.claude ---------------------------
# El instalador copia CLASES (directorios) y los archivos de la raíz de
# `~/.claude/` no caen en ninguna. Los entrega el harness, así que no se copian:
# se parchean, de forma idempotente y rehusando ante una forma desconocida. Sin
# esto, un arreglo hecho en sitio muere con el contenedor y nadie que clone
# thyrox lo recibe — que es el defecto que TASK-DOCS-0422 registra.
_reconcile="${PROJECT_ROOT}/src/session/reconcile_user_hooks.py"
if [ -f "$_reconcile" ]; then
    python3 "$_reconcile" 2>&1 | sed 's/^/  [hooks] /'
fi
