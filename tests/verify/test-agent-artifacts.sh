#!/usr/bin/env bash
# Suite de check-agent-artifacts.sh — TDD: el caso 1 falla en HEAD.
#
# Lo que mide: que el gate RECONOZCA su superficie. Un gate que se declara
# «sin cambios» ante un archivo del paquete no discrimina — su verde no
# distingue «el .md coincide» de «no miré nada» (sub-patrón D de
# metrica-decide-la-conclusion.md).
set -uo pipefail
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
RAIZ="$(thyrox_root)" || exit 2
GATE="$RAIZ/src/verify/check-agent-artifacts.sh"
fallos=0
total=0

# La SUPERFICIE se extrae del gate, no se transcribe. Citaba
# `.claude/packages/agent` y `.claude/agents`, que es donde vivian antes de la
# mudanza a `src/`: los tres controles positivos apuntaban FUERA de la
# superficie, asi que el gate se eximia con razon y el caso leia esa exencion
# como defecto. Preguntandole al gate por sus dos raices, la suite sobrevive a
# la proxima mudanza.
PAQUETE_REL="$(sed -n 's/^PAQUETE_REL="\([^"]*\)"/\1/p' "$GATE" | head -1)"
AGENTES_REL="$(sed -n 's/^AGENTES_REL="\([^"]*\)"/\1/p' "$GATE" | head -1)"
if [[ -z "$PAQUETE_REL" || -z "$AGENTES_REL" ]]; then
    echo "SIN MEDIR: no pude extraer la superficie de $GATE" >&2
    echo "  PAQUETE_REL='$PAQUETE_REL' AGENTES_REL='$AGENTES_REL'" >&2
    exit 2
fi
# Un archivo REAL de cada mitad: un nombre inventado no distinguiria «fuera de
# la superficie» de «no existe».
ARCHIVO_PAQUETE="$(find "$RAIZ/$PAQUETE_REL" -maxdepth 1 -name '*.ts' | sort | head -1)"
ARCHIVO_AGENTE="$(find "$RAIZ/$AGENTES_REL" -maxdepth 1 -name '*.md' | sort | head -1)"
if [[ -z "$ARCHIVO_PAQUETE" || -z "$ARCHIVO_AGENTE" ]]; then
    echo "SIN MEDIR: la superficie declarada no tiene archivos que medir" >&2
    exit 2
fi

# Un veredicto de gate tiene TRES estados, no dos: `eximido` (fuera de la
# superficie), `rehuso` (no pudo medir — exit 2, sin conteo) y `medido`.
# Colapsar los dos ultimos es el sub-patron D de metrica-decide-la-conclusion
# con esta misma suite como sujeto: hasta hoy el `case` solo buscaba la cadena
# de exencion, asi que un ERROR con exit 2 caia en la rama por defecto y se
# publicaba como «MIDE». Medido: el gate rehusaba sobre CADA archivo real del
# paquete y la suite daba 6 de 6.
veredicto() {  # $1 = salida combinada, $2 = codigo de salida
    case "$1" in
        *"sin cambios en la superficie"*) echo eximido; return ;;
    esac
    if [[ "$2" -eq 2 ]]; then echo rehuso; return; fi
    echo medido
}

check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then
        echo "OK   $1"
    else
        echo "FALLA $1 — esperado '$3', obtenido '$2'"
        fallos=$((fallos + 1))
    fi
}

# CONTROL POSITIVO — ruta ABSOLUTA de la superficie, que es la forma en que el
# pre-commit entrega sus archivos. El gate tiene que medir, no eximirse.
SALIDA="$(bash "$GATE" "$ARCHIVO_PAQUETE" 2>&1)"; CODIGO=$?
VEREDICTO="$(veredicto "$SALIDA" "$CODIGO")"
check "ruta absoluta del paquete: el gate MIDE" "$VEREDICTO" "medido"

# Ídem para la otra mitad de la superficie: el .md derivado.
SALIDA="$(bash "$GATE" "$ARCHIVO_AGENTE" 2>&1)"; CODIGO=$?
VEREDICTO="$(veredicto "$SALIDA" "$CODIGO")"
check "ruta absoluta del .md derivado: el gate MIDE" "$VEREDICTO" "medido"

# La forma relativa tiene que seguir funcionando: es la de la línea de comandos.
SALIDA="$(cd "$RAIZ" && bash "$GATE" "${ARCHIVO_PAQUETE#"$RAIZ"/}" 2>&1)"; CODIGO=$?
VEREDICTO="$(veredicto "$SALIDA" "$CODIGO")"
check "ruta relativa del paquete: el gate MIDE" "$VEREDICTO" "medido"

# CONTROL NEGATIVO — un archivo FUERA de la superficie sí se exime. Sin este
# caso, un gate que midiera siempre también pasaría los tres de arriba.
SALIDA="$(cd "$RAIZ" && bash "$GATE" README.md 2>&1)"; CODIGO=$?
VEREDICTO="$(veredicto "$SALIDA" "$CODIGO")"
check "archivo fuera de la superficie: el gate SE EXIME" "$VEREDICTO" "eximido"

# GUARD DE PRECONDICIÓN, mitad 1 — sin node_modules/zod en NINGÚN punto de la
# cadena de resolución, el gate rehúsa con exit 2 y nombra la biblioteca y el
# comando que la instala, en vez de dejar que el --check corra sobre el
# auto-install ambiguo del runtime de Bun. Control que PUEDE fallar: se fuerza
# con una copia AISLADA y vacía, nunca con el paquete real — así el guard se
# ejercita de verdad. Su premisa es que no hay `node_modules/zod` en /tmp ni
# en la raíz del sistema; medido al escribirlo.
PKG_SIN_NODE_MODULES="$(mktemp -d)"
trap 'rm -rf "$PKG_SIN_NODE_MODULES" "${PKG_ZOD_DISTINTA:-}"' EXIT
SALIDA="$(cd "$RAIZ" && CHECK_AGENT_ARTIFACTS_PKG_DIR="$PKG_SIN_NODE_MODULES" \
    bash "$GATE" --strict "${ARCHIVO_PAQUETE#"$RAIZ"/}" 2>&1)"
CODIGO=$?
check "guard sin node_modules/zod: exit 2" "$CODIGO" "2"
case "$SALIDA" in
    *"node_modules/zod"*"bun install --frozen-lockfile"*) NOMBRA=si ;;
    *) NOMBRA=no ;;
esac
check "guard sin node_modules/zod: nombra la biblioteca y el comando" "$NOMBRA" "si"

# GUARD DE PRECONDICIÓN, mitad 2 — la que discrimina lo que la mitad 1 NO
# puede ver. Que EXISTA una zod en la cadena sólo prueba que Node hallará
# alguna; no prueba que sea la que el lockfile fija, que es la propiedad de la
# que depende la reproducibilidad del --check. Sin este caso, un gate que sólo
# comprobara existencia pasaría igual que uno que compara versiones.
#
# SINTÉTICO, y con su razón: no hay en el árbol ningún punto de resolución con
# una zod distinta de la fijada —justamente porque el árbol está bien—, así que
# el control positivo se fabrica. La versión fijada NO se transcribe: se lee
# del mismo lockfile que el gate consulta.
ZOD_FIJADA_ESPERADA="$(sed -n 's/^[[:space:]]*"zod": \["zod@\([^"]*\)".*/\1/p' \
    "$RAIZ/bun.lock" | head -1)"
if [[ -z "$ZOD_FIJADA_ESPERADA" ]]; then
    echo "SIN MEDIR: $RAIZ/bun.lock no fija ninguna resolución de zod" >&2
    exit 2
fi
PKG_ZOD_DISTINTA="$(mktemp -d)"
mkdir -p "$PKG_ZOD_DISTINTA/node_modules/zod" "$PKG_ZOD_DISTINTA/pkg"
printf '{"name":"zod","version":"9.9.9"}\n' \
    > "$PKG_ZOD_DISTINTA/node_modules/zod/package.json"
SALIDA="$(cd "$RAIZ" && CHECK_AGENT_ARTIFACTS_PKG_DIR="$PKG_ZOD_DISTINTA/pkg" \
    bash "$GATE" --strict "${ARCHIVO_PAQUETE#"$RAIZ"/}" 2>&1)"
CODIGO=$?
check "guard con zod distinta de la fijada: exit 2" "$CODIGO" "2"
case "$SALIDA" in
    *"9.9.9"*"$ZOD_FIJADA_ESPERADA"*) NOMBRA=si ;;
    *) NOMBRA=no ;;
esac
check "guard con zod distinta: nombra la instalada y la fijada" "$NOMBRA" "si"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
