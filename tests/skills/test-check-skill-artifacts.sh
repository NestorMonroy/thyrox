#!/usr/bin/env bash
# Suite de check-skill-artifacts.sh — mismo patrón que
# tests/legacy/test-agent-artifacts.sh, con las rutas VIGENTES de este árbol
# (src/skills, no .claude/packages) — ese archivo legacy cita rutas del
# THYROX anterior, que ya no existen aquí.
#
# Lo que mide: que el gate RECONOZCA su superficie y que discrimine sin y
# con diferencia real (sub-patrón D de metrica-decide-la-conclusion.md — un
# verde que no puede fallar no es un control).
set -uo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$RAIZ/src/skills/gates/check-skill-artifacts.sh"
fallos=0
total=0

check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then
        echo "OK   $1"
    else
        echo "FALLA $1 — esperado '$3', obtenido '$2'"
        fallos=$((fallos + 1))
    fi
}

# CONTROL POSITIVO — ruta ABSOLUTA de la superficie del mecanismo.
SALIDA="$(bash "$GATE" "$RAIZ/src/skills/emit/markdown.ts" 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta absoluta del mecanismo: el gate MIDE" "$VEREDICTO" "medido"

# Ídem para la otra mitad de la superficie: el SKILL.md derivado.
SALIDA="$(bash "$GATE" "$RAIZ/.claude/skills/ba-elicitation/SKILL.md" 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta absoluta del SKILL.md derivado: el gate MIDE" "$VEREDICTO" "medido"

# La forma relativa tiene que seguir funcionando: es la de la línea de comandos.
SALIDA="$(cd "$RAIZ" && bash "$GATE" src/skills/emit/markdown.ts 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "ruta relativa del mecanismo: el gate MIDE" "$VEREDICTO" "medido"

# CONTROL NEGATIVO — un archivo FUERA de la superficie sí se exime. Sin este
# caso, un gate que midiera siempre también pasaría los tres de arriba.
SALIDA="$(cd "$RAIZ" && bash "$GATE" README.md 2>&1)"
case "$SALIDA" in
    *"sin cambios en la superficie"*) VEREDICTO=eximido ;;
    *) VEREDICTO=medido ;;
esac
check "archivo fuera de la superficie: el gate SE EXIME" "$VEREDICTO" "eximido"

# El repo real, sin cambios pendientes de emitir: el gate mide y da 0
# diferencias, exit 0.
SALIDA="$(cd "$RAIZ" && bash "$GATE" --strict src/skills/emit/markdown.ts 2>&1)"
CODIGO=$?
check "árbol limpio: exit 0" "$CODIGO" "0"
case "$SALIDA" in
    *"0 con diferencia"*) TIENE_CIFRA=si ;;
    *) TIENE_CIFRA=no ;;
esac
check "publica su denominador (N definición(es); M con diferencia)" "$TIENE_CIFRA" "si"

# CONTROL DE ANULACIÓN — se fuerza una divergencia real (se toca un
# SKILL.md derivado) y --strict tiene que fallar con exit 1. Se restaura por
# COPIA DE ARCHIVO, nunca por `$(cat …)`: la sustitución de comandos recorta
# el salto de línea final, y restaurar así deja el archivo con un byte
# menos — se probó, y así se detectó el defecto (ver el análisis del pase).
OBJETIVO="$RAIZ/.claude/skills/ba-elicitation/SKILL.md"
RESPALDO="$(mktemp)"
trap 'rm -f "$RESPALDO"' EXIT
cp "$OBJETIVO" "$RESPALDO"
printf 'línea ajena, no emitida por el mecanismo\n' >> "$OBJETIVO"
SALIDA="$(cd "$RAIZ" && bash "$GATE" --strict "$OBJETIVO" 2>&1)"
CODIGO=$?
cp "$RESPALDO" "$OBJETIVO"
check "divergencia forzada + --strict: exit 1" "$CODIGO" "1"
check "restaurado byte a byte tras la anulación (md5sum)" \
    "$(md5sum < "$OBJETIVO")" "$(md5sum < "$RESPALDO")"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
