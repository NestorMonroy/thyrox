#!/usr/bin/env bash
# setup-template.sh
# Personaliza el template pm-thyrox para tu proyecto.
#
# Uso:
#   git clone <repo> mi-proyecto && cd mi-proyecto
#   bash setup-template.sh
#
# El script:
#   1. Pide el nombre de tu proyecto
#   2. Reemplaza THYROX → tu nombre en archivos core
#   3. Resetea archivos de estado (ROADMAP, CHANGELOG, project-state)
#   4. Limpia work packages y errores de ejemplo
#   5. Hace commit inicial

set -euo pipefail

echo "============================================"
echo " PM-THYROX Template Setup"
echo "============================================"
echo ""

# 1. Ask for project name
read -p "Nombre del proyecto (ej: mi-app, PaymentService): " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
    echo "Error: nombre vacío. Abortando."
    exit 1
fi

# Derive variants
PROJECT_UPPER=$(echo "$PROJECT_NAME" | tr '[:lower:]' '[:upper:]' | tr ' ' '-')
PROJECT_LOWER=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
PROJECT_KEBAB=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Validate: reject names with sed-dangerous characters
if echo "$PROJECT_NAME" | grep -qE '[&/\\|]'; then
    echo "Error: el nombre no puede contener &, /, \\ o |"
    echo "Usa solo letras, números, espacios y guiones."
    exit 1
fi

echo ""
echo "Proyecto: $PROJECT_NAME"
echo "  UPPER:  $PROJECT_UPPER"
echo "  lower:  $PROJECT_LOWER"
echo "  kebab:  $PROJECT_KEBAB"
echo ""
read -p "¿Correcto? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Abortando."
    exit 0
fi

echo ""
echo "--- Reemplazando nombres en archivos core ---"

