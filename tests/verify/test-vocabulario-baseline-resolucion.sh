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

GATE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../src/verify" && pwd)/check_vocabulario_prosa.py"
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

# ── caso 7: la LISTA DE FORMAS VETADAS resuelve en el PROVEEDOR
# Estos dos casos median la resolucion de la lista contra el consumidor, y esa
# premisa cambio: la lista es politica de vocabulario —51 de 51 formas son
# español tecnico generico— y vive en `src/verify/` junto al mecanismo. El
# consumidor conserva su baseline, que si es deuda de un corpus concreto.
#
# Reescribirlos no era opcional: con el archivo en `HERE`, `propio.is_file()`
# corta antes del ascenso, asi que el caso 7 anterior seguia verde por la razon
# equivocada —la lista del proveedor tambien declara `corrida`— y el 8 solo
# podia dispararse borrando el archivo del proveedor. Un verde que no discrimina
# es el sub-patron D con la propia suite como sujeto.
#
# Lo que este caso mide ahora: el ascenso al consumidor NO se consulta. Se
# declara en el consumidor una forma que la lista canonica no tiene; si el gate
# la marcara, estaria leyendo el archivo equivocado.
caso
unset VOCAB_GATE_FORBIDDEN
printf 'zzforma-que-solo-el-consumidor-declara\n' \
  > "$TMP/consumidor/.claude/baselines/vocabulario_prohibido.txt"
printf 'Sujeto\n======\n\nUna zzforma-que-solo-el-consumidor-declara y una corrida del generador.\n' \
  > "$TMP/consumidor/source/vetada.rst"
SALIDA7="$( (cd "$TMP/consumidor" && python3 "$GATE" --strict --no-baseline "source/vetada.rst") 2>&1 )"
CODIGO7=$?
if [ "$CODIGO7" -eq 1 ] \
   && printf '%s' "$SALIDA7" | grep -q 'corrida' \
   && ! printf '%s' "$SALIDA7" | grep -q 'zzforma-que-solo-el-consumidor-declara'; then
  ok "usa la lista canonica del proveedor e ignora la copia del consumidor"
else
  falla "lista del proveedor" "exit=$CODIGO7 — marco la forma del consumidor, o no vio la canonica"
fi

# ── caso 8: la lista DECLARADA y ausente REHUSA
# El rehuso sigue siendo la conducta correcta y su premisa se estrecha: ya no
# se alcanza por «no esta en ninguna parte» —el proveedor siempre la trae—
# sino por una ruta declarada que no existe, que es como un consumidor se
# equivoca al redirigirla. Un cero aqui no distinguiria «no hay formas vetadas»
# de «no encontre la lista», y la lista es la MITAD del gate.
caso
SALIDA8="$( VOCAB_GATE_FORBIDDEN="$TMP/no-existe/vetadas.txt" \
  python3 "$GATE" --no-baseline "$PROSA" 2>&1 )"
CODIGO8=$?
if [ "$CODIGO8" -eq 2 ] && printf '%s' "$SALIDA8" | grep -q "vocabulario_prohibido"; then
  ok "rehusa con la lista declarada y ausente, y la nombra"
else
  falla "rehuso sin lista" "exit=$CODIGO8 — un conteo aqui mediria un solo eje"
fi

# ── caso 9: la CLAVE del baseline es relativa al consumidor, no a /home/user
# `ROOT = parents[3]` valia la raiz del repo cuando el gate vivia en
# `kaupamex-docs/.claude/scripts/gates/`; desde `thyrox/src/verify/` vale
# `/home/user`, asi que la clave sale `kaupamex-docs/source/x.rst::forma` y no
# empareja con las 620 entradas congeladas, que dicen `source/x.rst::forma`.
# La deuda heredada se publicaria entera como nueva — el defecto de h-docs-1107
# por otra puerta.
#
# Su sujeto es la CLAVE, no la lista: por eso declara la suya por variable,
# como los casos 1-6. Sin eso heredaba el `unset` del caso 7 y resolvia contra
# la lista canonica del proveedor — acoplamiento de estado que hacia caer este
# caso al anular aquel, midiendo dos cosas con una asercion.
caso
printf 'source/vetada.rst::corrida\n' > "$TMP/consumidor/.claude/baselines/vocabulario_prosa_baseline.txt"
if (cd "$TMP/consumidor" && VOCAB_GATE_FORBIDDEN="$TMP/vetadas.txt" \
      python3 "$GATE" --strict "$TMP/consumidor/source/vetada.rst") >/dev/null 2>&1; then
  ok "la clave es relativa al consumidor y el baseline la absorbe"
else
  falla "clave relativa" "la clave no emparejo con la entrada del baseline"
fi

echo "$((CASOS - FALLOS))/$CASOS aserciones verdes"
[ "$FALLOS" -eq 0 ]
