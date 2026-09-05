#!/usr/bin/env bash
# test-ids-entre-ramas.sh — casos de `check_ids_entre_ramas.py` (#5).
#
# El positivo es REAL y del repo, no fabricado: al escribir el gate habia SEIS
# colisiones vivas entre ramas remotas, y una de ellas —`h-docs-440`— la habian
# tomado `feature/kaupamex-l0` y `feature/kaupamex-l2` el mismo dia para dos
# hallazgos distintos. El caso 4 lo comprueba contra el repo de verdad, y se
# salta solo si ya no existe (la colision se cierra, y el caso lo dice en vez
# de fallar).
#
# Los casos 1-3 corren sobre un repo sintetico porque miden la MECANICA —que la
# ruta y no la rama decide, que la historia compartida no es colision— y esa
# mecanica tiene que poder probarse aunque el repo real quede limpio.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_ids_entre_ramas.py"
fail=0
ok()  { echo "  OK   $*"; }
bad() { echo "  FAIL $*"; fail=1; }
skip(){ echo "  SKIP $*"; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- Fixture: un origen con tres ramas ---------------------------------------
ORIGEN="$TMP/origen"; CLON="$TMP/clon"
git init -q --bare "$ORIGEN"
git init -q "$TMP/semilla"
cd "$TMP/semilla"
git config user.email t@t; git config user.name t
mkdir -p source/a source/b
printf '.. _h-docs-100:\n\nCompartida\n==========\n' > source/a/compartida.rst
git add -A; git commit -qm base
git branch -M develop
git remote add origin "$ORIGEN"; git push -q origin develop

# rama A: etiqueta NUEVA, sin choque
git checkout -qb feature/a
printf '.. _h-docs-101:\n\nSolo A\n======\n' > source/a/solo-a.rst
git add -A; git commit -qm a; git push -q origin feature/a

# rama B: MISMA etiqueta 101 en OTRA ruta -> colision
git checkout -q develop; git checkout -qb feature/b
printf '.. _h-docs-101:\n\nSolo B\n======\n' > source/b/solo-b.rst
git add -A; git commit -qm b; git push -q origin feature/b

git clone -q "$ORIGEN" "$CLON"
cd "$CLON"; git fetch -q origin

echo "=== Caso 1: la colision entre dos ramas se ve ==="
salida="$(python3 "$GATE" --strict 2>&1)"; rc=$?
[[ $rc -eq 1 ]] && ok "--strict sale 1" || bad "exit $rc, esperaba 1"
grep -q "_h-docs-101" <<<"$salida" && ok "nombra la etiqueta en choque" || bad "no la nombra"
grep -q "feature/a" <<<"$salida" && grep -q "feature/b" <<<"$salida" \
  && ok "nombra las dos ramas" || bad "no nombra las dos ramas"

echo "=== Caso 2: la historia compartida NO es colision ==="
grep -q "_h-docs-100" <<<"$salida" && bad "marco como colision una etiqueta compartida" \
  || ok "h-docs-100 vive en la misma ruta en las tres ramas y no se marca"

echo "=== Caso 3: --siguiente propone el primer libre ==="
sig="$(python3 "$GATE" --siguiente docs 2>&1)"
[[ "$sig" == "102" ]] && ok "propone 102 (max 101 + 1)" || bad "propuso «$sig», esperaba 102"

echo "=== Caso 3b: guard — capa sin ninguna etiqueta NO propone ==="
python3 "$GATE" --siguiente server >/dev/null 2>&1
[[ $? -eq 2 ]] && ok "exit 2, no propone un 1 inventado" || bad "deberia salir 2"

echo "=== Caso 4 (positivo real): la colision medida en kaupamex-docs ==="
cd "$RAIZ"
n="$(python3 "$GATE" --quiet 2>/dev/null)"
if [[ -z "$n" ]]; then
    bad "el gate no devolvio conteo sobre el repo real"
elif [[ "$n" -gt 0 ]]; then
    ok "el repo real tiene $n colision(es) entre ramas — el gate las ve"
else
    skip "el repo real ya no tiene colisiones; la mecanica la cubren 1-3"
fi

echo "=== Caso 5: sin --strict avisa pero no bloquea ==="
python3 "$GATE" >/dev/null 2>&1
[[ $? -eq 0 ]] && ok "sin --strict sale 0 (surfacing)" || bad "sin --strict deberia salir 0"

echo
if [[ $fail -eq 0 ]]; then echo "RESULTADO: todos los casos pasaron."; else echo "RESULTADO: hay casos fallidos."; fi
exit $fail
