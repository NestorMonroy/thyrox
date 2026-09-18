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

# El LECTOR COMPARTIDO, no un `json.load` por fixture. Resuelve el nombre del
# archivo y despacha por sufijo; un lector propio aquí es una segunda fuente de
# verdad sobre qué es un manifiesto, y sólo una de las dos se entera el día que
# la forma cambia. Medido: al pasar el manifiesto a JSONL, los cinco fixtures
# que abrían `manifest.json` a mano quedaron rojos de golpe.
_manifest_value() {   # <run-dir> <clave>  ->  el valor, o `sin-clave`
  PYTHONPATH=src python3 -c "
import sys
from session.job_runs import read_manifest
print(read_manifest(sys.argv[1]).get(sys.argv[2], 'sin-clave'))" "$1" "$2"
}

echo "== 1. la familia: el log nace DENTRO del run =="
unset BG_DIR
salida="$($BG start uno -- bash -c 'exit 5')"
run="$(sed -n 's/^RUN=//p' <<<"$salida")"
log="$(sed -n 's/^LOG=//p' <<<"$salida")"
_es "start publica su RUN" "$([[ -n "$run" ]] && echo si || echo no)" "si"
_es "el log vive en outputs/ del run" "$(dirname "$log")" "$run/outputs"

echo "== 2. el manifiesto declara el instrumento y OMITE lo que no consta =="
sleep 1; $BG status uno >/dev/null
_es "declara instrument" \
   "$([[ "$(_manifest_value "$run" instrument)" != "sin-clave" ]] && echo si || echo no)" "si"
_es "asienta el exit_code" "$(_manifest_value "$run" exit_code)" "5"
_es "OMITE question (un run sin recoger no es conforme)" \
   "$([[ "$(_manifest_value "$run" question)" != "sin-clave" ]] && echo si || echo no)" "no"

echo "== 3. EL QUE DISCRIMINA: dos ejecuciones del mismo nombre =="
$BG start uno -- bash -c 'exit 0' >/dev/null; sleep 1; $BG status uno >/dev/null
_es "la familia conserva las DOS" "$(ls -d "$THYROX_JOBS_DIR"/uno-* | wc -l | tr -d ' ')" "2"
_es "y el primer run conserva su 5" "$(_manifest_value "$run" exit_code)" "5"

echo "== 4. CONTROL de retrocompatibilidad: BG_DIR declarado gana =="
plano="$TMP/plano"
BG_DIR="$plano" $BG start dos -- bash -c 'exit 3' >/dev/null; sleep 1
_es "forma plana intacta" "$(BG_DIR="$plano" $BG status dos)" "done:3"
_es "y su log es el plano de siempre" "$(basename "$(BG_DIR="$plano" $BG log dos)")" "dos.log"

echo "== 4-bis. CONTROL de anulacion del descuento: sin BG_DIR NO cae al plano =="
_es "el hogar de la familia manda" \
   "$([[ -d "$THYROX_JOBS_DIR" ]] && echo si || echo no)" "si"

echo "== 4-ter. --dir RELATIVO se compone bajo el hogar declarado del clon =="
# EL QUE DISCRIMINA de esta tanda. `BG_DIR` no es el hogar de nada: es un
# argumento POR INVOCACION —`build-logs/<slug>`— y el slug cambia cada vez. El
# HOGAR bajo el que ese slug cuelga si es del consumidor, y ahora tiene
# constante. Sin la resolucion, un `--dir` relativo aterrizaba contra el CWD:
# el defecto home-by-cwd de #284/#286 con los logs como sujeto.
#
# Que lo haria fallar: retirar `_resolve_flat_home` de `_paths`. Entonces el
# log nace en `<cwd>/un-slug/tres.log` y este caso cae; el 4 sobrevive, porque
# una ruta absoluta vuelve igual de la resolucion.
unset BG_DIR
export THYROX_BACKGROUND_LOG_DIR="$TMP/hogar-plano"
$BG start tres --dir un-slug -- bash -c 'exit 4' >/dev/null; sleep 1
# `--dir` es bandera de `start`; para leer, la grafia heredada `BG_DIR` sigue
# siendo la via, y pasa por la MISMA resolucion — que es lo que este par mide.
_es "el log cuelga del hogar declarado" \
   "$(BG_DIR=un-slug $BG log tres)" "$TMP/hogar-plano/un-slug/tres.log"
_es "y el archivo esta AHI, no bajo el cwd" \
   "$([[ -f "$TMP/hogar-plano/un-slug/tres.log" ]] && echo si || echo no)" "si"
_es "y su veredicto se lee desde ahi" "$(BG_DIR=un-slug $BG status tres)" "done:4"
unset THYROX_BACKGROUND_LOG_DIR
unset BG_DIR


