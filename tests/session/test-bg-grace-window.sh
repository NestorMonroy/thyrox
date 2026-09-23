#!/usr/bin/env bash
# Suite del desprendimiento automatico de bg.sh — TDD: en HEAD fallan 3 de 5.
#
# El tercer desenlace de `start` ya existe: lanza desprendido, espera en primer
# plano, y si el trabajo sigue vivo DEVUELVE el control en vez de bloquear. Lo
# que esta mal es su parametro y el nombre que lo lleva:
#
#   1. el default es 120 s — cuatro veces la ventana en que un turno deja de
#      sentirse vivo, asi que en la practica el usuario ve dos minutos de
#      bloqueo y concluye, con razon, que el mecanismo no existe;
#   2. LA MISMA constante sirve dos fenomenos distintos — «cuando desprender»
#      y «cuanto esperar al recoger»—, que es el sub-patron A con un nombre
#      como sujeto: bajar el numero para el primero rompe el segundo;
#   3. no hay clave de entorno, asi que el consumidor no puede fijarlo (DEC-04).
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
BG="$RAIZ/src/session/bg.sh"
fallos=0
total=0
check() {
    total=$((total + 1))
    if [[ "$2" == "$3" ]]; then echo "OK   $1"
    else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos + 1)); fi
}

DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
# Los runs de la familia `jobs` —bg.sh crea su run-puntero aun con `--dir`— van
# al temporal: sin esto la suite dejaba `lento-*` y `corto-*` en el árbol.
export THYROX_JOBS_DIR="$DIR/jobs"

# 1 — POLITICA: el default vive en la ventana en que un turno sigue
# sintiendose vivo. 120 s no lo esta; el usuario lo midio por conducta.
# La ventana se le PREGUNTA al mecanismo, no se extrae del fuente: la
# constante es una expansion de parametro, y un `sed` sobre ella mide el
# significante. `bg.sh grace` publica el valor resuelto.
DEFAULT="$(bash "$BG" grace)"
if [[ "$DEFAULT" =~ ^[0-9]+$ ]] && (( DEFAULT >= 20 && DEFAULT <= 30 )); then
    EN_VENTANA=si
else
    EN_VENTANA="no ($DEFAULT s)"
fi
check "el grace por defecto cae en 20-30 s" "$EN_VENTANA" "si"

# 2 — CONDUCTA: con el grace configurado, `start` devuelve el control al
# vencer, no al terminar el trabajo. Se mide el reloj, no el docstring.
INICIO="$(date +%s)"
THYROX_BG_GRACE_SECONDS=2 bash "$BG" start lento --dir "$DIR" -- bash -c 'sleep 12' >/dev/null 2>&1
CODIGO=$?
TRANSCURRIDO=$(( $(date +%s) - INICIO ))
check "start devuelve al vencer el grace, no al terminar" \
    "$(( TRANSCURRIDO < 8 ? 1 : 0 ))" "1"
check "start senala el desprendimiento con su codigo propio" "$CODIGO" "125"

# 3 — LA CLAVE DE ENTORNO existe: sin ella el consumidor no puede fijar su
# ventana, y DEC-04 dice que ese parametro es suyo, no del proveedor.
check "la clave de entorno se declara en .env.example" \
    "$(grep -c '^THYROX_BG_GRACE_SECONDS=' "$RAIZ/.env.example" 2>/dev/null || echo 0)" "1"

# 4 — EL CONTROL QUE DISCRIMINA LA SEPARACION: `wait` sin segundos NO usa el
# grace. Con el grace en 2 y un trabajo de 6 s, si compartieran constante
# `wait` venceria a los 2 y no recogeria nada. Tiene que recogerlo.
bash "$BG" start corto --dir "$DIR" --grace 0 -- bash -c 'sleep 6; echo LISTO' >/dev/null 2>&1
SALIDA="$(THYROX_BG_GRACE_SECONDS=2 bash "$BG" wait corto --dir "$DIR" 2>&1)"
case "$SALIDA" in
    *LISTO*) RECOGIO=si ;;
    *) RECOGIO=no ;;
esac
check "wait sin segundos NO hereda el grace: recoge el trabajo" "$RECOGIO" "si"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
