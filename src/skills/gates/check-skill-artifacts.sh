#!/usr/bin/env bash
# El SKILL.md de uno de los 71 skills de metodología (ba/bpa/cp/dmaic/kanban/
# lean/pdca/pm/pps/rm/rup/scrum/sp) es DERIVADO: su fuente es
# src/skills/definitions. Este gate compara el disco contra lo que el
# emisor produce — mismo criterio que check-agent-artifacts.sh y que
# `makemigrations --check`.
#
# Uso:  check-skill-artifacts.sh [--strict] [archivos...]
#   Sin archivos mide siempre. Con archivos, sólo actúa si alguno pertenece a
#   la superficie del mecanismo (src/skills/**) o a los SKILL.md derivados.
set -euo pipefail

# La raíz se ancla en la ubicación del propio gate, que vive en
# `<raíz>/src/skills/gates/` — mismo invariante que check-agent-artifacts.sh
# usa contra `src/gates/`.
RAIZ="${THYROX_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
MECANISMO_REL="src/skills"
ESTRICTO=0
ARCHIVOS=()
for arg in "$@"; do
    if [[ "$arg" == "--strict" ]]; then ESTRICTO=1; else ARCHIVOS+=("$arg"); fi
done

# Con lista de archivos, sólo mide si alguno toca la superficie. Las rutas
# ABSOLUTAS se normalizan antes del `case` — un pre-commit las entrega así,
# y sin normalizar el gate se eximiría de su propia superficie (el mismo
# defecto que el gate hermano de agentes ya corrigió).
if [[ "${#ARCHIVOS[@]}" -gt 0 ]]; then
    TOCA=0
    for f in "${ARCHIVOS[@]}"; do
        rel="${f#"$RAIZ"/}"
        case "$rel" in
            "$MECANISMO_REL"/*|.claude/skills/*/SKILL.md) TOCA=1 ;;
        esac
    done
    if [[ "$TOCA" -eq 0 ]]; then
        echo "check-skill-artifacts: sin cambios en la superficie del mecanismo" \
             "(alcance medido: ${#ARCHIVOS[@]} archivo(s) pedido(s))"
        exit 0
    fi
fi

# Precondición declarada: sin el runtime NO se emite un conteo. Un 0 aquí
# sería un verde falso — el gate no habría medido nada.
if ! command -v bun >/dev/null 2>&1; then
    echo "ERROR — falta \`bun\`, que es lo que ejecuta el emisor." >&2
    echo "  NO se emite un veredicto: un 0 aquí sería un verde falso." >&2
    exit 2
fi

SALIDA="$(cd "$RAIZ" && bun run "$MECANISMO_REL/bin/emit.ts" --check 2>&1)" && CODIGO=0 || CODIGO=$?
echo "$SALIDA"

if [[ "$CODIGO" -ne 0 ]]; then
    cat >&2 <<'AVISO'

check-skill-artifacts: el SKILL.md difiere de su definición.

  El markdown de un skill de metodología NO es la fuente: lo emite el
  mecanismo. Si el cambio es intencional, edítalo en su definición
  TypeScript y regenera:

AVISO
    echo "      bun run $MECANISMO_REL/bin/emit.ts" >&2
    [[ "$ESTRICTO" -eq 1 ]] && exit 1
fi
exit 0
