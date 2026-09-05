#!/usr/bin/env bash
# test-audit-timing.sh — contrato del desglose por gate de `thyrox-audit.sh`.
#
# H-DOCS-450 midio que el hook de arranque cuesta 151 s: 20x el segundo mas
# caro y 1682x la mediana. Abaratarlo exige saber CUAL de sus gates lo causa,
# y hoy el guion no publica esa cifra: el 151 s es un agregado sin desglose.
#
# El caso que DISCRIMINA es el 4: el desglose declara su DENOMINADOR — cuantos
# gates midio de cuantas secciones tiene el guion. Sin el, una instrumentacion
# parcial publica una lista que se lee completa, y el tiempo de las secciones
# sin medir se reparte en el silencio. Es el sub-patron D de
# metrica-decide-la-conclusion: un verde que no distingue «lo medi todo» de
# «medi lo que instrumente».
#
# La medicion real cuesta minutos, asi que la suite acepta una salida ya
# capturada por AUDIT_OUT. Sin ella corre el guion, y eso es lento a proposito:
# el contrato se afirma sobre la salida real, no sobre una fabricada.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/thyrox-audit.sh"
cd "$RAIZ" || exit 1
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }

if [[ -n "${AUDIT_OUT:-}" && -f "${AUDIT_OUT}" ]]; then
    OUT="$(cat "$AUDIT_OUT")"
    echo "(midiendo sobre la salida capturada en $AUDIT_OUT)"
else
    echo "(corriendo el guion — esto tarda minutos; usa AUDIT_OUT para reusar)"
    OUT="$(bash "$GUION" --fast --timing 2>&1)"
fi

echo "=== Caso 1: --timing publica un desglose ==="
grep -q '^## Desglose por gate' <<<"$OUT" \
    && ok "el encabezado del desglose esta" \
    || bad "sin desglose: --timing no cambio la salida"

echo "=== Caso 2: cada fila del desglose trae su duracion en ms ==="
FILAS="$(grep -cE '^ +[0-9]+ ms  ' <<<"$OUT" || true)"
[[ "${FILAS:-0}" -ge 1 ]] && ok "$FILAS fila(s) con duracion" \
                          || bad "ninguna fila con la forma «N ms  <gate>»"

echo "=== Caso 3: las filas vienen ordenadas de mayor a menor ==="
printf '%s\n' "$OUT" | python3 -c "
import re, sys
v = [int(x) for x in re.findall(r'^ +(\\d+) ms  ', sys.stdin.read(), re.M)]
sys.exit(0 if v == sorted(v, reverse=True) else 1)
"
[[ $? -eq 0 ]] && ok "orden descendente" || bad "el desglose no esta ordenado"

echo "=== Caso 4 (EL QUE DISCRIMINA): el desglose declara su denominador ==="
DEN="$(grep -oE 'alcance medido: [0-9]+ de [0-9]+ seccion' <<<"$OUT" || true)"
if [[ -n "$DEN" ]]; then
    ok "declara «$DEN»"
    MED="$(sed -E 's/.*: ([0-9]+) de ([0-9]+).*/\1/' <<<"$DEN")"
    TOT="$(sed -E 's/.*: ([0-9]+) de ([0-9]+).*/\2/' <<<"$DEN")"
    [[ "$MED" == "$TOT" ]] \
        && ok "las $TOT secciones estan instrumentadas" \
        || bad "$MED de $TOT medidas — $((TOT-MED)) seccion(es) sin tick: su tiempo se reparte en silencio"
    # El denominador se contrasta con un conteo INDEPENDIENTE de las secciones
    # del guion — bloques, no lineas de guiones. Si alguien anade una seccion
    # sin su tick, este caso lo ve; el conteo propio del guion no podria.
    REAL="$(python3 - "$GUION" <<'PYSEC'
import re, sys
L = open(sys.argv[1], encoding='utf-8').read().splitlines()
n, i = 0, 0
while i < len(L):
    if re.match(r'^# --- (.+?) -+\s*$', L[i]) and 'cronometro por gate' not in L[i]:
        n += 1; i += 1; continue
    if re.match(r'^# -{10,}\s*$', L[i]):
        j = i
        while j < len(L) and re.match(r'^# -{10,}\s*$', L[j]): j += 1
        texto = []
        while j < len(L) and L[j].startswith('#') and not re.match(r'^# -{10,}\s*$', L[j]):
            texto.append(L[j].lstrip('# ').rstrip()); j += 1
        while j < len(L) and re.match(r'^# -{10,}\s*$', L[j]): j += 1
        if any(texto): n += 1
        i = j; continue
    i += 1
print(n)
PYSEC
)"
    [[ "$TOT" == "$REAL" ]] \
        && ok "el denominador coincide con las secciones reales del guion ($REAL)" \
        || bad "denominador $TOT vs $REAL secciones medidas aparte — hay seccion sin tick"
else
    bad "sin denominador: una instrumentacion parcial se leeria completa"
fi

echo "=== Caso 5: el total del desglose se publica y no excede el reloj ==="
grep -qE '^## Desglose por gate.*total [0-9]+ ms' <<<"$OUT" \
    && ok "el encabezado trae el total" \
    || bad "el desglose no publica su total"

echo "=== Caso 6: --timing NO rompe lo que el hook parsea ==="
grep -q '^## Score: ' <<<"$OUT" \
    && ok "la linea Score sigue presente" \
    || bad "el hook de arranque dejaria de leer el score"

[[ $fail -eq 0 ]] && echo "audit-timing: todo en verde" || echo "audit-timing: HAY FALLOS"
exit $fail
