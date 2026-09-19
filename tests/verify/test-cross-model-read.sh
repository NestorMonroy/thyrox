#!/usr/bin/env bash
# Suite de check-cross-model-read.sh — TDD: el caso 1 falla en HEAD.
#
# Este gate no tenia suite. Su precondicion exigia `node_modules` BAJO el
# paquete, y el workspace iza a la raiz: rehusaba con exit 2 sobre cada
# archivo real de su superficie, con el arbol correcto. Sin suite, nada lo
# media — y el rechazo solo se vio cuando bloqueo un commit.
set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/${THYROX_LOCATOR:-src/paths/reach.py}" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
source "$_thyrox_root/${THYROX_LIB_REACH:-src/lib/reach.sh}"
RAIZ="$(thyrox_root)" || exit 2
GATE="$RAIZ/src/verify/check-cross-model-read.sh"
fallos=0
total=0

# La superficie se extrae del gate, no se transcribe: asi la suite sobrevive
# a la proxima mudanza del paquete.
PAQUETE_REL="$(sed -n 's/^PAQUETE_REL="\([^"]*\)"/\1/p' "$GATE" | head -1)"
AGENTES_REL="$(sed -n 's/^AGENTES_REL="\([^"]*\)"/\1/p' "$GATE" | head -1)"
if [[ -z "$PAQUETE_REL" || -z "$AGENTES_REL" ]]; then
    echo "SIN MEDIR: no pude extraer la superficie de $GATE" >&2
    exit 2
fi
ARCHIVO_PAQUETE="$(find "$RAIZ/$PAQUETE_REL" -maxdepth 1 -name '*.ts' | sort | head -1)"
if [[ -z "$ARCHIVO_PAQUETE" ]]; then
    echo "SIN MEDIR: la superficie declarada no tiene archivos que medir" >&2
    exit 2
fi

# TRES estados, no dos: `eximido` (fuera de la superficie), `rehuso` (exit 2,
# sin cifra) y `medido`. Colapsar los dos ultimos publica PASS sobre una
# medicion que nunca ocurrio — el contrato de check_veredicto_de_gate.py.
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

# CONTROL POSITIVO — un archivo REAL de la superficie: el gate tiene que MEDIR.
SALIDA="$(cd "$RAIZ" && bash "$GATE" "$ARCHIVO_PAQUETE" 2>&1)"; CODIGO=$?
check "archivo real del paquete: el gate MIDE" "$(veredicto "$SALIDA" "$CODIGO")" "medido"

# CONTROL NEGATIVO — fuera de la superficie se exime. Sin el, un gate que
# midiera siempre pasaria tambien el caso de arriba.
SALIDA="$(cd "$RAIZ" && bash "$GATE" README.md 2>&1)"; CODIGO=$?
check "archivo fuera de la superficie: el gate SE EXIME" \
    "$(veredicto "$SALIDA" "$CODIGO")" "eximido"

# GUARD DE PRECONDICION — sin node_modules en NINGUN punto de la cadena de
# resolucion, rehusa con exit 2 y lo nombra. Se fuerza con una copia AISLADA
# y vacia, nunca con el paquete real, para que el guard se ejercite de verdad.
PKG_AISLADO="$(mktemp -d)"
trap 'rm -rf "$PKG_AISLADO"' EXIT
SALIDA="$(cd "$RAIZ" && CHECK_CROSS_MODEL_READ_PKG_DIR="$PKG_AISLADO" \
    bash "$GATE" "${ARCHIVO_PAQUETE#"$RAIZ"/}" 2>&1)"; CODIGO=$?
check "guard sin node_modules en la cadena: exit 2" "$CODIGO" "2"
case "$SALIDA" in
    *"node_modules"*) NOMBRA=si ;;
    *) NOMBRA=no ;;
esac
check "guard sin node_modules: nombra lo que falta" "$NOMBRA" "si"

# SUSTITUCION VIVA EN UN MENSAJE DE ERROR — un backtick sin escapar dentro de
# comillas dobles ES sustitucion de comando, y la rama de error de un guard
# casi nunca se ejercita: el comando quedaria latente hasta el dia que el
# guard dispare. Es la clase de H-THYROX-137 (un heredoc sin comillas ejecuto
# su propia prosa), aqui con el `echo` de un gate como sujeto. CONTROL REAL:
# esta linea existio en este archivo y se corrigio en el mismo pase.
VIVAS="$(grep -c '^[^#]*echo "[^"]*[^\\]`' "$GATE" || true)"
check "ningun echo del gate lleva sustitucion viva" "$VIVAS" "0"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