echo "== 4-quater. EL LECTOR no tiene que re-declarar el hogar que start ya sabia =="
# EL QUE DISCRIMINA de TASK-THYROX-0052. El caso 4-ter de arriba pasa `BG_DIR`
# a CADA lectura — eso no es la forma de uso, es el rodeo al defecto. Medido por
# conducta antes de tocar nada: tras `start --dir D`, un `status` sin `BG_DIR`
# respondia `unknown` y un `log` devolvia la cadena vacia. `unknown` es el
# estado que el propio codigo documenta como «lo mataron o el log se perdio»:
# un veredicto FALSO sobre un trabajo que termino bien, no un error.
#
# Que lo haria fallar: retirar la clave `flat_home` del manifiesto en
# `cmd_start`, o su lectura en `_paths`. El 4-ter sobrevive a las dos, porque
# declara `BG_DIR` explicitamente — y ese contraste es la prueba de que el
# puntero carga su peso.
unset BG_DIR
export THYROX_BACKGROUND_LOG_DIR="$TMP/hogar-plano"
$BG start cuatro --dir otro-slug -- bash -c 'exit 9' >/dev/null; sleep 1
_es "log resuelve SIN BG_DIR" \
   "$($BG log cuatro)" "$TMP/hogar-plano/otro-slug/cuatro.log"
_es "status resuelve SIN BG_DIR" "$($BG status cuatro)" "done:9"
_es "register resuelve SIN BG_DIR" \
   "$($BG register cuatro >/dev/null 2>&1 && echo si || echo no)" "si"
# Y el manifiesto del run asienta el codigo tambien para la forma plana: hoy
# `settle` no disparaba nunca ahi, porque no habia run que asentar.
_es "el run del trabajo plano asienta su exit_code" \
   "$(PYTHONPATH=src python3 -c "
import glob, sys
from session.job_runs import read_manifest
runs = sorted(glob.glob(sys.argv[1] + '/cuatro-*'))
print(read_manifest(runs[-1]).get('exit_code') if runs else 'sin-run')" "$THYROX_JOBS_DIR")" "9"
unset THYROX_BACKGROUND_LOG_DIR


echo "== 4-quinquies. `status` SEPARA «no existe» de «murio sin marcador» =="
# El sub-patron D aplicado al veredicto de `status`: un `unknown` que cubre los
# dos casos manda a buscar un log que nunca existio. `wait` ya rehusaba con
# exit 2 ante un nombre desconocido; `status` lo publicaba como si hubiera
# medido. El caso 4 de arriba sigue siendo el control de que un trabajo REAL
# sin marcador sigue dando `unknown` — la distincion es «no hay tarea», no
# «no hay marcador».
unset BG_DIR
_es "un nombre que nunca se lanzo REHUSA, no publica unknown" \
    "$($BG status jamas-lanzado 2>/dev/null || echo "rehuso:$?")" "rehuso:2"
_es "y lo dice por stderr, nombrando la tarea" \
    "$($BG status jamas-lanzado 2>&1 >/dev/null | grep -c "jamas-lanzado")" "1"

echo "== 5. la democion: start no obliga a saber de antemano si es largo =="
# La referencia (2.1.266) declara `ggo=120000` como default de
# BASH_DEFAULT_TIMEOUT_MS y `hgo=600000` como maximo: el comando corre en
# primer plano hasta la gracia y, si no termina, SIGUE y el control vuelve.
# `bg.sh wait` tenia dos desenlaces (asentado / 124 a los 1800 s) y le faltaba
# el tercero. Sin el, el llamador tiene que decidir ANTES si el comando es
# largo — y esa decision es justo lo que no puede tomar.
unset BG_DIR

# 5a. corto: cabe en la gracia, se comporta como correr el comando directo
salida="$($BG start corto --grace 10 -- bash -c 'exit 7')"; rc=$?
_es "un trabajo corto devuelve SU codigo de salida" "$rc" "7"
_es "un trabajo corto NO se anuncia como demotido" \
    "$(grep -c 'SEGUNDO PLANO' <<<"$salida")" "0"

# 5b. largo: excede la gracia, el control vuelve y el trabajo sigue vivo
# `2>&1`: el aviso de democion va a stderr, igual que el de timeout de `wait` —
# es un diagnostico sobre la llamada, no la salida del trabajo. Capturar ambos
# NO debilita la asercion: antes del arreglo no habia mensaje en NINGUNO de los
# dos flujos, asi que el caso discrimina igual.
salida="$($BG start largo --grace 1 -- bash -c 'sleep 25; exit 0' 2>&1)"; rc=$?
_es "un trabajo largo devuelve 125 (demotido), no el codigo del trabajo" "$rc" "125"
_es "y lo dice, en vez de callarlo" \
    "$([[ "$salida" == *"SEGUNDO PLANO"* ]] && echo si || echo no)" "si"
_es "publica su RUN para poder recogerlo despues" \
    "$([[ "$salida" == *"RUN="* ]] && echo si || echo no)" "si"
_es "y el trabajo SIGUE VIVO: la democion no lo mata" \
    "$($BG status largo)" "running"

# 5c. el control de ANULACION del caso 5b: sin gracia declarada, el default.
# La referencia lo fija en 120 s, no en los 1800 que `wait` traia.
_es "el default de gracia es el de la referencia, no 1800" \
    "$(sed -n 's/.*_GRACE_DEFAULT=\([0-9]*\).*/\1/p' "$BG" | head -1)" "120"
echo
echo "aserciones: $((ok+fallo))  ok: $ok  fallo: $fallo"
[[ $fallo -eq 0 ]]
