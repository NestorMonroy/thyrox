#!/usr/bin/env bash
# test-despachador-pretooluse.sh — contrato del despachador de PreToolUse.
#
# Hoy `PreToolUse` lleva dos hooks y cada uno es un proceso. Las 13 tareas de
# esa via anadirian uno cada una: quince fork+exec por cada Write o Edit. El
# despachador los invoca EN PROCESO y compone una sola salida.
#
# Lo que el contrato tiene que sostener sale de una medicion del ejecutable
# (H-DOCS-451), no de una preferencia:
#
#   - el cliente une los additionalContext de N hooks en UN bloque y lo
#     etiqueta con el EVENTO, nunca con el script -> el despachador tiene que
#     poner el nombre del detector, porque nadie mas lo va a poner;
#   - el tope de 10 000 caracteres se aplica POR HOOK y ANTES de concatenar ->
#     consolidados, los detectores COMPARTEN una sola ventana, asi que hace
#     falta presupuesto por detector;
#   - un contenido vacio no aporta elemento -> cortocircuito por vacio.
#
# Los casos que DISCRIMINAN son el 5 y el 7. El 5 mide que un detector roto no
# se lleve por delante a los demas: sin el, la consolidacion cambia un fallo
# aislado por uno total. El 7 mide que consolidar no PIERDA texto — compara la
# salida del despachador contra la del detector suelto sobre el mismo payload,
# que es la unica forma de saber que la mudanza no rompio nada.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DESP="$RAIZ/.claude/hooks/despachar_pretooluse.py"
cd "$RAIZ" || exit 1
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- fixtures de payload --------------------------------------------------
# Positivo REAL del repo: un hallazgo H-DOCS-* colocado bajo pm/api/, que es
# exactamente el defecto que h-docs-227 registro. No es un incumplidor
# fabricado — es la forma que ya ocurrio.
cat > "$TMP/fuera-de-sitio.json" <<'JSON'
{"tool_name":"Write","tool_input":{
  "file_path":"source/gestion/pm/api/iniciativas/completar-familia-base/hallazgos/hallazgo-H-DOCS-999-prueba.rst",
  "content":"texto"}}
JSON

cat > "$TMP/inocente.json" <<'JSON'
{"tool_name":"Write","tool_input":{"file_path":"README.md","content":"nada que ver"}}
JSON

echo "=== Caso 1: ningun detector con hallazgo -> {} y exit 0 ==="
s="$(python3 "$DESP" < "$TMP/inocente.json" 2>&1)"; e=$?
[[ $e -eq 0 ]] && ok "exit 0" || bad "exit $e"
[[ "$s" == "{}" ]] && ok "imprime {} exacto" || bad "imprimio: $s"

echo "=== Caso 2 (control POSITIVO real): un detector con hallazgo ==="
s="$(python3 "$DESP" < "$TMP/fuera-de-sitio.json" 2>&1)"; e=$?
[[ $e -eq 0 ]] && ok "exit 0" || bad "exit $e"
python3 -c "
import json,sys
d=json.loads(sys.argv[1])
c=d['hookSpecificOutput']['additionalContext']
assert d['hookSpecificOutput']['hookEventName']=='PreToolUse', 'hookEventName'
assert 'submodulo' in c or 'submódulo' in c, 'no trae el aviso del detector'
" "$s" 2>/dev/null && ok "un solo additionalContext con el aviso" || bad "salida sin el aviso: ${s:0:200}"

echo "=== Caso 3: el nombre del DETECTOR aparece — el cliente solo etiqueta el evento ==="
python3 -c "
import json,sys
c=json.loads(sys.argv[1])['hookSpecificOutput']['additionalContext']
assert 'hallazgo_submodulo' in c, 'falta la etiqueta del detector'
" "$s" 2>/dev/null && ok "el bloque nombra a su detector" || bad "el bloque no nombra al detector"

