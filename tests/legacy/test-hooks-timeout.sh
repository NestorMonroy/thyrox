#!/usr/bin/env bash
# test-hooks-timeout.sh — contrato de `check_hooks_timeout.py`.
#
# Un hook sin `timeout` no tiene peor caso acotado, y el turno ESPERA al
# hook: uno que se cuelga cuelga el turno. La referencia que lo destapo
# (claude-octopus, MIT) declara 39 de 43 con siete valores distintos, o sea
# lo trata como propiedad del hook y no como constante global.
#
# El caso que DISCRIMINA es el 5: un settings ausente NO puede publicar
# «0 infractores». Un cero que sale de no haber medido es el sub-patron D
# de metrica-decide-la-conclusion — el verde que no distingue «no hay
# defectos» de «no pude medir».
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_hooks_timeout.py"
cd "$RAIZ" || exit 1
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

escribir() { printf '%s' "$2" > "$TMP/$1"; }

# --- fixtures -------------------------------------------------------------
escribir limpio.json '{"hooks":{"Stop":[{"hooks":[
  {"type":"command","command":"bash a.sh","timeout":30},
  {"type":"command","command":"bash b.sh","timeout":5}]}]}}'

escribir sucio.json '{"hooks":{"PreToolUse":[{"matcher":"Write","hooks":[
  {"type":"command","command":"python3 con_timeout.py","timeout":10},
  {"type":"command","command":"python3 sin_timeout.py"}]}]}}'

escribir cero.json '{"hooks":{"Stop":[{"hooks":[
  {"type":"command","command":"bash c.sh","timeout":0}]}]}}'

escribir texto.json '{"hooks":{"Stop":[{"hooks":[
  {"type":"command","command":"bash d.sh","timeout":"30"}]}]}}'

escribir vacio.json '{"hooks":{}}'

echo "=== Caso 1: todos con timeout -> exit 0 ==="
s="$(python3 "$GATE" --settings "$TMP/limpio.json" --strict 2>&1)"; e=$?
[[ $e -eq 0 ]] && ok "exit 0" || bad "exit $e con todos declarados: $s"

echo "=== Caso 2 (control POSITIVO): uno sin timeout -> exit 1 y lo NOMBRA ==="
s="$(python3 "$GATE" --settings "$TMP/sucio.json" --strict 2>&1)"; e=$?
[[ $e -eq 1 ]] && ok "exit 1" || bad "exit $e con un infractor"
grep -q "sin_timeout.py" <<<"$s" && ok "nombra el comando infractor" \
                                 || bad "no nombra al infractor: $s"
grep -q "con_timeout.py" <<<"$s" && bad "nombra al que SI declara" \
                                 || ok "no nombra al que si declara"

echo "=== Caso 3: el denominador se publica ==="
s="$(python3 "$GATE" --settings "$TMP/sucio.json" 2>&1)"
grep -qE "1 de 2|de 2 hook" <<<"$s" && ok "publica «N de M»" \
                                    || bad "sin denominador: $s"

echo "=== Caso 4: un timeout no positivo o no entero NO cuenta como declarado ==="
for f in cero texto; do
    s="$(python3 "$GATE" --settings "$TMP/$f.json" --strict 2>&1)"; e=$?
    [[ $e -eq 1 ]] && ok "$f.json rechazado" || bad "$f.json aceptado (exit $e)"
done

echo "=== Caso 5 (EL QUE DISCRIMINA): settings ausente NO publica 0 ==="
s="$(python3 "$GATE" --settings "$TMP/no-existe.json" --strict 2>&1)"; e=$?
[[ $e -eq 2 ]] && ok "exit 2 — no medible, no es un cero" \
               || bad "exit $e ante settings ausente (esperado 2)"
grep -qiE "0 (hook|infractor)" <<<"$s" && bad "publica un cero falso: $s" \
                                       || ok "no publica cifra sin haber medido"

echo "=== Caso 6: sin hooks declarados el universo es 0 y se dice ==="
s="$(python3 "$GATE" --settings "$TMP/vacio.json" --strict 2>&1)"; e=$?
[[ $e -eq 0 ]] && ok "exit 0 con bloque hooks vacio" || bad "exit $e"
grep -q "0 de 0" <<<"$s" && ok "declara universo 0" || bad "no lo declara: $s"

echo "=== Caso 7: corre sobre el arbol real sin reventar ==="
python3 "$GATE" >/dev/null 2>&1; e=$?
[[ $e -eq 0 || $e -eq 1 ]] && ok "exit $e sobre el settings real" \
                           || bad "exit $e — el gate no soporta el arbol real"

[[ $fail -eq 0 ]] && echo "TODO OK" || echo "HAY FALLOS"
exit $fail
