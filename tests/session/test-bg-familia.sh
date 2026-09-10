#!/usr/bin/env bash
# =============================================================================
# test-bg-familia.sh — bg.sh nace en un run, no en un cajón plano
# =============================================================================
# El control que DISCRIMINA es el caso 3: dos ejecuciones del mismo nombre. La
# forma plana escribe `<BG_DIR>/<nombre>.log` y la segunda pisa a la primera —
# medido: cinco trabajos de una sesión dejaron cinco `.log` sueltos y las
# repeticiones se perdieron. La familia les da un run cada una y conviven.
#
# Un caso que sólo comprobara «el log existe» pasaría igual con las dos formas:
# no distinguiría el mecanismo de su ausencia.
# =============================================================================
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
BG=src/session/bg.sh
ok=0; fallo=0
_es() { if [[ "$2" == "$3" ]]; then echo "  ok    $1"; ok=$((ok+1));
        else echo "  FALLA $1 — esperado [$3] obtenido [$2]"; fallo=$((fallo+1)); fi; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
export THYROX_JOBS_DIR="$TMP/jobs"

echo "== 1. la familia: el log nace DENTRO del run =="
unset BG_DIR
salida="$($BG start uno -- bash -c 'exit 5')"
run="$(sed -n 's/^RUN=//p' <<<"$salida")"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
_es "start publica su RUN" "$([[ -n "$run" ]] && echo si || echo no)" "si"
_es "el log vive en outputs/ del run" "$(dirname "$log")" "$run/outputs"

echo "== 2. el manifiesto declara el instrumento y OMITE lo que no consta =="
sleep 1; $BG status uno >/dev/null
man="$run/manifest.json"
_es "declara instrument" "$(python3 -c "import json;print('si' if 'instrument' in json.load(open('$man')) else 'no')")" "si"
_es "asienta el exit_code" "$(python3 -c "import json;print(json.load(open('$man')).get('exit_code'))")" "5"
_es "OMITE question (un run sin recoger no es conforme)" \
   "$(python3 -c "import json;print('si' if 'question' in json.load(open('$man')) else 'no')")" "no"

echo "== 3. EL QUE DISCRIMINA: dos ejecuciones del mismo nombre =="
$BG start uno -- bash -c 'exit 0' >/dev/null; sleep 1; $BG status uno >/dev/null
_es "la familia conserva las DOS" "$(ls -d "$THYROX_JOBS_DIR"/uno-* | wc -l | tr -d ' ')" "2"
_es "y el primer run conserva su 5" \
   "$(python3 -c "import json;print(json.load(open('$man')).get('exit_code'))")" "5"

echo "== 4. CONTROL de retrocompatibilidad: BG_DIR declarado gana =="
plano="$TMP/plano"
BG_DIR="$plano" $BG start dos -- bash -c 'exit 3' >/dev/null; sleep 1
_es "forma plana intacta" "$(BG_DIR="$plano" $BG status dos)" "done:3"
_es "y su log es el plano de siempre" "$(basename "$(BG_DIR="$plano" $BG log dos)")" "dos.log"

echo "== 5. CONTROL de anulacion del descuento: sin BG_DIR NO cae al plano =="
_es "el hogar de la familia manda" \
   "$([[ -d "$THYROX_JOBS_DIR" ]] && echo si || echo no)" "si"

echo
echo "aserciones: $((ok+fallo))  ok: $ok  fallo: $fallo"
[[ $fallo -eq 0 ]]
