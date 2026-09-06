#!/usr/bin/env bash
# Control de la resolucion del baseline del gate de vocabulario.
#
# Origen: h-docs-1107 — tras la mudanza a thyrox el gate buscaba su baseline
# junto a si mismo, no lo encontraba, y `load_baseline()` devolvia un conjunto
# vacio SIN decirlo. Las 638 entradas congeladas del consumidor quedaron
# invisibles y el pre-commit --strict empezo a bloquear de mas.
#
# El control tiene que poder fallar: si el gate volviera a operar con un
# baseline vacio en vez de rehusar, el caso 3 lo detecta.
set -uo pipefail

GATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../src/gates" && pwd)/check_vocabulario_prosa.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FALLOS=0
CASOS=0

caso() { CASOS=$((CASOS + 1)); }
ok()   { echo "  ok    $1"; }
falla(){ FALLOS=$((FALLOS + 1)); echo "  FALLA $1: $2"; }

# Un archivo de prosa con un termino que el lexico NO atestigua.
mkdir -p "$TMP/consumidor/.claude/baselines" "$TMP/consumidor/source"

# La lista de formas vetadas es PRECONDICION del gate desde que dejo de
# resolver a [] en silencio. Los casos que miden el BASELINE la declaran por
# variable para aislar su sujeto — sin esto, el rehuso de la lista enmascara
# lo que el caso pretende medir.
printf 'corrida\n' > "$TMP/vetadas.txt"
export VOCAB_GATE_FORBIDDEN="$TMP/vetadas.txt"
PROSA="$TMP/consumidor/source/sujeto.rst"
printf '.. meta::\n   :autor: Equipo Kaupamex\n\nSujeto\n======\n\nLa reimplementaciones del mecanismo.\n' > "$PROSA"

# ── caso 1: con el baseline declarado por variable, el termino se absorbe
caso
printf '# baseline de prueba\nreimplementaciones\n' > "$TMP/consumidor/.claude/baselines/vocabulario_prosa_baseline.txt"
if VOCAB_GATE_BASELINE="$TMP/consumidor/.claude/baselines/vocabulario_prosa_baseline.txt" \
     python3 "$GATE" --strict "$PROSA" >/dev/null 2>&1; then
  ok "el baseline por variable absorbe el termino congelado"
else
  falla "baseline por variable" "el gate bloqueo un termino que el baseline congela"
fi

# ── caso 2: sin variable, lo encuentra ascendiendo desde el archivo medido
caso
if (cd "$TMP/consumidor" && python3 "$GATE" --strict "source/sujeto.rst") >/dev/null 2>&1; then
  ok "encuentra el baseline del consumidor ascendiendo desde el archivo"
else
  falla "ascenso al consumidor" "no encontro .claude/baselines del consumidor"
fi

# ── caso 3: sin baseline en ninguna parte REHUSA — no publica un cero
caso
mkdir -p "$TMP/huerfano/source"
cp "$PROSA" "$TMP/huerfano/source/sujeto.rst"
SALIDA="$(VOCAB_GATE_BASELINE="$TMP/no-existe.txt" python3 "$GATE" "$TMP/huerfano/source/sujeto.rst" 2>&1)"
CODIGO=$?
if [ "$CODIGO" -eq 2 ] && printf '%s' "$SALIDA" | grep -q "baseline"; then
  ok "rehusa con exit 2 y nombra el baseline ausente"
else
  falla "rehuso sin baseline" "exit=$CODIGO — un 0 aqui seria un verde falso"
fi

# ── caso 4: --write-baseline SI puede operar sin baseline previo
caso
if VOCAB_GATE_BASELINE="$TMP/nuevo.txt" python3 "$GATE" --write-baseline "$PROSA" >/dev/null 2>&1 \
   && [ -f "$TMP/nuevo.txt" ]; then
  ok "--write-baseline no queda atrapado por el rehuso de lectura"
else
  falla "write-baseline" "el rehuso de lectura bloqueo la escritura inicial"
fi

# ── caso 5: --write-baseline NO fabrica el hogar del proveedor
# Si lo fabricara, la lectura siguiente lo preferiria y ensombreceria las 638
# entradas del consumidor — el mismo defecto por otra puerta.
caso
PROPIO="$(dirname "$GATE")/vocabulario_prosa_baseline.txt"
[ -f "$PROPIO" ] && mv "$PROPIO" "$TMP/propio.respaldo"
mkdir -p "$TMP/suelto"
cp "$PROSA" "$TMP/suelto/sujeto.rst"
(cd "$TMP/suelto" && python3 "$GATE" --write-baseline sujeto.rst) >/dev/null 2>&1
if [ ! -f "$PROPIO" ]; then
  ok "no fabrica el baseline en el hogar del proveedor"
