#!/usr/bin/env bash
# Prueba `verificar_persistencia.py` en los DOS sentidos, con un positivo REAL
# del repo (no fabricado) — la exigencia de `hallazgo-abierto-genera-sucesor.md`
# tras haber publicado ceros falsos tres veces.
#
#   bash .claude/scripts/tests/test-verificar-persistencia.sh
#     exit 0 = todas las aserciones pasan
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GUION="$RAIZ/.claude/scripts/gates/verificar_persistencia.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ok=0; fallas=0
afirma() {  # afirma <nombre> <exit-esperado> <comando...>
  local nombre="$1" esperado="$2"; shift 2
  "$@" >"$TMP/salida" 2>&1; local real=$?
  if [[ "$real" == "$esperado" ]]; then ok=$((ok+1)); echo "  OK    $nombre (exit $real)"
  else fallas=$((fallas+1)); echo "  FALLA $nombre: exit $real, esperaba $esperado"; sed 's/^/        /' "$TMP/salida"; fi
}

# --- positivo: un .rst REAL del repo, seguido por git y con `.. meta::` -------
REAL="$(git -C "$RAIZ" ls-files -- 'source/gestion/pm/*/iniciativas/*/hallazgos/hallazgo-*.rst' | head -1)"
if [[ -z "$REAL" ]]; then echo "FALLA: no hay ningún hallazgo en el repo con el que probar"; exit 1; fi
afirma "hallazgo real del repo" 0 python3 "$GUION" "$RAIZ/$REAL"

# --- negativos: los cuatro modos de nivel 4 que este instrumento debe ver -----
afirma "ruta inexistente" 1 python3 "$GUION" /no/existe/nada.rst
: > "$TMP/vacio.rst"
afirma "archivo vacío" 1 python3 "$GUION" "$TMP/vacio.rst"
python3 -c "open('$TMP/sin-meta.rst','w').write('t\n=\n'+'cuerpo '*200)"
afirma "rst sin bloque .. meta::" 1 python3 "$GUION" "$TMP/sin-meta.rst"
afirma "ruta relativa" 1 python3 "$GUION" informe.rst

# --- fuera de todo repo git: existe, tiene meta, y aun así no es durable -----
python3 -c "open('$TMP/suelto.rst','w').write('.. meta::\n   :autor: x\n\nt\n=\n'+'cuerpo '*200)"
afirma "rst completo fuera de repo git" 1 python3 "$GUION" "$TMP/suelto.rst"

# --- --desde: un archivo preexistente no lo escribió este trabajo ------------
afirma "mtime anterior a --desde" 1 python3 "$GUION" "$RAIZ/$REAL" --desde 2099-01-01T00:00:00
afirma "mtime posterior a --desde" 0 python3 "$GUION" "$RAIZ/$REAL" --desde 2000-01-01T00:00:00

# --- --promover: exige --agente, y NO promueve si algo falla ----------------
afirma "--promover sin --agente" 2 python3 "$GUION" "$RAIZ/$REAL" --promover
cp "$RAIZ/.claude/agent-results/agent_store.sqlite3" "$TMP/store.sqlite3" 2>/dev/null || true
if [[ -f "$TMP/store.sqlite3" ]]; then
  AG="$(python3 -c "
import sqlite3
c=sqlite3.connect('$TMP/store.sqlite3')
r=c.execute('select agent_id from agent_sessions limit 1').fetchone()
print(r[0] if r else '')")"
  afirma "no promueve si una ruta falla" 1 \
    python3 "$GUION" "$RAIZ/$REAL" /no/existe.rst --agente "$AG" --promover --store "$TMP/store.sqlite3"
  N="$(python3 -c "
import sqlite3
print(sqlite3.connect('$TMP/store.sqlite3').execute(
  'select count(*) from agent_sessions where retention_level=2').fetchone()[0])")"
  if [[ "$N" == "0" ]]; then ok=$((ok+1)); echo "  OK    el store sigue sin ningún nivel 2 tras la falla"
  else fallas=$((fallas+1)); echo "  FALLA se escribió nivel 2 pese a la ruta rota ($N filas)"; fi

  afirma "promueve con todo en verde" 0 \
    python3 "$GUION" "$RAIZ/$REAL" --agente "$AG" --promover --store "$TMP/store.sqlite3"
  N="$(python3 -c "
import sqlite3
print(sqlite3.connect('$TMP/store.sqlite3').execute(
  'select count(*) from agent_sessions where retention_level=2').fetchone()[0])")"
  if [[ "$N" == "1" ]]; then ok=$((ok+1)); echo "  OK    el store tiene exactamente 1 fila en nivel 2"
  else fallas=$((fallas+1)); echo "  FALLA filas en nivel 2 = $N, esperaba 1"; fi
fi

echo
echo "$ok OK · $fallas fallas"
[[ "$fallas" == 0 ]]
