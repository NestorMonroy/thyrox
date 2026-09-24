#!/usr/bin/env bash
# Suite de src/verify/run_ts_isolated.sh — la mitad TypeScript de tests/run.sh
# con un proceso de `bun test` por archivo.
#
# Por que existe: `mock.module` de Bun reemplaza el modulo para TODO el
# proceso y no se deshace entre archivos. Con 954 archivos en un solo proceso,
# un archivo que simula un modulo contamina a los siguientes, y con el grafo
# del pase de exportaciones la contaminacion termino en un segfault de Bun
# 1.3.11 que tumbaba la suite entera.
#
# El caso que discrimina es el 1: `b` pasa aislado y FALLA en el mismo proceso
# que `a`. El control 0 lo mide en el mismo pase, para que el verde del caso 1
# no pueda salir de un fixture que no contamina.
set -uo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
EJECUTOR="$RAIZ/src/verify/run_ts_isolated.sh"
fallos=0; total=0
check() { total=$((total+1)); if [[ "$2" == "$3" ]]; then echo "OK   $1"; else echo "FALLA $1 — esperado '$3', obtenido '$2'"; fallos=$((fallos+1)); fi; }

F="$(mktemp -d)"; trap 'rm -rf "$F"' EXIT
printf "export const valor = 'real'\n" > "$F/valor.ts"
cat > "$F/a.test.ts" <<'TS'
import { expect, mock, test } from 'bun:test'
mock.module('./valor.ts', () => ({ valor: 'simulado' }))
test('a simula el modulo', async () => { expect((await import('./valor.ts')).valor).toBe('simulado') })
TS
cat > "$F/b.test.ts" <<'TS'
import { expect, test } from 'bun:test'
import { valor } from './valor.ts'
test('b ve el modulo real', () => { expect(valor).toBe('real') })
TS
cat > "$F/c.test.ts" <<'TS'
import { expect, test } from 'bun:test'
test('c falla de verdad', () => { expect(1).toBe(2) })
TS
cat > "$F/d.test.ts" <<'TS'
import { test } from 'bun:test'
test('d aborta el proceso', () => { process.abort() })
TS

# 0 — control: en un solo proceso el fixture SI contamina.
(cd "$F" && bun test ./a.test.ts ./b.test.ts >/dev/null 2>&1)
check "control: en un solo proceso b falla por el mock de a" "$?" "1"

# 1 — aislado, a y b pasan: exit 0 y ningun archivo en rojo.
SALIDA="$(cd "$F" && printf '%s\n' ./a.test.ts ./b.test.ts | bash "$EJECUTOR" 2>&1)"; CODE=$?
check "aislado: a y b pasan" "$CODE" "0"
check "aislado: el resumen cuenta 2 pass" "$(printf '%s' "$SALIDA" | gawk '/^pass=/{split($1,a,"="); print a[2]}')" "2"

# 2 — un fallo real sigue siendo rojo, nombrado.
SALIDA="$(cd "$F" && printf '%s\n' ./a.test.ts ./b.test.ts ./c.test.ts | bash "$EJECUTOR" 2>&1)"; CODE=$?
check "un fallo real: exit 1" "$CODE" "1"
check "un fallo real: nombra el archivo" "$(printf '%s' "$SALIDA" | gawk '/^-- ROJO .*c\.test\.ts$/{n++} END{print n+0}')" "1"

# 3 — un proceso que aborta tumba SOLO su archivo; los demas se miden.
SALIDA="$(cd "$F" && printf '%s\n' ./a.test.ts ./b.test.ts ./d.test.ts | bash "$EJECUTOR" 2>&1)"; CODE=$?
check "un aborto: exit 1" "$CODE" "1"
check "un aborto: nombra el archivo" "$(printf '%s' "$SALIDA" | gawk '/^-- ROJO .*d\.test\.ts$/{n++} END{print n+0}')" "1"
check "un aborto: los otros dos siguen contando" "$(printf '%s' "$SALIDA" | gawk '/^pass=/{split($1,a,"="); print a[2]}')" "2"

# 5 — el entorno del corredor, no el del que llama: `tests/run.sh` exporta
#     PYTHONPATH y el subconjunto derivado llama a este ejecutor a secas. Sin
#     esto, una suite que invoca un gate Python pasa en la suite y cae en el
#     subconjunto (medido: compat.test.ts, 3 fails sin la variable, 0 con ella).
cat > "$F/e.test.ts" <<TS
import { expect, test } from 'bun:test'
test('PYTHONPATH trae la fuente del proveedor', () => {
  expect((process.env.PYTHONPATH ?? '').split(':')).toContain('$RAIZ/src')
})
TS
SALIDA="$(cd "$F" && printf 'e.test.ts\n' | env -u PYTHONPATH bash "$EJECUTOR" 2>&1)"; CODE=$?
check "sin PYTHONPATH en quien llama: el ejecutor lo exporta" "$CODE" "0"

# 4 — sin archivos no hay verde: rehusa con exit 2 y sin cifra.
SALIDA="$(cd "$F" && printf '' | bash "$EJECUTOR" 2>&1)"; CODE=$?
check "sin archivos: rehusa con exit 2" "$CODE" "2"
check "sin archivos: no publica pass=" "$(printf '%s' "$SALIDA" | gawk '/^pass=/{n++} END{print n+0}')" "0"

echo
echo "aserciones: $((total - fallos)) de $total · fallos: $fallos"
exit $((fallos > 0))
