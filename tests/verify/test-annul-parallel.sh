#!/usr/bin/env bash
# Suite de annul_parallel.sh: cada variante se mide como el modulo original
# salvo la anulacion —imports relativos y hermanos cargados por ruta incluidos—
# con pruebas de bun, Python y shell; una expresion sin efecto rehusa y una
# prueba que aborta cuenta como fallo.
set -uo pipefail
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
SUJETO="${ANNUL_PARALLEL_MODULE:-$RAIZ/src/verify/annul_parallel.sh}"
fallos=0
total=0

check() {
    local label="$1" cond="$2"
    total=$((total + 1))
    if eval "$cond"; then echo "  ok  $label"; else echo "  FALLA  $label"; fallos=$((fallos + 1)); fi
}

FIX="$RAIZ/.claude/cache/test-annul-parallel/$$"
mkdir -p "$FIX/sub"
trap 'rm -rf "${FIX:?}"; rmdir "$RAIZ/.claude/cache/test-annul-parallel" 2>/dev/null || true' EXIT

# El modulo importa un valor de un hermano, uno del padre y reexporta otro.
printf 'export const base = 2\n' > "$FIX/helper.ts"
printf 'export const offset = 1\n' > "$FIX/parent.ts"
printf 'export const unit = "u"\n' > "$FIX/sub/unit.ts"
cat > "$FIX/sub/mod.ts" <<'TS'
import { base } from '../helper.ts'
import { offset } from "../parent.ts"
export { unit } from './unit.ts'
export const double = (x: number) => x * base
export const shift = (x: number) => x + offset
TS
cat > "$FIX/sub/mod.test.ts" <<'TS'
import { expect, test } from 'bun:test'
const m = await import(process.env.ANNUL_FIXTURE_MODULE ?? './mod.ts')
test('double', () => expect(m.double(3)).toBe(6))
test('shift', () => expect(m.shift(3)).toBe(4))
test('unit', () => expect(m.unit).toBe('u'))
TS
printf 'double\ts/x \\* base/x * 3/\n' > "$FIX/variants.tsv"
printf 'none\ts/no-existe/nada/\n' > "$FIX/nochange.tsv"

echo "caso 1 — un import relativo de valor sigue resolviendo en la copia"
out="$(cd "$RAIZ" && bash "$SUJETO" "$FIX/sub/mod.ts" "$FIX/sub/mod.test.ts" ANNUL_FIXTURE_MODULE "$FIX/variants.tsv" annul-fixture 2>&1)"
check "la base pasa entera" '[[ "$out" == *"base	3 pass, 0 fail"* ]]'
printf '%s\n' "$out" | sed 's/^/    /'
check "la variante cae SOLO en double" 'grep -qxF "double	2 pass, 1 fail	double" <<< "$out"'

echo "caso 2 — una expresion que no casa rehusa en vez de dar un verde"
(cd "$RAIZ" && bash "$SUJETO" "$FIX/sub/mod.ts" "$FIX/sub/mod.test.ts" ANNUL_FIXTURE_MODULE "$FIX/nochange.tsv" annul-fixture >/dev/null 2>&1)
rc=$?
check "sale 2" "[[ $rc -eq 2 ]]"

echo "caso 3 — una prueba de Python, con un modulo que carga a su hermano por ruta"
mkdir -p "$FIX/py"
printf 'FACTOR = 2\n' > "$FIX/py/factor.py"
cat > "$FIX/py/mod.py" <<'PY'
import importlib.util, pathlib
_spec = importlib.util.spec_from_file_location("factor", pathlib.Path(__file__).with_name("factor.py"))
factor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(factor)
def double(x):
    return x * factor.FACTOR
def shift(x):
    return x + 1
PY
cat > "$FIX/py/test_mod.py" <<'PY'
import importlib.util, os, pathlib, sys
path = os.environ.get("ANNUL_FIXTURE_MODULE") or str(pathlib.Path(__file__).with_name("mod.py"))
spec = importlib.util.spec_from_file_location("mod", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
failed = 0
for label, ok in (("double", mod.double(3) == 6), ("shift", mod.shift(3) == 4)):
    print(f"  ok    {label}" if ok else f"  FALLA {label}: distinto")
    failed += not ok
sys.exit(1 if failed else 0)
PY
printf 'double\ts/x \\* factor.FACTOR/x * 3/\n' > "$FIX/py/variants.tsv"
out="$(cd "$RAIZ" && bash "$SUJETO" "$FIX/py/mod.py" "$FIX/py/test_mod.py" ANNUL_FIXTURE_MODULE "$FIX/py/variants.tsv" annul-fixture-py 2>&1)"
printf '%s\n' "$out" | sed 's/^/    /'
check "la base de Python pasa entera" '[[ "$out" == *"base	2 pass, 0 fail"* ]]'
check "la variante de Python cae SOLO en double" 'grep -qxF "double	1 pass, 1 fail	double" <<< "$out"'

echo "caso 4 — una prueba que aborta no se publica como verde"
printf 'boom\ts/^def shift(x):/raise SystemExit(3)\\ndef shift(x):/\n' > "$FIX/py/abort.tsv"
out="$(cd "$RAIZ" && bash "$SUJETO" "$FIX/py/mod.py" "$FIX/py/test_mod.py" ANNUL_FIXTURE_MODULE "$FIX/py/abort.tsv" annul-fixture-py 2>&1)"
printf '%s\n' "$out" | sed 's/^/    /'
check "el aborto cuenta como fallo y lo nombra" 'grep -qxF "boom	0 pass, 1 fail	abortó (exit 3)" <<< "$out"'

echo "caso 5 — un script de shell que carga un archivo del directorio padre"
mkdir -p "$FIX/sh/bin" "$FIX/sh/lib"
printf 'VAL=2\nONE=1\n' > "$FIX/sh/lib/val.sh"
cat > "$FIX/sh/bin/mod.sh" <<'SH'
# shellcheck source=/dev/null
source "$(dirname "${BASH_SOURCE[0]}")/../lib/val.sh"
echo "double=$((3 * VAL)) shift=$((3 + ONE))"
SH
cat > "$FIX/sh/test_mod.sh" <<'SH'
out="$(bash "${ANNUL_FIXTURE_MODULE:-$(dirname "$0")/bin/mod.sh}")"
[[ "$out" == *"double=6"* ]] && echo "  ok    double" || echo "  FALLA double: $out"
[[ "$out" == *"shift=4"* ]] && echo "  ok    shift" || echo "  FALLA shift: $out"
SH
printf 'double\ts/3 \\* VAL/3 * 3/\n' > "$FIX/sh/variants.tsv"
out="$(cd "$RAIZ" && bash "$SUJETO" "$FIX/sh/bin/mod.sh" "$FIX/sh/test_mod.sh" ANNUL_FIXTURE_MODULE "$FIX/sh/variants.tsv" annul-fixture-sh 2>&1)"
printf '%s\n' "$out" | sed 's/^/    /'
check "la variante de shell cae SOLO en double" 'grep -qxF "double	1 pass, 1 fail	double" <<< "$out"'

echo "test-annul-parallel: $total aserciones — $((total - fallos)) ok, $fallos falla(s)"
[[ $fallos -eq 0 ]]
