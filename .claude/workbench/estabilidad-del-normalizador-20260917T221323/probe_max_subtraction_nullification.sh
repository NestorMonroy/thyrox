#!/bin/bash
# =============================================================================
# probe_max_subtraction_nullification.sh — control de anulacion de la resta
# del maximo en `normalizer_magnitude`.
# =============================================================================
# QUE SE RETIRA: la resta del maximo antes de exponenciar, en `log_sum_exp` y
# en `softmax`. Es la mitad de juicio del modulo — el resto (cuadratura de la
# penalizacion, proporcionalidad del gradiente, paso de descenso) no depende
# de ella.
#
# POR QUE LA MUTACION DEVUELVE `inf` Y NO PROPAGA `OverflowError`: una
# anulacion que impide arrancar al sujeto no mide la causa retirada, mide «no
# arranco» (sub-patron D con la propia sonda como sujeto — ya ocurrio en esta
# sesion con el aislamiento del pool). La forma ingenua REAL sobre un arreglo
# de numpy no lanza: desborda a `inf` con un aviso. Esta mutacion reproduce esa
# conducta para que la suite recorra sus 27 aserciones y se pueda contar
# CUALES caen.
#
# LA RESTAURACION SE VERIFICA CONTRA EL RESPALDO, no contra HEAD: el modulo es
# nuevo y `git diff` contra HEAD no puede dar vacio mientras no se commitee.
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SUBJECT="$ROOT/src/measurement/normalizer_magnitude.py"
SUITE="$ROOT/tests/measurement/test_normalizer_magnitude.py"
BACKUP="$(mktemp)"
OUT="$(dirname "${BASH_SOURCE[0]}")/outputs"
mkdir -p "$OUT"

cp "$SUBJECT" "$BACKUP"
trap 'cp "$BACKUP" "$SUBJECT"; rm -f "$BACKUP"' EXIT

echo "== linea base: el sujeto intacto =="
python3 "$SUITE" > "$OUT/anulacion-antes.txt" 2>&1
tail -1 "$OUT/anulacion-antes.txt"

python3 - "$SUBJECT" <<'MUTATE'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
t = p.read_text()

naive = '''

def _naive_exp(value):
    """ANULACION: exponencia sin restar nada, y desborda a `inf` como numpy."""
    try:
        return math.exp(value)
    except OverflowError:
        return math.inf
'''

old_lse = '''    largest = max(logits)
    if largest == -math.inf:
        return -math.inf
    total = sum(math.exp(value - largest) for value in logits)
    return largest + math.log(total)'''
new_lse = '''    total = sum(_naive_exp(value) for value in logits)
    return math.log(total)'''
assert old_lse in t, "no se hallo el cuerpo de log_sum_exp"
t = t.replace(old_lse, new_lse)

old_sm = '''    largest = max(logits)
    exponentials = [math.exp(value - largest) for value in logits]
    total = sum(exponentials)
    return [value / total for value in exponentials]'''
new_sm = '''    exponentials = [_naive_exp(value) for value in logits]
    total = sum(exponentials)
    return [value / total for value in exponentials]'''
assert old_sm in t, "no se hallo el cuerpo de softmax"
t = t.replace(old_sm, new_sm)

t = t.replace('\ndef log_sum_exp(', naive + '\n\ndef log_sum_exp(', 1)
p.write_text(t)
print("mutado: la resta del maximo retirada de las dos funciones")
MUTATE

echo
echo "== con la resta del maximo RETIRADA =="
find "$ROOT/src/measurement" -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
python3 "$SUITE" > "$OUT/anulacion-despues.txt" 2>&1
tail -1 "$OUT/anulacion-despues.txt"
echo
echo "aserciones que CAEN:"
grep '^  FALLA' "$OUT/anulacion-despues.txt" || echo "  (ninguna — el control NO discrimina)"

cp "$BACKUP" "$SUBJECT"
find "$ROOT/src/measurement" -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null
echo
echo "== restaurado =="
if cmp -s "$BACKUP" "$SUBJECT"; then echo "  el sujeto coincide byte a byte con el respaldo"; fi
python3 "$SUITE" 2>&1 | tail -1