else
  rm -f "$PROPIO"
  falla "write en el proveedor" "creo $PROPIO — ensombreceria al consumidor"
fi
[ -f "$TMP/propio.respaldo" ] && mv "$TMP/propio.respaldo" "$PROPIO"

# ── caso 6: el archivo medido esta FUERA del consumidor -> cae al cwd
# El docstring de `resolve_baseline` declara «y si no hay ninguno, desde el
# directorio de invocacion», pero el codigo lo implementaba como un `or` que
# solo dispara con `measured` VACIO: si hay archivo medido y su ascenso falla,
# el cwd no se consultaba nunca. Lo destapo el pre-commit al ejercitarse con un
# `.rst` en un temporal: el gate rehusaba estando el baseline del consumidor a
# un `cd` de distancia.
caso
mkdir -p "$TMP/fuera"
cp "$PROSA" "$TMP/fuera/sujeto.rst"
if (cd "$TMP/consumidor" && python3 "$GATE" --strict "$TMP/fuera/sujeto.rst") >/dev/null 2>&1; then
  ok "con el archivo fuera del arbol, asciende desde el cwd"
else
  falla "respaldo al cwd" "rehuso teniendo el baseline del consumidor en el cwd"
fi

# ── caso 7: la LISTA DE FORMAS VETADAS se resuelve como el baseline
# `FORBIDDEN = HERE / 'vocabulario_prohibido.txt'` miraba SOLO el hogar del
# proveedor, y `load_forbidden()` devolvia [] en silencio si no estaba. thyrox
# no la tiene —es parametro del consumidor, igual que el baseline— asi que el
# detector `prohibido` corria con CERO formas contra las que comparar y
# publicaba «0 hallazgos» como si el texto estuviera limpio.
caso
unset VOCAB_GATE_FORBIDDEN
printf 'corrida\n' > "$TMP/consumidor/.claude/baselines/vocabulario_prohibido.txt"
printf 'Sujeto\n======\n\nLa primera corrida del generador fallo.\n' > "$TMP/consumidor/source/vetada.rst"
SALIDA7="$( (cd "$TMP/consumidor" && python3 "$GATE" --strict "source/vetada.rst") 2>&1 )"
CODIGO7=$?
if [ "$CODIGO7" -eq 1 ] && printf '%s' "$SALIDA7" | grep -q 'corrida'; then
  ok "encuentra la lista de vetadas del consumidor y bloquea"
else
  falla "lista de vetadas" "exit=$CODIGO7 — con 0 formas cargadas todo texto pasa"
fi

# ── caso 8: sin lista de vetadas en ninguna parte REHUSA
# Mismo criterio que el baseline: un cero no distingue «no hay formas vetadas»
# de «no encontre la lista». La diferencia importa — la lista es la MITAD del
# gate, y su ausencia lo deja midiendo un solo eje sin decirlo.
caso
mkdir -p "$TMP/sinlista/.claude/baselines" "$TMP/sinlista/source"
printf '# vacio\n' > "$TMP/sinlista/.claude/baselines/vocabulario_prosa_baseline.txt"
cp "$PROSA" "$TMP/sinlista/source/sujeto.rst"
SALIDA8="$( (cd "$TMP/sinlista" && python3 "$GATE" "source/sujeto.rst") 2>&1 )"
CODIGO8=$?
if [ "$CODIGO8" -eq 2 ] && printf '%s' "$SALIDA8" | grep -q "vocabulario_prohibido"; then
  ok "rehusa sin la lista de vetadas y la nombra"
else
  falla "rehuso sin lista" "exit=$CODIGO8 — un conteo aqui mediria un solo eje"
fi

# ── caso 9: la CLAVE del baseline es relativa al consumidor, no a /home/user
# `ROOT = parents[3]` valia la raiz del repo cuando el gate vivia en
# `kaupamex-docs/.claude/scripts/gates/`; desde `thyrox/src/gates/` vale
# `/home/user`, asi que la clave sale `kaupamex-docs/source/x.rst::forma` y no
# empareja con las 620 entradas congeladas, que dicen `source/x.rst::forma`.
# La deuda heredada se publicaria entera como nueva — el defecto de h-docs-1107
# por otra puerta.
caso
printf 'source/vetada.rst::corrida\n' > "$TMP/consumidor/.claude/baselines/vocabulario_prosa_baseline.txt"
if (cd "$TMP/consumidor" && python3 "$GATE" --strict "$TMP/consumidor/source/vetada.rst") >/dev/null 2>&1; then
  ok "la clave es relativa al consumidor y el baseline la absorbe"
else
  falla "clave relativa" "la clave no emparejo con la entrada del baseline"
fi

echo "$((CASOS - FALLOS))/$CASOS aserciones verdes"
[ "$FALLOS" -eq 0 ]
