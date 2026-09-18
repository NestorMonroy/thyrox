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
# Uso:  bash tests/legacy/test-coordinator-sin-worktree.sh
# =============================================================================

set -uo pipefail

# Arranque — DOS entradas, ambas de entorno (DEC-04): el VALOR de la raiz
# y la RUTA a su declaracion. Los dos literales que el ultimo recurso
# necesita van tras constantes que el entorno tambien fija: cablearlos le
# quitaria al consumidor la decision de donde van las cosas.
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
REPO="$RAIZ"
SUT="$RAIZ/src/verify/check_agent_isolation.py"
CONTRATO="$REPO/_references/coordinator-integration.md"

# El SUJETO mide el CONSUMIDOR —el gate lo dice en su propio comentario: «los
# agentes que se miden son los suyos»— y esta suite corre desde el PROVEEDOR.
# Sin declararlo, `reach.consumer_root` REHUSA y el gate muere con un
# traceback: sus cuatro casos publicaban rojos que no eran del sujeto. Es la
# costura que TASK-THYROX-0055 ya cerro para otras suites.
#
# El conjunto de directorios se DERIVA de las raices del alcance, no se
# transcribe: citaba `.claude/agents` relativo, y este arbol no lo tiene —sus
# definiciones viven en `src/agents/definitions` y de ahi se EMITEN al clon—.
# Un `grep` sobre un directorio ausente devuelve 0, que es un verde que no
# distingue «ningun agente promete worktree» de «no habia agentes que mirar».
#
# Y no se elige UN consumidor: medido, tres de las cinco raices tienen
# `.claude/agents` y dos no. Quedarse con una publicaria su cero como el del
# arbol, que es el defecto que el denominador del gate existe para impedir.
DIRS_AGENTES=()
while IFS= read -r _raiz; do
  [[ -d "$_raiz/.claude/agents" ]] && DIRS_AGENTES+=("$_raiz/.claude/agents")
done < <(python3 "$RAIZ/src/paths/reach_roots.py" --paths)
if [[ "${#DIRS_AGENTES[@]}" -eq 0 ]]; then
  echo "== SIN MEDIR: ninguna raiz del alcance tiene .claude/agents"
  echo "Resultado: 0 ok, 0 fallas — SIN MEDIR"
  exit 0
fi
# `--dir` es repetible; el gate publica cuantos directorios midio.
DIR_ARGS=()
for _d in "${DIRS_AGENTES[@]}"; do DIR_ARGS+=(--dir "$_d"); done

# La ruta HISTORICA es otra cosa: un camino dentro de un arbol de git, no del
# filesystem de hoy. Vive aparte para que renombrar el hogar vivo no la mueva.
DIR_AGENTES_HISTORICO=".claude/agents"

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
# `log -S` busca una CADENA, no un regex: reusar el de sed haria que `^` y `$`
# se buscaran como caracteres y el conteo saliera siempre cero.
CLAVE_ISOLATION_LITERAL="isolation: worktree"
# El gate acepta TRES formas de anuncio. Aqui vivia `[Ww]orktree aislad`, que
# es UNA: contar con ella dejaria fuera a quien anuncie con otra, y el conteo
# corto se leeria como «pocos anuncian». Se le pregunta al gate.
PATRON_ANUNCIO_DEL_GATE="$(python3 -c "
import sys; sys.path.insert(0, '$RAIZ/src/verify')
import check_agent_isolation as g
print(g.ANUNCIA.pattern)
")"
FALTA_ANUNCIO="declara y NO anuncia"
FALTA_DECLARACION="anuncia y NO declara"

# Marcas que el gate y el contrato deben publicar.
MARCA_DENOMINADOR="alcance medido"
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

echo "== HEAD: los dos signos del aislamiento coinciden en todo agente =="
# El rotulo era «el arbol no declara aislamiento en ningun agente», y con el
# dos aserciones exigian CERO declarantes y CERO anunciantes. Eso es un
# snapshot del arbol de docs tras `ed727b96`, no el contrato del gate: medido
# sobre el universo real, 30 agentes declaran Y anuncian el aislamiento de
# forma coherente. Enshrinar un cero que varia por clon convierte el caso en
# una fotografia, no en un control.
#
# Lo que el gate garantiza —y lo unico que se afirma aqui— es la COHERENCIA:
# quien declara, anuncia. Puede fallar, y fallo: antes de este pase habia 36
# declarantes contra 30 anunciantes, y el gate nombraba los 6.
python3 "$SUT" "${DIR_ARGS[@]}" --strict >/dev/null 2>&1
check "exit 0 sobre ${#DIRS_AGENTES[@]} directorio(s)" "0" "$?"
check "--quiet imprime 0 incoherentes" "0" "$(python3 "$SUT" "${DIR_ARGS[@]}" --quiet 2>/dev/null | tail -1)"

# Los dos conteos se toman de instrumentos distintos: el del gate y un grep
# con SU MISMO patron, extraido del gate en vez de transcrito. Que coincidan
# es la invariante; que los tome el mismo codigo seria medirse a si mismo.
N_DECLARAN="$(python3 "$SUT" "${DIR_ARGS[@]}" 2>/dev/null \
                | sed -n 's/.*OK — 0 incoherentes, \([0-9]*\) declaran.*/\1/p')"