echo "=== Caso 4: dos detectores -> UN bloque con los dos, cada uno etiquetado ==="
python3 - "$DESP" <<'PY' && ok "dos detectores caben en un bloque, ambos etiquetados" || bad "la consolidacion de dos detectores falla"
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location('desp', pathlib.Path(sys.argv[1]))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
det = [('alfa', lambda p: 'aviso de alfa'), ('beta', lambda p: 'aviso de beta')]
out = m.dispatch({}, det)
c = out['hookSpecificOutput']['additionalContext']
assert c.count('aviso de alfa') == 1 and c.count('aviso de beta') == 1, c
assert 'alfa' in c and 'beta' in c
PY

echo "=== Caso 5 (DISCRIMINA): un detector que revienta no tumba a los demas ==="
python3 - "$DESP" <<'PY' && ok "el detector roto se aisla y el sano entrega" || bad "un detector roto se lleva al resto"
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location('desp', pathlib.Path(sys.argv[1]))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def revienta(p): raise RuntimeError('boom')
det = [('roto', revienta), ('sano', lambda p: 'aviso del sano')]
out = m.dispatch({}, det)
c = out['hookSpecificOutput']['additionalContext']
assert 'aviso del sano' in c, 'el sano se perdio: ' + repr(c)
assert 'boom' not in c, 'la excepcion se filtro al contexto'
PY

echo "=== Caso 6: presupuesto por detector dentro de la ventana compartida ==="
python3 - "$DESP" <<'PY' && ok "ningun detector monopoliza; el total respeta el tope" || bad "el presupuesto no se aplica"
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location('desp', pathlib.Path(sys.argv[1]))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
det = [('glotón', lambda p: 'X' * 50000), ('modesto', lambda p: 'aviso corto')]
out = m.dispatch({}, det)
c = out['hookSpecificOutput']['additionalContext']
assert len(c) <= m.TOTAL_BUDGET, f'total {len(c)} > {m.TOTAL_BUDGET}'
assert 'aviso corto' in c, 'el gloton se comio la ventana del modesto'
assert c.count('X') < 50000, 'el gloton no se recorto'
PY

echo "=== Caso 7 (DISCRIMINA): consolidar NO pierde texto del detector suelto ==="
suelto="$(python3 .claude/hooks/inject_hallazgo_submodulo.py < "$TMP/fuera-de-sitio.json" 2>/dev/null)"
python3 -c "
import json,sys
suelto=json.loads(sys.argv[1])['hookSpecificOutput']['additionalContext']
junto =json.loads(sys.argv[2])['hookSpecificOutput']['additionalContext']
falta=[l for l in suelto.splitlines() if l.strip() and l.strip() not in junto]
assert not falta, 'lineas perdidas: ' + repr(falta[:3])
" "$suelto" "$s" 2>/dev/null && ok "el aviso del detector suelto sobrevive entero" || bad "consolidar perdio texto del detector suelto"

echo "=== Caso 8: stdin invalido -> {} y exit 0, nunca rompe el turno ==="
s="$(printf 'no soy json' | python3 "$DESP" 2>&1)"; e=$?
[[ $e -eq 0 && "$s" == "{}" ]] && ok "stdin basura -> {} exit 0" || bad "exit $e salida: $s"

echo "=== Caso 9: el registro por omision son los detectores REALES del repo ==="
python3 - "$DESP" <<'PY' && ok "DETECTORS apunta a hooks que existen" || bad "el registro cita un detector inexistente"
import importlib.util, sys, pathlib
spec = importlib.util.spec_from_file_location('desp', pathlib.Path(sys.argv[1]))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
assert m.DETECTORS, 'registro vacio'
for nombre, fn in m.DETECTORS:
    assert callable(fn), f'{nombre} no es invocable'
print('detectores:', len(m.DETECTORS))
PY

echo
if [[ $fail -eq 0 ]]; then echo "despachador-pretooluse: todo en verde"; else echo "despachador-pretooluse: HAY FALLOS"; fi
exit $fail
