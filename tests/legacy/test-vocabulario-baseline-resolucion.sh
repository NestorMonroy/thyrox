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

echo "$((CASOS - FALLOS))/$CASOS aserciones verdes"
[ "$FALLOS" -eq 0 ]
