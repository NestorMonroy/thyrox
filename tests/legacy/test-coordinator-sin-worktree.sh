#!/bin/bash
# =============================================================================
# test-coordinator-sin-worktree.sh — prueba del gate de aislamiento de agentes
# =============================================================================
#
# Mide `check_agent_isolation.py`: que el aislamiento DECLARADO en el
# frontmatter y el ANUNCIADO en la `description` coincidan.
#
# El control positivo es **real del repo**, no fabricado: se reconstruyen los
# agentes tal como estaban ANTES del commit que retiró el aislamiento, y se
# comprueba que el gate nombra a los dos que lo declaraban sin anunciarlo. Un
# incumplidor escrito a mano por quien escribió el patrón hereda su encuadre y
# confirma el instrumento en vez de probarlo
# (`hallazgo-abierto-genera-sucesor.md`).
#
# Uso:  bash .claude/scripts/tests/test-coordinator-sin-worktree.sh
# =============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$SCRIPT_DIR/../.." && pwd)"
SUT="$SCRIPT_DIR/gates/check_agent_isolation.py"
DIR_AGENTES=".claude/agents"
CONTRATO="$REPO/.claude/references/coordinator-integration.md"

# El commit que retiró `isolation: worktree` de los doce coordinadores. Su
# PADRE es el árbol donde el defecto de :ref:`h-docs-311` está vivo.
FIX="ed727b96"
ARBOL_CON_DEFECTO="$FIX^"

# Los dos agentes que en ese árbol declaraban el aislamiento SIN anunciarlo:
# el control positivo real. El tercero lo anunciaba Y lo declaraba, así que
# retirarle sólo la declaración produce el defecto simétrico.
AGENTE_MUDO_A="pm-coordinator.md"
AGENTE_MUDO_B="thyrox-coordinator.md"
AGENTE_COHERENTE="rup-coordinator.md"

CLAVE_ISOLATION="^isolation: worktree$"
PATRON_ANUNCIO='[Ww]orktree aislad'
FALTA_ANUNCIO="declara y NO anuncia"
FALTA_DECLARACION="anuncia y NO declara"

# Marcas que el gate y el contrato deben publicar.
MARCA_DENOMINADOR="alcance medido"
MARCA_SIN_AISLAMIENTO="0 declaran aislamiento"
MARCA_CRITERIO="cuándo se declara"
MARCA_AUTORIDAD="mutate files in parallel"
MARCA_CONSOLIDACION="consolidaci"

cd "$REPO" || exit 1

PASS=0; FAIL=0
check() {
  if [[ "$2" == "$3" ]]; then
    PASS=$(( PASS + 1 )); printf '  ok    %s\n' "$1"
  else
    FAIL=$(( FAIL + 1 )); printf '  FALLA %s\n        esperado: %s\n        obtenido: %s\n' "$1" "$2" "$3"
  fi
}

echo "== HEAD: el árbol no declara aislamiento en ningún agente =="
python3 "$SUT" --strict >/dev/null 2>&1
check "exit 0 sobre $DIR_AGENTES" "0" "$?"
check "--quiet imprime 0 incoherentes" "0" "$(python3 "$SUT" --quiet 2>/dev/null | tail -1)"
check "0 agentes declaran aislamiento" "1" \
      "$(python3 "$SUT" 2>/dev/null | grep -c "$MARCA_SIN_AISLAMIENTO")"
check "0 descripciones prometen worktree" "0" \
      "$(grep -lE "$PATRON_ANUNCIO" "$DIR_AGENTES"/*.md 2>/dev/null | wc -l)"

echo "== el gate publica su denominador =="
check "el reporte declara el alcance medido" "1" \
      "$(python3 "$SUT" 2>/dev/null | grep -c "$MARCA_DENOMINADOR")"

# ---------------------------------------------------------------------------
# Control positivo REAL — el árbol previo a ed727b96, reconstruido desde git.
# NO se toca el working tree: `git show` escribe a un directorio temporal.
# ---------------------------------------------------------------------------
ANTES="$(mktemp -d)"
trap 'rm -rf "$ANTES"' EXIT

# El denominador se DERIVA del árbol medido; escribirlo a mano lo convertiría
# en una cifra-propiedad que envejece al añadir un agente
# (`calibration-verified-numbers.md`).
mapfile -t AGENTES_DEL_ARBOL < <(git ls-tree --name-only "$ARBOL_CON_DEFECTO" \
                                   "$DIR_AGENTES/" 2>/dev/null)
N_ESPERADOS=${#AGENTES_DEL_ARBOL[@]}
N_ANTES=0
for f in "${AGENTES_DEL_ARBOL[@]}"; do
  git show "$ARBOL_CON_DEFECTO:$f" > "$ANTES/$(basename "$f")" 2>/dev/null \
    && N_ANTES=$(( N_ANTES + 1 ))
done

if [[ "$N_ESPERADOS" -eq 0 ]]; then
  echo "== control positivo: OMITIDO — $ARBOL_CON_DEFECTO no alcanzable en este clon =="
  echo "   (un clon shallow no tiene el padre; el caso queda SIN MEDIR, no en verde)"
  FAIL=$(( FAIL + 1 ))
else
  echo "== control positivo real: los agentes ANTES de $FIX =="
  check "se reconstruyó el árbol completo" "$N_ESPERADOS" "$N_ANTES"

  python3 "$SUT" --dir "$ANTES" --strict >/dev/null 2>&1
  check "exit 1 con el defecto de h-docs-311 vivo" "1" "$?"
  check "los cuenta: 2 incoherentes" "2" \
        "$(python3 "$SUT" --dir "$ANTES" --quiet 2>/dev/null | tail -1)"
  for agente in "$AGENTE_MUDO_A" "$AGENTE_MUDO_B"; do
    check "nombra a $agente" "1" \
          "$(python3 "$SUT" --dir "$ANTES" 2>/dev/null \
             | grep -c "$agente: $FALTA_ANUNCIO")"
  done

  # La otra dirección de la incoherencia, derivada del MISMO material real:
  # el coordinador coherente declaraba Y anunciaba. Al retirarle sólo la
  # declaración queda como promesa vacía — el defecto simétrico.
  if grep -q "$CLAVE_ISOLATION" "$ANTES/$AGENTE_COHERENTE"; then
    sed -i "/$CLAVE_ISOLATION/d" "$ANTES/$AGENTE_COHERENTE"
    check "detecta la promesa vacía ($FALTA_DECLARACION)" "1" \
          "$(python3 "$SUT" --dir "$ANTES" 2>/dev/null \
             | grep -c "$AGENTE_COHERENTE: $FALTA_DECLARACION")"
    check "sube a 3 incoherentes" "3" \
          "$(python3 "$SUT" --dir "$ANTES" --quiet 2>/dev/null | tail -1)"
  else
    echo "  FALLA $AGENTE_COHERENTE no declaraba aislamiento en $ARBOL_CON_DEFECTO"
    FAIL=$(( FAIL + 1 ))
  fi
fi

echo "== el contrato declara el criterio (#751) =="
check "nombra cuándo se declara el aislamiento" "1" \
      "$(grep -c "$MARCA_CRITERIO" "$CONTRATO")"
check "cita la condición del tool Agent" "1" \
      "$(grep -c "$MARCA_AUTORIDAD" "$CONTRATO")"
check "declara el pase de consolidación" "1" \
      "$(grep -c "$MARCA_CONSOLIDACION" "$CONTRATO" | awk '{print ($1>0)?1:0}')"

echo
echo "Resultado: $PASS ok, $FAIL fallas"
[[ "$FAIL" -eq 0 ]] || exit 1
