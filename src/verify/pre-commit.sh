#!/usr/bin/env bash
# THYROX — el mecanismo del `pre-commit` de un consumidor. Recibe la raiz del
# consumidor como $1; el stub que lo invoca vive en `<consumidor>/.githooks/`.
#
# Por que el mecanismo esta aqui y el stub alla: `core.hooksPath` es por clon y
# NO se versiona (H-DOCS-249), asi que el archivo tiene que conservar su nombre
# y su sitio en el consumidor. Lo que se muda es el cuerpo. Mismo reparto que
# `pre-push.sh`, que lo estreno en TASK-DOCS-0465.
#
# Que mide, y por que ese alcance: la PROSA en tiempo de commit —`.rst` bajo
# `source/` y `.md` bajo `.claude/rules/`, que es el corpus que declara el gate
# de vocabulario— mas el guard de mutante sobre cualquier `.py` staged. El
# alcance es lo staged y NUNCA el arbol: medido el 2026-08-27, vocabulario
# cuesta 1204 ms por archivo (casi todo la carga de un lexico de un millon de
# formas), sintaxis 806 ms y convenciones 35 ms; el barrido completo son
# minutos.
#
# Lo que este mecanismo NO trae del hook anterior, y es deliberado: los dos
# gates de PAQUETE —`check-agent-artifacts.sh` y `check-harness-typecheck.sh`—.
# Sus superficies (`.claude/packages/{agent,harness}` y `.claude/agents`) se
# mudaron a THYROX en TASK-DOCS-0449, asi que en el consumidor no existen: sus
# bloques imprimian «la superficie del paquete no cambia en este commit» en
# CADA commit, y ese mensaje no distingue «no cambio» de «no puede cambiar
# aqui, nunca». Viven ahora en el `.githooks/pre-commit` de THYROX, que es
# donde su superficie esta.
#
# Escape hatch: `git commit --no-verify`. Si se usa, el motivo va al `progreso`
# de la iniciativa.
set -uo pipefail

CONSUMER="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATES="${THYROX_ROOT:+$THYROX_ROOT/src/verify}"
GATES="${GATES:-$HERE}"
CODE=0

# Rehusar en vez de omitir, y ANTES de medir nada. Un gate declarado que no
# esta en su sitio es un verde falso: el hook saldria 0 sin haber medido, y el
# silencio de un hook ES su contrato de exito (H-DOCS-459). Ocurrio — la
# mudanza a subdirectorios por clase dejo tres gates sin destino y apago el
# pre-commit entero sin que nada lo delatara (H-DOCS-467).
#
# Salida 2 y no 1, como en `pre-push.sh`: «no emiti un veredicto» no es «encontre
# un defecto». Git bloquea con cualquiera de las dos; el que lee la salida
# necesita saber cual de las dos cosas paso.
for gate in check_mutante_en_staging.py check_vocabulario_prosa.py \
            check_rst_sintaxis.py check_rst_convenciones.py; do
    [ -f "$GATES/$gate" ] && continue
    echo "pre-commit REHUSADO — no se encontro el gate: $GATES/$gate" >&2
    echo "  No se emite un veredicto: un 0 aqui seria un verde falso." >&2
    exit 2
done
if ! command -v python3 >/dev/null 2>&1; then
    echo "pre-commit REHUSADO — falta python3, que es lo que ejecuta los gates." >&2
    exit 2
fi

cd "$CONSUMER" || {
    echo "pre-commit REHUSADO — no se pudo entrar a $CONSUMER." >&2
    exit 2
}

# La lista de prosa. `PRECOMMIT_FILES` es el override que usa la suite para
# ejercitar el hook sin tocar el staging del repo real; sin el, el camino de
# produccion es `git diff --cached`.
FILES=()
if [ -n "${PRECOMMIT_FILES:-}" ]; then
    while IFS= read -r line; do
        [ -n "$line" ] && FILES+=("$line")
    done <<< "$PRECOMMIT_FILES"
else
    while IFS= read -r line; do
        [ -n "$line" ] && FILES+=("$CONSUMER/$line")
    done < <(
        git diff --cached --name-only --diff-filter=ACM \
            -- 'source/***.rst' '.claude/rules/***.md' 2>/dev/null || true
    )
fi

# Los `.py` staged son OTRO alcance: no son prosa, y su gate es el guard de
# mutante de sabotaje (H-DOCS-466). Se mide aparte porque el corte por «no hay
# prosa staged» no debe apagarlo — un commit de puro `.py` es exactamente el
# caso donde un mutante entraria.
PY_STAGED=()
if [ -n "${PRECOMMIT_PY:-}" ]; then
    while IFS= read -r line; do
        [ -n "$line" ] && PY_STAGED+=("$line")
    done <<< "$PRECOMMIT_PY"
else
    while IFS= read -r line; do
        [ -n "$line" ] && PY_STAGED+=("$CONSUMER/$line")
    done < <(git diff --cached --name-only --diff-filter=ACM -- '***.py' 2>/dev/null || true)
fi

if [ "${#PY_STAGED[@]}" -gt 0 ]; then
    python3 "$GATES/check_mutante_en_staging.py" "${PY_STAGED[@]}" || CODE=1
fi

# Los `.rst` se miden ademas por sintaxis y convenciones; un `.md` de reglas no
# es RST y esos dos gates no le aplican.
RST=()
for f in "${FILES[@]}"; do
    [ "${f%.rst}" != "$f" ] && RST+=("$f")
done

run_gate() {  # run_gate <script> <files...>
    local script="$GATES/$1"; shift
    python3 "$script" --strict "$@" || return 1
}

if [ "${#FILES[@]}" -gt 0 ]; then
    run_gate check_vocabulario_prosa.py "${FILES[@]}" || CODE=1
else
    echo "check-vocabulario-prosa: no hay prosa staged en este commit"
fi

if [ "${#RST[@]}" -gt 0 ]; then
    run_gate check_rst_sintaxis.py     "${RST[@]}" || CODE=1
    run_gate check_rst_convenciones.py "${RST[@]}" || CODE=1
fi

if [ "$CODE" -ne 0 ]; then
    cat >&2 <<'AVISO'

pre-commit: un gate bloqueo el commit.

  Dos familias, cada una con su alcance propio:
  · PROSA   -> .rst de source/ y .md de .claude/rules/
  · MUTANTE -> cualquier .py staged

  · forma vetada        -> su sustitucion esta en `redaccion-tecnica-es.md`.
    Si el texto la CITA en vez de usarla, ponla en literal ``asi``: el gate
    reconoce la cita marcada, y la sin marcar no.
  · sustantivo inventado -> antes de acunar uno, la cuarta prueba de
    `redaccion-tecnica-es.md`. Si de verdad no se traduce, va al baseline
    CON su motivo escrito.
  · sintaxis o convencion RST -> el gate nombra el archivo y la linea.
  · mutante de sabotaje vivo  -> lo dejo un `check_suite_discrimina.py` que
    murio sin restaurar. Se restaura con su `--verificar`, no se commitea.

El arreglo es el texto, no el bypass. Si hace falta saltarlo de todos modos,
`git commit --no-verify`, y el motivo va al `progreso` de la iniciativa.
AVISO
fi

exit "$CODE"
