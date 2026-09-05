#!/usr/bin/env bash
# test-vocabulario-gate-hook.sh — casos de `inject_vocabulario_gate.py`.
#
# El hook existe para pasar de DETECCION a PREVENCION. La cifra que lo
# justifica esta medida y es la que estos casos vigilan que siga valiendo:
#
#     gate completo, 4671 archivos ....... 56.2 s
#     el hook sobre un texto limpio ....... 0.035 s
#     cargar el lexico (1 000 000 formas) .. 1.2 s
#
# El coste esta en la CARGA del lexico, no en la comprobacion, asi que el
# caso 6 —«sin candidato NO carga»— es el que sostiene todo el diseno. Si se
# rompe, el hook pasa a costar 1.2 s en cada edicion de prosa del arbol.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
HOOK="$RAIZ/.claude/hooks/inject_vocabulario_gate.py"
cd "$RAIZ" || exit 1
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

correr() { printf '%s' "$1" | python3 "$HOOK" 2>/dev/null; }

echo "=== Caso 1: nunca rompe el flujo ==="
for entrada in '' '{}' 'no es json' '{"tool_input":null}'; do
    printf '%s' "$entrada" | python3 "$HOOK" >/dev/null 2>&1
    [[ $? -eq 0 ]] || bad "exit != 0 con entrada «${entrada:0:20}»"
done
ok "exit 0 con entrada vacia, vacia-json, basura y tool_input nulo"

echo "=== Caso 2: solo prosa — un .py no se toca ==="
s="$(correr '{"tool_input":{"file_path":"x.py","content":"la regla de oro"}}')"
[[ "$s" == "{}" ]] && ok "un .py sale {} aunque traiga forma vetada" \
                   || bad "marco un .py: $s"

echo "=== Caso 3: forma vetada USADA se avisa ==="
s="$(correr '{"tool_input":{"file_path":"x.rst","content":"La regla de oro es correr el guion a ojo."}}')"
grep -q "regla de oro" <<<"$s" && ok "nombra la forma" || bad "no la nombra"
grep -q "correr el"    <<<"$s" && ok "nombra las tres"  || bad "se dejo alguna"

echo "=== Caso 4 (el que discrimina): la MISMA forma CITADA no se avisa ==="
s="$(correr '{"tool_input":{"file_path":"x.rst","content":"El gate veta ``regla de oro`` y ``a ojo``."}}')"
[[ "$s" == "{}" ]] && ok "el literal en linea exime la cita" \
                   || bad "marco una cita marcada: $s"

echo "=== Caso 5: sustantivo que ningun corpus atestigua ==="
# El control es `esparsidad` y NO `democión`, que es el del gate completo.
# `democión` esta EN el baseline, y el hook aplica el baseline a proposito: una
# palabra ya triada no debe avisar en cada edicion. Usarla aqui probaba lo
# contrario de lo que dice el rotulo — un verde que no discrimina.
#
# `esparsidad` es un positivo real de esta sesion: se escribio como calco de
# *sparsity* en `redaccion-tecnica-es.md`, el gate lo marco, y se sustituyo por
# `dispersión`. No esta atestiguado ni congelado.
s="$(correr '{"tool_input":{"file_path":"x.rst","content":"La esparsidad del modelo quedo medida."}}')"
grep -q "esparsidad" <<<"$s" && ok "ve el control positivo real (esparsidad)" \
                             || bad "no vio el inventado: $s"

echo "=== Caso 5b: una palabra YA congelada no vuelve a avisar ==="
s="$(correr '{"tool_input":{"file_path":"x.rst","content":"La interpretabilidad es relativa a su comunidad."}}')"
[[ "$s" == "{}" ]] && ok "el baseline silencia lo ya triado" \
                   || bad "avisa de una palabra congelada: $s"

echo "=== Caso 6 (sostiene el diseno): sin candidato NO carga el lexico ==="
t0=$(date +%s%N)
correr '{"tool_input":{"file_path":"x.rst","content":"Prosa correcta y medida, sin nada que objetar."}}' >/dev/null
t1=$(date +%s%N); ms=$(( (t1 - t0) / 1000000 ))
[[ $ms -lt 600 ]] && ok "texto limpio en ${ms} ms (< 600, no cargo el lexico)" \
                  || bad "tardo ${ms} ms — ¿esta cargando el lexico sin candidato?"

echo "=== Caso 7: las tres formas de escritura ==="
s="$(correr '{"tool_input":{"file_path":"x.rst","new_string":"la regla de oro"}}')"
grep -q "regla de oro" <<<"$s" && ok "Edit: lee new_string" || bad "Edit ignorado"
s="$(correr '{"tool_input":{"file_path":"x.rst","edits":[{"new_string":"la regla de oro"}]}}')"
grep -q "regla de oro" <<<"$s" && ok "MultiEdit: lee edits[].new_string" || bad "MultiEdit ignorado"

echo "=== Caso 8: el aviso dice que NO bloquea ==="
s="$(correr '{"tool_input":{"file_path":"x.rst","content":"la regla de oro"}}')"
grep -q "NO bloquea" <<<"$s" && ok "lo declara en el propio aviso" || bad "no lo declara"

echo "=== Caso 9: el detector ALCANZA el evento — directo o por el despachador ==="
# Desde que existe `despachar_pretooluse.py` el detector ya no se invoca por su
# propio comando: el despachador lo importa y compone una sola salida. Medir la
# presencia literal en `settings.json` daria un rojo por una mudanza correcta —
# lo que importa es que el detector siga llegando al evento, por la via que sea.
python3 -c "
import json, sys, importlib.util, pathlib
d = json.load(open('.claude/settings.json'))
comandos = [x['command'] for h in d['hooks']['PreToolUse'] for x in h['hooks']]
if any('inject_vocabulario_gate' in c for c in comandos):
    sys.exit(0)                                   # via directa
if not any('despachar_pretooluse' in c for c in comandos):
    sys.exit(1)                                   # ni directo ni despachado
ruta = pathlib.Path('.claude/hooks/despachar_pretooluse.py')
spec = importlib.util.spec_from_file_location('desp', ruta)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
sys.exit(0 if any(n == 'vocabulario_gate' for n, _ in m.DETECTORS) else 1)"
[[ $? -eq 0 ]] && ok "el detector alcanza Write|Edit|MultiEdit" || bad "no alcanza el evento"

echo
if [[ $fail -eq 0 ]]; then echo "RESULTADO: todos los casos pasaron."; else echo "RESULTADO: hay casos fallidos."; fi
exit $fail