# 2. Core files to replace (NOT work packages, they are history)
CORE_FILES=(
    ".claude/CLAUDE.md"
    ".claude/context/project-state.md"
    ".claude/context/decisions.md"
    ".claude/skills/pm-thyrox/SKILL.md"
    ".claude/skills/pm-thyrox/assets/document.md.template"
    ".claude/skills/pm-thyrox/assets/epic.md.template"
    ".claude/skills/pm-thyrox/references/commit-convention.md"
    ".claude/skills/pm-thyrox/references/commit-helper.md"
    ".claude/skills/pm-thyrox/references/conventions.md"
    ".claude/skills/pm-thyrox/references/examples.md"
    ".claude/skills/pm-thyrox/references/incremental-correction.md"
    ".claude/skills/pm-thyrox/references/long-context-tips.md"
    ".claude/skills/pm-thyrox/references/prompting-tips.md"
    ".claude/skills/pm-thyrox/references/reference-validation.md"
    ".claude/skills/pm-thyrox/references/scalability.md"
    ".claude/skills/pm-thyrox/references/skill-authoring.md"
    ".claude/skills/pm-thyrox/references/spec-driven-development.md"
    ".claude/skills/pm-thyrox/scripts/project-status.sh"
    ".claude/skills/pm-thyrox/scripts/validate-session-close.sh"
    "ARCHITECTURE.md"
    "CHANGELOG.md"
    "CONTRIBUTING.md"
    "README.md"
    "ROADMAP.md"
    "api/README.md"
    "build/README.md"
    "docs/BUILD.md"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        sed -i "s/THYROX/$PROJECT_UPPER/g" "$file"
        sed -i "s/thyrox/$PROJECT_LOWER/g" "$file"
        sed -i "s/Thyrox/$PROJECT_NAME/g" "$file"
        sed -i "s/PM-THYROX/PM-$PROJECT_UPPER/g" "$file"
        echo "  ✅ $file"
    fi
done

# Also replace in ADRs that mention THYROX
for file in .claude/context/decisions/adr-*.md; do
    if [ -f "$file" ] && grep -q "THYROX\|thyrox" "$file"; then
        sed -i "s/THYROX/$PROJECT_UPPER/g" "$file"
        sed -i "s/thyrox/$PROJECT_LOWER/g" "$file"
        echo "  ✅ $file"
    fi
done

# Replace in error files
for file in .claude/context/errors/ERR-*.md; do
    if [ -f "$file" ] && grep -q "THYROX\|thyrox" "$file"; then
        sed -i "s/THYROX/$PROJECT_UPPER/g" "$file"
        sed -i "s/thyrox/$PROJECT_LOWER/g" "$file"
        echo "  ✅ $file"
    fi
done

echo ""
echo "--- Reseteando archivos de estado ---"

# 3. Reset state files
cat > ".claude/context/project-state.md" << EOF
\`\`\`yml
Tipo: Estado del Proyecto
Versión: 0.1.0
Fecha actualización: $(date +%Y-%m-%d)
\`\`\`

# Project State - $PROJECT_UPPER

**Proyecto:** $PROJECT_NAME
**Versión:** 0.1.0
**Estado:** Inicialización

## Setup completado

- [x] Template pm-thyrox inicializado ($(date +%Y-%m-%d))
- [ ] Phase 1: ANALYZE — definir requisitos del proyecto

## Skill activo

pm-thyrox con 7 fases SDLC, 20 references, 32+ templates
EOF
echo "  ✅ project-state.md reseteado"

cat > ".claude/context/focus.md" << EOF
\`\`\`yml
Tipo: Estado Operacional
Versión: 1.0
Última actualización: $(date +%Y-%m-%d)
\`\`\`

# Focus

Proyecto recién inicializado desde template pm-thyrox.

## Pendiente

1. Phase 1: ANALYZE — entender requisitos del proyecto
2. Definir scope y crear primer work package
EOF
echo "  ✅ focus.md reseteado"

cat > ".claude/context/now.md" << EOF
\`\`\`yml
Tipo: Estado de Sesión
Versión: 1.0
Última actualización: $(date +%Y-%m-%d)
cold_boot: true
last_session: null
current_work: null
phase: null
blockers: []
\`\`\`

# Contexto

Primera sesión. Template inicializado. Listo para Phase 1: ANALYZE.
EOF
echo "  ✅ now.md reseteado"

cat > "ROADMAP.md" << EOF
\`\`\`yml
Tipo: Plan Maestro
Categoría: Gestión de Proyecto
Versión: 0.1.0
Propósito: Plan maestro de trabajo y tracking de progreso
Fecha actualización: $(date +%Y-%m-%d)
\`\`\`

# ROADMAP - $PROJECT_UPPER

## Convenciones

- \`[ ]\` = Pendiente
- \`[-]\` = En Progreso
- \`[x]\` = Completado (YYYY-MM-DD)

---

## FASE 1: Setup inicial

- [x] Inicializar desde template pm-thyrox ($(date +%Y-%m-%d))
- [ ] Phase 1: ANALYZE — definir requisitos
- [ ] Phase 2: SOLUTION_STRATEGY — elegir stack/arquitectura
- [ ] Phase 3: PLAN — definir scope y work packages

---

## Métricas de Progreso

\`\`\`
FASE 1: Setup inicial — 10%
\`\`\`

---

**Última actualización:** $(date +%Y-%m-%d)
EOF
echo "  ✅ ROADMAP.md reseteado"

cat > "CHANGELOG.md" << EOF
\`\`\`yml
Tipo: Changelog
Versión: 0.1.0
Fecha actualización: $(date +%Y-%m-%d)
\`\`\`

# Changelog - $PROJECT_UPPER

Formato basado en [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - $(date +%Y-%m-%d)

### Added
- Inicializado desde template pm-thyrox
- Skill pm-thyrox con 7 fases SDLC
- 20 references de metodología
- 32+ templates de artefactos
- Scripts de validación
EOF
echo "  ✅ CHANGELOG.md reseteado"

echo ""
echo "--- Limpiando work packages y errores de ejemplo ---"

# 4. Clean work packages (THYROX development history)
if [ -d ".claude/context/work" ]; then
    rm -rf .claude/context/work/*/
    echo "  ✅ context/work/ limpiado"
fi

# Clean error files (THYROX-specific errors)
if [ -d ".claude/context/errors" ]; then
    rm -rf .claude/context/errors/
    mkdir -p .claude/context/errors
    echo "  ✅ context/errors/ limpiado"
fi

echo ""
echo "--- Limpiando archivos de setup ---"
rm -f reference-validation-report.txt
rm -f setup-template.sh
echo "  ✅ setup-template.sh auto-eliminado"

echo ""
echo "============================================"
echo " Setup completado"
echo "============================================"
echo ""
echo "Tu proyecto $PROJECT_NAME está listo."
echo ""
echo "Siguiente paso:"
echo "  git add -A && git commit -m 'feat: initialize $PROJECT_NAME from pm-thyrox template'"
echo ""
echo "Luego abre Claude Code y di:"
echo "  'Quiero empezar a planificar mi proyecto'"
echo ""
echo "El skill pm-thyrox te guiará desde Phase 1: ANALYZE."
echo "============================================"
