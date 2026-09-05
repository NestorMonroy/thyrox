#!/bin/bash
# =============================================================================
# test-gitattributes.sh — pruebas de check_gitattributes.py
# =============================================================================
# Estatico: no toca los cinco repos reales. Arma arboles sinteticos bajo un
# temporal y apunta el gate ahi con CHECK_GITATTRIBUTES_REPOS_ROOT.
#
# El caso 4 es el CONTROL ANULADO. Sin el, un verde en los casos 2-3 no
# distingue «el gate compara el contrato» de «el gate solo mira que el
# archivo exista»: se sustituye la comparacion por un `test -f` pelado y se
# exige que caigan EXACTAMENTE los insumos que dependen de ella. `test -f` no
# es un ejemplo inventado — es el control que `niveles-de-retencion.md` nombra
# como el que NO discrimina.
#
# El caso 5 es el POSITIVO REAL: el .gitattributes que los cinco repos ya
# tienen en disco tiene que pasar. Un gate probado solo contra insumos que
# fabrico quien escribio el patron hereda su encuadre.
#
# Uso:  bash .claude/scripts/tests/test-gitattributes.sh
# =============================================================================
set -uo pipefail

DOCS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$DOCS_ROOT/.claude/scripts/gates/check_gitattributes.py"
OK=0
FALLOS=0

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

comprobar() {  # comprobar <descripcion> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        OK=$((OK + 1))
    else
        FALLOS=$((FALLOS + 1))
        printf 'FALLO: %s\n  esperado: %s\n  obtenido: %s\n' "$1" "$2" "$3" >&2
    fi
}

CANONICO='* text=auto
*.sh text eol=lf
*.py text eol=lf'

# sembrar <raiz> <contenido-para-api>  -> los otros cuatro salen canonicos
sembrar() {
    local raiz="$1" contenido_api="$2" r
    rm -rf "$raiz"
    for r in api db docs server ui; do
        mkdir -p "$raiz/kaupamex-$r"
        if [[ "$r" == "api" ]]; then
            [[ "$contenido_api" == "__SIN_ARCHIVO__" ]] || \
                printf '%s\n' "$contenido_api" > "$raiz/kaupamex-$r/.gitattributes"
        else
            printf '%s\n' "$CANONICO" > "$raiz/kaupamex-$r/.gitattributes"
        fi
    done
}

# correr <raiz> -> imprime el codigo de salida de --strict
correr() {
    CHECK_GITATTRIBUTES_REPOS_ROOT="$1" \
        python3 "$GATE" --quiet --strict >/dev/null 2>&1
    echo "$?"
}

# --- Caso 0: el gate existe y es invocable -----------------------------------
comprobar "0a. el gate existe" "si" \
    "$([[ -f "$GATE" ]] && echo si || echo no)"
comprobar "0b. --help sale 0" "0" \
    "$(python3 "$GATE" --help >/dev/null 2>&1; echo $?)"

# --- Caso 1: los cinco canonicos -> exit 0 -----------------------------------
sembrar "$TMP/limpio" "$CANONICO"
comprobar "1. cinco repos con el contrato completo" "0" "$(correr "$TMP/limpio")"

# --- Caso 2: cada defecto por separado -> exit 1 -----------------------------
sembrar "$TMP/sin-archivo" "__SIN_ARCHIVO__"
comprobar "2a. un repo sin .gitattributes" "1" "$(correr "$TMP/sin-archivo")"

sembrar "$TMP/incompleto" '* text=auto'
comprobar "2b. falta una directiva (solo text=auto)" "1" "$(correr "$TMP/incompleto")"

sembrar "$TMP/duplicado" "$CANONICO
* text=auto"
comprobar "2c. directiva duplicada" "1" "$(correr "$TMP/duplicado")"

sembrar "$TMP/sobrante" "$CANONICO
*.md text eol=crlf"
comprobar "2d. directiva ajena al contrato" "1" "$(correr "$TMP/sobrante")"

sembrar "$TMP/vacio" '# solo un comentario'
comprobar "2e. archivo sin directivas efectivas" "1" "$(correr "$TMP/vacio")"

# --- Caso 3: los comentarios y las lineas vacias NO cuentan ------------------
sembrar "$TMP/comentado" "# El contrato de texto del monorepo.

* text=auto

*.sh text eol=lf
*.py text eol=lf
"
comprobar "3. comentarios y lineas vacias no son divergencia" "0" \
    "$(correr "$TMP/comentado")"

# --- Caso 4: CONTROL ANULADO -------------------------------------------------
# Se sustituye la comparacion contra el contrato por un `test -f` pelado y se
# recorren los MISMOS insumos. Los cuatro que TIENEN archivo tienen que dejar
# de caer; el que no lo tiene sigue cayendo — y esa asimetria es justo lo que
# demuestra que el gate real mide el contenido y no la existencia.
anulado() {  # anulado <raiz> -> 1 si algun repo carece de .gitattributes
    local raiz="$1" r
    for r in api db docs server ui; do
        [[ -f "$raiz/kaupamex-$r/.gitattributes" ]] || { echo 1; return; }
    done
    echo 0
}

CON_CONTENIDO=( "$TMP/incompleto" "$TMP/duplicado" "$TMP/sobrante" "$TMP/vacio" )
CAEN_CON_EL_GATE=0
CAEN_ANULADO=0
for raiz in "${CON_CONTENIDO[@]}"; do
    [[ "$(correr "$raiz")"  == "1" ]] && CAEN_CON_EL_GATE=$((CAEN_CON_EL_GATE + 1))
    [[ "$(anulado "$raiz")" == "1" ]] && CAEN_ANULADO=$((CAEN_ANULADO + 1))
