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

# El estado de trabajo NO se lee aquí. Este hook leía `.thyrox/context/now.md`,
# el estado del THYROX anterior, que no existe en este árbol ni en sus
# consumidores: publicaba un «Sin work package activo» fijo que se leía como
# medido. El estado vive en el consumidor (su `progreso` y su siguiente mejor
# decisión), y se dice así en vez de inventarlo.
echo ""
echo "=== THYROX — ACTIVAR SKILL ANTES DE TRABAJAR ==="
echo ""
echo "  El estado de trabajo vive en el consumidor; este hook no lo mide."
echo ""

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
