#!/usr/bin/env bash
# Suite de `stranded-evidence.sh` — el motor del grifo de la tarea #910.
#
# Escrita ANTES del guion (TDD). Su control positivo es material REAL: los
# archivos que el triaje de #858 encontro de verdad en el directorio volatil
# de esta sesion, no un incumplidor fabricado por quien escribio el patron.
# Ese es el criterio que `hallazgo-abierto-genera-sucesor.md` fija tras haber
# publicado tres ceros falsos.
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
MOTOR="$RAIZ/src/session/stranded-evidence.sh"
ACIERTOS=0
FALLOS=0

afirmar() {
    local titulo="$1" esperado="$2" obtenido="$3"
    if [[ "$esperado" == "$obtenido" ]]; then
        ACIERTOS=$((ACIERTOS + 1))
        printf '  ok   %s\n' "$titulo"
    else
        FALLOS=$((FALLOS + 1))
        printf '  FALLO %s\n       esperado: %s\n       obtenido: %s\n' \
            "$titulo" "$esperado" "$obtenido"
    fi
}

# Cada caso monta su propio par (volatil, ledger) para no arrastrar estado.
montar() {
    VOLATIL=$(mktemp -d)
    LEDGER=$(mktemp -d)
    export EV_VOLATIL="$VOLATIL" EV_LEDGER="$LEDGER"
}

desmontar() { rm -rf "$VOLATIL" "$LEDGER"; }

echo "== stranded-evidence =="

# --- Caso 1: directorio volatil vacio -> silencio, exit 0 -------------------
montar
bash "$MOTOR" listar >/dev/null 2>&1
afirmar "1. volatil sin artefactos sale 0" "0" "$?"
desmontar

# --- Caso 2: un .py nuevo -> exit 1 y lo nombra ----------------------------
montar
printf 'print(1)\n' > "$VOLATIL/sonda.py"
SALIDA=$(bash "$MOTOR" listar 2>&1); CODIGO=$?
afirmar "2. un .py varado sale 1" "1" "$CODIGO"
afirmar "2b. y lo nombra" "si" "$(grep -q 'sonda.py' <<<"$SALIDA" && echo si || echo no)"
desmontar

# --- Caso 3: .txt y .log NO cuentan (son volcados, 285 destinos medidos) ---
montar
printf 'volcado\n' > "$VOLATIL/cadenas.txt"
printf 'linea\n'   > "$VOLATIL/build.log"
bash "$MOTOR" listar >/dev/null 2>&1
afirmar "3. .txt y .log no son artefactos varados" "0" "$?"
desmontar

# --- Caso 4: lo declarado descartable no vuelve a marcarse -----------------
montar
printf 'print(1)\n' > "$VOLATIL/efimera.py"
bash "$MOTOR" olvidar "$VOLATIL/efimera.py" >/dev/null 2>&1
bash "$MOTOR" listar >/dev/null 2>&1
afirmar "4. olvidar suelta el archivo" "0" "$?"
desmontar

# --- Caso 5: lo ya asentado no reincide ------------------------------------
montar
printf 'print(1)\n' > "$VOLATIL/vieja.py"
bash "$MOTOR" asentar >/dev/null 2>&1
bash "$MOTOR" listar >/dev/null 2>&1
afirmar "5. asentar calla lo ya triado" "0" "$?"
desmontar

# --- Caso 6: pero un artefacto NUEVO tras asentar SI se ve -----------------
montar
printf 'print(1)\n' > "$VOLATIL/vieja.py"
bash "$MOTOR" asentar >/dev/null 2>&1
sleep 1
printf 'print(2)\n' > "$VOLATIL/nueva.py"
SALIDA=$(bash "$MOTOR" listar 2>&1); CODIGO=$?
afirmar "6. tras asentar, uno nuevo sale 1" "1" "$CODIGO"
afirmar "6b. y es el nuevo, no el viejo" "si" \
    "$(grep -q 'nueva.py' <<<"$SALIDA" && ! grep -q 'vieja.py' <<<"$SALIDA" && echo si || echo no)"
desmontar

# --- Caso 7: sin directorio volatil, el gate NO afirma (exit 2) ------------
montar
rm -rf "$VOLATIL"
bash "$MOTOR" listar >/dev/null 2>&1
afirmar "7. sin volatil que medir sale 2" "2" "$?"
rm -rf "$LEDGER"

# --- Caso 8: el reporte publica su denominador -----------------------------
montar
printf 'print(1)\n' > "$VOLATIL/sonda.py"
printf 'volcado\n'  > "$VOLATIL/otro.txt"
SALIDA=$(bash "$MOTOR" listar 2>&1)
afirmar "8. el reporte declara su alcance" "si" \
    "$(grep -qi 'alcance medido' <<<"$SALIDA" && echo si || echo no)"
desmontar

# --- Caso 9: CONTROL POSITIVO REAL — el material de #858 -------------------
# El triaje de #858 encontro 28 sondas .py unicas en el directorio volatil de
# esta sesion. Su censo esta versionado; se toma UN nombre real de ahi y se
# comprueba que el patron lo ve. Un incumplidor fabricado por quien escribio
# el patron heredaria su encuadre y confirmaria el instrumento.
CENSO=$(ls -d "$RAIZ"/.claude/eventos/triaje-artefactos-varados-*/censo.tsv 2>/dev/null | head -1)
if [[ -n "$CENSO" && -f "$CENSO" ]]; then
    REAL=$(awk -F'\t' 'NR>1 && $1 ~ /\.py$/ {n=split($1,p,"/"); print p[n]; exit}' "$CENSO")
    montar
    if [[ -n "$REAL" ]]; then
        printf 'import sys\n' > "$VOLATIL/$REAL"
        SALIDA=$(bash "$MOTOR" listar 2>&1); CODIGO=$?
        afirmar "9. ve un nombre REAL del censo de #858 ($REAL)" "1" "$CODIGO"
    else
        afirmar "9. el censo de #858 aporta un nombre .py" "si" "no"
    fi
    desmontar
else
    afirmar "9. existe el censo de #858 como control positivo" "si" "no"
fi

echo ""
echo "aciertos: $ACIERTOS · fallos: $FALLOS"
[[ "$FALLOS" -eq 0 ]] || exit 1