done
comprobar "4a. con el gate, los 4 defectos de contenido se rechazan" "4" "$CAEN_CON_EL_GATE"
comprobar "4b. anulado, NINGUNO se rechaza — el gate mide el contrato" "0" "$CAEN_ANULADO"
comprobar "4c. anulado sigue viendo el archivo ausente (no es ciego a todo)" "1" \
    "$(anulado "$TMP/sin-archivo")"

# --- Caso 5: POSITIVO REAL — el arbol de verdad pasa -------------------------
# No lo fabrica la prueba: es el .gitattributes que los cinco repos tienen.
comprobar "5a. el arbol real pasa el gate" "0" \
    "$(python3 "$GATE" --quiet --strict >/dev/null 2>&1; echo $?)"

MEDIDOS="$(python3 "$GATE" --quiet 2>/dev/null | grep -oE 'alcance medido: [0-9]+' | grep -oE '[0-9]+')"
if [[ -z "$MEDIDOS" || "$MEDIDOS" -eq 0 ]]; then
    # Sin repos medidos el caso 5 no midio nada: se declara, no se da por bueno.
    printf 'AVISO: 0 repos medidos — el caso 5 no midio nada\n' >&2
    FALLOS=$((FALLOS + 1))
else
    comprobar "5b. el gate publica su denominador (>0 repos medidos)" "si" "si"
fi

# --- Caso 5c: el que faltaba — que GIT acepte lo que el gate acepta ---------
# La primera version del gate exigia el comentario AL FINAL de la directiva, y
# git no admite comentario en linea: parsea el `#` como nombre de atributo y
# descarta la linea entera. El gate daba verde sobre una directiva inerte.
#
# Ningun caso de esta suite lo veia, porque todos median el ARCHIVO y ninguno
# preguntaba a git si el atributo resuelve. Lo destapo el aviso del propio git
# al commitear. Esta asercion cierra ese hueco: el veredicto lo da git.
if [[ -f "$DOCS_ROOT/.gitattributes" ]]; then
    ATTR="$(git -C "$DOCS_ROOT" check-attr merge -- \
                .claude/agent-results/agent_store.sqlite3 2>&1)"
    comprobar "5c. git resuelve el atributo declarado (no 'unspecified')" "si" \
        "$(grep -q 'merge: sqlite-union' <<<"$ATTR" && echo si || echo no)"
    comprobar "5d. git no rechaza ninguna linea del archivo" "no" \
        "$(grep -q 'is not a valid attribute name' <<<"$ATTR" && echo si || echo no)"
else
    printf 'AVISO: no hay .gitattributes en %s — 5c/5d no midieron nada\n' "$DOCS_ROOT" >&2
    FALLOS=$((FALLOS + 2))
fi

# --- Caso 5e: CONTROL ANULADO del 5c — la forma que git rechaza -------------
# Se reproduce el defecto original en un repo de laboratorio: la misma
# directiva con su comentario al final. Si git la aceptara, 5c no probaria nada.
LAB="$TMP/inline"
mkdir -p "$LAB"; git -C "$LAB" init -q
printf '* text=auto\nstore.sqlite3 merge=sqlite-union  # comentario en linea\n' \
    > "$LAB/.gitattributes"
ATTR_LAB="$(git -C "$LAB" check-attr merge -- store.sqlite3 2>&1)"
comprobar "5e. con el comentario al final, git NO resuelve el atributo" "si" \
    "$(grep -q 'merge: unspecified' <<<"$ATTR_LAB" && echo si || echo no)"
printf '# el comentario va en su propia linea\nstore.sqlite3 merge=sqlite-union\n' \
    >> "$LAB/.gitattributes"
comprobar "5f. y el gate marca esa forma como divergencia" "1" \
    "$(CHECK_GITATTRIBUTES_REPOS_ROOT="$TMP/lab-inline" python3 - "$LAB" "$GATE" <<'PY'
import pathlib, subprocess, sys, tempfile
lab, gate = sys.argv[1], sys.argv[2]
raiz = pathlib.Path(tempfile.mkdtemp())
repo = raiz / "kaupamex-docs"; repo.mkdir()
(repo / ".gitattributes").write_text(
    "* text=auto\n*.sh text eol=lf\n*.py text eol=lf\n"
    "store.sqlite3 merge=sqlite-union  # comentario en linea\n", encoding="utf-8")
r = subprocess.run([sys.executable, gate, "--quiet", "--strict"],
                   env={"CHECK_GITATTRIBUTES_REPOS_ROOT": str(raiz), "PATH": "/usr/bin:/bin"},
                   capture_output=True)
print(r.returncode)
PY
)"

# --- Caso 6: un repo ausente NO se cuenta como aprobado ----------------------
sembrar "$TMP/parcial" "$CANONICO"
rm -rf "$TMP/parcial/kaupamex-server"
SALIDA="$(CHECK_GITATTRIBUTES_REPOS_ROOT="$TMP/parcial" python3 "$GATE" --quiet 2>&1)"
comprobar "6a. con un repo fuera, el alcance baja a 4" "si" \
    "$(grep -q 'alcance medido: 4 de 5' <<<"$SALIDA" && echo si || echo no)"
comprobar "6b. el repo ausente se nombra" "si" \
    "$(grep -q 'no medidos: kaupamex-server' <<<"$SALIDA" && echo si || echo no)"
comprobar "6c. un repo ausente no hace fallar al gate" "0" "$(correr "$TMP/parcial")"

printf 'test-gitattributes: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[[ "$FALLOS" -eq 0 ]]
