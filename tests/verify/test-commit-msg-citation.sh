#!/usr/bin/env bash
# Suite del envoltorio de consumidor para el gate de resolucion de cita.
#
# Es la mitad ROJA escrita ANTES de `src/verify/commit-msg-citation.sh`: mientras
# no exista, el caso 1 falla y ese fallo se persiste en el banco.
#
# QUE MIDE, Y POR QUE ESA FORMA Y NO OTRA
# ----------------------------------------
# El gate (`citation_resolution.py`) sale 0/1/2. Los cinco `.githooks/commit-msg`
# de los consumidores declaran `set -euo pipefail` y cierran con `exit "$EXIT"`:
# un 1 los aborta ANTES de su propio veredicto Tim Pope, asi que el aviso de
# deuda heredada haria caer un commit por una razon que no es la suya.
#
# De ahi el contrato del envoltorio: **sale 0 o 2, nunca 1**. El aviso viaja por
# stderr y el codigo dice «sigue». La graduacion —cuando el historial sostenga 0
# sin resolver— es sacar el `1` de su cubo, UNA linea en UN archivo, y los cinco
# stubs no se tocan.
#
# EL CASO QUE MAS PESA es el 3: un mensaje SIN citas sale 0 y en silencio. Es el
# camino comun, y un gate ruidoso en el commit corriente se aprende a saltar con
# `--no-verify` — que es como una regla se vuelve ruido que nadie obedece.
set -uo pipefail
_thyrox_root="${THYROX_ROOT:-}"
if [[ -z "$_thyrox_root" ]]; then
    _thyrox_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    while [[ "$_thyrox_root" != "/" && ! -f "$_thyrox_root/src/paths/reach.py" ]]; do
        _thyrox_root="$(dirname "$_thyrox_root")"
    done
fi
cd "$_thyrox_root" || exit 2
# Se ejercita la PUERTA (`bin/`), no la definicion (`src/`): es la que un
# consumidor invoca, y la unica que resuelve el interprete del proveedor.
SUT="bin/commit-msg-citation"

OK=0; FALLO=0
check() {
    if [[ "$2" == "$3" ]]; then printf '  ok    %s\n' "$1"; OK=$((OK+1))
    else printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; FALLO=$((FALLO+1)); fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# La cita que resuelve se DERIVA del store, no se transcribe: una cita literal
# aqui caduca el dia que alguien limpie esa fila, y el caso pasaria a medir la
# limpieza en vez del envoltorio.
# Se le da al gate los mensajes recientes y se toma una de las que EL declara
# resueltas: la derivacion usa la misma puerta que el sujeto, no una segunda
# lectura del store que pueda divergir de la suya.
git log --format=%B -30 > "$WORK/historial.txt"
VIVA="$(bash bin/citation_resolution "$WORK/historial.txt" 2>/dev/null \
    | grep -oE '^  (TASK-[A-Z]+-[0-9]{4}) ->' | grep -oE 'TASK-[A-Z]+-[0-9]{4}' | head -1)"
if [[ -z "$VIVA" ]]; then
    echo "SIN MEDIR: el store no dio ninguna cita viva de la que derivar el caso" >&2
    exit 2
fi

echo "== 1. la cita que resuelve: exit 0 =="
printf 'Asunto\n\nRefs: %s\n' "$VIVA" > "$WORK/ok.txt"
SALIDA="$(bash "$SUT" "$WORK/ok.txt" 2>&1)"; CODIGO=$?
check "exit 0" 0 "$CODIGO"

echo "== 2. la cita ROTA avisa y NO bloquea: exit 0 con WARN =="
# El control positivo es la cita REAL del commit 4acece94, no una fabricada.
printf 'Asunto\n\nRefs: TASK-THYROX-0445\n' > "$WORK/roto.txt"
SALIDA="$(bash "$SUT" "$WORK/roto.txt" 2>&1)"; CODIGO=$?
check "exit 0 — un 1 abortaria el hook del consumidor bajo set -e" 0 "$CODIGO"
check "pero AVISA" 1 "$(grep -c 'cita-sin-resolver' <<<"$SALIDA")"
check "y la nombra" 1 "$(grep -c 'TASK-THYROX-0445' <<<"$SALIDA")"

echo "== 3. sin citas: exit 0 y EN SILENCIO (el camino comun) =="
printf 'Asunto sin ninguna cita\n\nCuerpo llano.\n' > "$WORK/mudo.txt"
SALIDA="$(bash "$SUT" "$WORK/mudo.txt" 2>&1)"; CODIGO=$?
check "exit 0" 0 "$CODIGO"
check "sin una sola linea de salida" "" "$SALIDA"

echo "== 4. el gate ausente REHUSA sin emitir veredicto =="
# Se copia el envoltorio a un arbol con FORMA de thyrox pero SIN bin/, que es la
# unica manera de ejercitar su refusal: `THYROX_ROOT` no sirve para forzarla
# porque `bin/` lo pisa desde su propia ubicacion (medido, ver la cabecera del
# sujeto). Un 0 aqui lo leeria el hook llamador como permiso.
mkdir -p "$WORK/falso/src/verify" "$WORK/falso/bin"
cp "$_thyrox_root/src/verify/commit-msg-citation.sh" "$WORK/falso/src/verify/"
SALIDA="$(bash "$WORK/falso/src/verify/commit-msg-citation.sh" "$WORK/ok.txt" 2>&1)"; CODIGO=$?
check "exit 2" 2 "$CODIGO"
check "NO emite conteo" 0 "$(grep -c 'alcance medido' <<<"$SALIDA")"
# La guarda no gana el CODIGO —el cubo catch-all ya saldria 2— sino el MENSAJE.
# Sin ella el llamador recibe el ruido de bash, que no dice como arreglarlo.
check "nombra DONDE busco" 1 "$(grep -cq 'buscado en' <<<"$SALIDA" && echo 1 || echo 0)"
check "y COMO generarlo" 1 "$(grep -cq 'generate_bin' <<<"$SALIDA" && echo 1 || echo 0)"

echo "== 5. el mensaje ilegible tambien REHUSA =="
SALIDA="$(bash "$SUT" "$WORK/no-existe.txt" 2>&1)"; CODIGO=$?
check "exit 2 ante un mensaje que no se puede leer" 2 "$CODIGO"
# Idem: sin el guard el gate rehusa igual, pero el aviso no nombra al envoltorio
# y quien lo lee no sabe cual de los dos escalones fallo.
SIN_ARG="$(bash "$SUT" 2>&1)"
check "sin argumento, el envoltorio se nombra a si mismo" 1 \
    "$(grep -cq 'commit-msg-citation REHUSADO' <<<"$SIN_ARG" && echo 1 || echo 0)"

echo "== 6. NO escribe: el envoltorio mide, no muta =="
ANTES="$(md5sum "$WORK/ok.txt" | cut -d' ' -f1)"
bash "$SUT" "$WORK/ok.txt" >/dev/null 2>&1
check "el mensaje queda intacto" "$ANTES" "$(md5sum "$WORK/ok.txt" | cut -d' ' -f1)"

printf '\nresultado: %d de %d aserciones en verde\n' "$OK" "$((OK+FALLO))"
[[ $FALLO -eq 0 ]]