# `find` y no un glob entre comillas: dentro de comillas el patron no expande
# y `grep` recibe un nombre literal inexistente — un cero que no distingue
# «ninguno anuncia» de «no mire ningun archivo».
mapfile -t ARCHIVOS_AGENTE < <(find "${DIRS_AGENTES[@]}" -maxdepth 1 -name '*.md')
N_ANUNCIAN="$(grep -licE "$PATRON_ANUNCIO_DEL_GATE" "${ARCHIVOS_AGENTE[@]}" 2>/dev/null | wc -l)"
check "declarantes y anunciantes coinciden" "$N_DECLARAN" "$N_ANUNCIAN"

echo "== el gate publica su denominador =="
check "el reporte declara el alcance medido" "1" \
      "$(python3 "$SUT" "${DIR_ARGS[@]}" 2>/dev/null | grep -c "$MARCA_DENOMINADOR")"

# ---------------------------------------------------------------------------
# Control positivo REAL — un arbol del repo donde el defecto esta VIVO.
# NO se toca el working tree: `git show` escribe a un directorio temporal.
#
# El commit se DERIVA, no se transcribe. Citaba `ed727b96`, que no existe en
# ninguno de los cinco clones ni en este arbol —medido: `cat-file -t` falla en
# los cinco—, asi que el control quedaba permanentemente OMITIDO y la suite
# contaba ese SIN MEDIR como fallo. Honesto, y permanente: nunca podia cerrar.
#
# Ahora se busca en el consumidor el commit que cambio la cuenta de la clave, y
# se prueba POR CONDUCTA cual de los dos arboles —el commit o su padre— tiene
# el defecto. Asumir que siempre es el padre seria suponer que ese commit lo
# retira, y `-S` tambien encuentra al que lo introdujo.
# ---------------------------------------------------------------------------
ANTES="$(mktemp -d)"
trap 'rm -rf "$ANTES"' EXIT

REPO_HISTORICO=""
ARBOL_CON_DEFECTO=""
for _dir in "${DIRS_AGENTES[@]}"; do
  _repo="${_dir%/.claude/agents}"
  while IFS= read -r _commit; do
    [[ -z "$_commit" ]] && continue
    for _arbol in "$_commit^" "$_commit"; do
      rm -rf "${ANTES:?}"/*
      while IFS= read -r _f; do
        git -C "$_repo" show "$_arbol:$_f" > "$ANTES/$(basename "$_f")" 2>/dev/null
      done < <(git -C "$_repo" ls-tree --name-only "$_arbol" \
                 "$DIR_AGENTES_HISTORICO/" 2>/dev/null)
      if [[ "$(python3 "$SUT" --dir "$ANTES" --quiet 2>/dev/null | tail -1)" == "2" ]]; then
        REPO_HISTORICO="$_repo"; ARBOL_CON_DEFECTO="$_arbol"; break 3
      fi
    done
  done < <(git -C "$_repo" log -S"$CLAVE_ISOLATION_LITERAL" --format=%H \
             -n 10 -- "$DIR_AGENTES_HISTORICO/" 2>/dev/null)
done

if [[ -z "$ARBOL_CON_DEFECTO" ]]; then
  echo "== control positivo: SIN MEDIR — ningun arbol reciente tiene los 2 mudos =="
  echo "   (se buscaron 10 commits por clon con \`log -S\`; el caso NO se da por verde)"
  FAIL=$(( FAIL + 1 ))
else
  echo "== control positivo real: $ARBOL_CON_DEFECTO en $(basename "$REPO_HISTORICO") =="
  mapfile -t AGENTES_DEL_ARBOL < <(git -C "$REPO_HISTORICO" ls-tree --name-only \
                                     "$ARBOL_CON_DEFECTO" "$DIR_AGENTES_HISTORICO/")
  check "el arbol reconstruido no esta vacio" "1" \
        "$([[ "${#AGENTES_DEL_ARBOL[@]}" -gt 0 ]] && echo 1 || echo 0)"

  python3 "$SUT" --dir "$ANTES" --strict >/dev/null 2>&1
  check "exit 1 con el defecto de h-docs-311 vivo" "1" "$?"
  check "los cuenta: 2 incoherentes" "2" \
        "$(python3 "$SUT" --dir "$ANTES" --quiet 2>/dev/null | tail -1)"
  for agente in "$AGENTE_MUDO_A" "$AGENTE_MUDO_B"; do
    check "nombra a $agente" "1" \
          "$(python3 "$SUT" --dir "$ANTES" 2>/dev/null \
             | grep -c "$agente: $FALTA_ANUNCIO")"
  done

  # La otra direccion de la incoherencia, derivada del MISMO material real:
  # un coordinador coherente declaraba Y anunciaba. Al retirarle solo la
  # declaracion queda como promesa vacia — el defecto simetrico.
  if grep -q "$CLAVE_ISOLATION" "$ANTES/$AGENTE_COHERENTE" 2>/dev/null; then
    sed -i "/$CLAVE_ISOLATION/d" "$ANTES/$AGENTE_COHERENTE"
    check "detecta la promesa vacia ($FALTA_DECLARACION)" "1" \
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
