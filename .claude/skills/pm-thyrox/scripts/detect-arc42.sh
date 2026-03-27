#!/usr/bin/env bash
# detect-arc42.sh
# Detecta todas las frases que contienen "arc42" (case-insensitive) en el proyecto.
#
# Uso:
#   ./scripts/detect-arc42.sh              # Busca desde la raíz del proyecto
#   ./scripts/detect-arc42.sh <directorio> # Busca en un directorio específico

set -euo pipefail

SEARCH_DIR="${1:-$(git rev-parse --show-toplevel 2>/dev/null || echo .)}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD} Detector de referencias arc42${NC}"
echo -e "${BOLD}========================================${NC}"
echo -e "Directorio: ${CYAN}${SEARCH_DIR}${NC}"
echo ""

# Excluir directorios no relevantes y el propio script
EXCLUDE_ARGS=(
    --hidden
    --glob '!.git'
    --glob '!node_modules'
    --glob '!__pycache__'
    --glob '!*.pyc'
    --glob '!detect-arc42.sh'
)

# --- Resumen por archivo ---
echo -e "${YELLOW}--- Archivos con coincidencias ---${NC}"
echo ""

TOTAL_FILES=0
TOTAL_MATCHES=0

while IFS=: read -r file count; do
    echo -e "  ${GREEN}${file}${NC} ${BOLD}(${count} coincidencias)${NC}"
    TOTAL_FILES=$((TOTAL_FILES + 1))
    TOTAL_MATCHES=$((TOTAL_MATCHES + count))
done < <(rg -ic 'arc42' "${EXCLUDE_ARGS[@]}" "$SEARCH_DIR" 2>/dev/null || true)

echo ""
echo -e "${BOLD}Total: ${TOTAL_MATCHES} coincidencias en ${TOTAL_FILES} archivos${NC}"
echo ""

# --- Detalle línea por línea ---
echo -e "${YELLOW}--- Detalle de coincidencias ---${NC}"
echo ""

rg -in --color=always --colors 'match:fg:red' --colors 'match:style:bold' \
    --heading --line-number \
    'arc42' "${EXCLUDE_ARGS[@]}" "$SEARCH_DIR" 2>/dev/null || true

echo ""
echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD} Escaneo completado${NC}"
echo -e "${BOLD}========================================${NC}"
