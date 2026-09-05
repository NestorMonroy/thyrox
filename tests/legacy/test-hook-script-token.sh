#!/bin/bash
# =============================================================================
# test-hook-script-token.sh — pruebas de check_hook_script_token.py
# =============================================================================
# Estatico: arma un settings.json sintetico bajo un temporal y apunta el gate
# ahi con CHECK_HOOK_TOKEN_REPOS_ROOT. Los scripts que los comandos citan se
# crean de verdad en disco — es la unica forma de que el control anulado sea
# informativo (ver caso 3).
#
# El caso 3 es el CONTROL ANULADO, y aqui tiene una forma particular: el
# control que se anula es la PREMISA ORIGINAL de arranque_de_clon —«el primer
# token de ruta es el script; si existe, el hook esta bien»—. Los insumos se
# construyen con todos sus scripts presentes, asi que bajo esa premisa los
# cinco pasan. El gate real los rechaza: eso es lo que demuestra que mide la
# forma del comando y no la existencia del archivo.
#
# El caso 4 es el POSITIVO REAL: `python3 …/lint_agents.py || true` esta en
# api/settings.json desde antes de este gate. Lleva un separador y NO es un
# defecto — su unico segmento con ruta es el script. Un gate que marcara todo
# comando con `||` lo daria por opaco, y esa es justo la clase de falso
# positivo que un insumo fabricado por quien escribe el patron no destapa.
#
# Uso:  bash .claude/scripts/tests/test-hook-script-token.sh
# =============================================================================
set -uo pipefail

DOCS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$DOCS_ROOT/.claude/scripts/gates/check_hook_script_token.py"
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

# --- Arbol sintetico: los scripts citados EXISTEN --------------------------
CLAUDE="$TMP/repos/kaupamex-docs/.claude"
mkdir -p "$CLAUDE/hooks" "$CLAUDE/scripts"
for f in uno.sh dos.sh; do printf '#!/bin/bash\nexit 0\n' > "$CLAUDE/hooks/$f"; done
printf 'x\n' > "$CLAUDE/scripts/datos.txt"
printf 'print()\n'  > "$CLAUDE/scripts/uno.py"

# sembrar <comando> -> escribe un settings.json con ese unico hook
sembrar() {
    python3 - "$CLAUDE/settings.json" "$1" <<'PY'
import json, sys
destino, comando = sys.argv[1], sys.argv[2]
json.dump({"hooks": {"SessionStart": [{"hooks": [{"type": "command",
          "command": comando}]}]}}, open(destino, "w"), indent=2)
PY
}

# correr -> imprime el codigo de salida de --strict sobre el arbol sintetico
correr() {
    CHECK_HOOK_TOKEN_REPOS_ROOT="$TMP/repos" \
        python3 "$GATE" --quiet --strict >/dev/null 2>&1
    echo "$?"
}

# forma -> imprime la etiqueta de forma que el gate reporta
forma() {
    CHECK_HOOK_TOKEN_REPOS_ROOT="$TMP/repos" python3 "$GATE" 2>&1 \
        | grep -oE 'sin_ruta|varios_scripts|ruta_en_cadena|ruta_tras_opcion|no_parseable' \
        | head -1
}

# --- Caso 0: el gate existe y es invocable ---------------------------------
comprobar "0a. el gate existe" "si" \
    "$([[ -f "$GATE" ]] && echo si || echo no)"
comprobar "0b. --help sale 0" "0" \
    "$(python3 "$GATE" --help >/dev/null 2>&1; echo $?)"

# --- Caso 1: la forma sana pasa --------------------------------------------
sembrar "bash $CLAUDE/hooks/uno.sh"
comprobar "1a. interprete + script" "0" "$(correr)"

sembrar "$CLAUDE/hooks/uno.sh --si"
comprobar "1b. script directo con argumento" "0" "$(correr)"

# --- Caso 2: cada forma opaca -> exit 1 ------------------------------------
sembrar "python3 -m paquete.modulo"
comprobar "2a. sin ninguna ruta que medir" "1" "$(correr)"
comprobar "2a'. la forma se nombra" "sin_ruta" "$(forma)"

sembrar "bash $CLAUDE/hooks/uno.sh && bash $CLAUDE/hooks/dos.sh"
comprobar "2b. dos scripts, se mide uno" "1" "$(correr)"
comprobar "2b'. la forma se nombra" "varios_scripts" "$(forma)"

sembrar "cat $CLAUDE/scripts/datos.txt | bash $CLAUDE/hooks/uno.sh"
comprobar "2c. el primer token de ruta es el DATO, no el script" "1" "$(correr)"
comprobar "2c'. la forma se nombra" "varios_scripts" "$(forma)"

sembrar "bash -c $CLAUDE/hooks/uno.sh"
comprobar "2d. la ruta viaja dentro de una cadena" "1" "$(correr)"
comprobar "2d'. la forma se nombra" "ruta_en_cadena" "$(forma)"

sembrar "python3 --check $CLAUDE/scripts/uno.py"
comprobar "2e. la ruta es el valor de una bandera" "1" "$(correr)"
comprobar "2e'. la forma se nombra" "ruta_tras_opcion" "$(forma)"

# --- Caso 3: CONTROL ANULADO -----------------------------------------------
# La premisa original: «el primer token de ruta es el script; si existe, bien».
# Los cinco insumos de arriba tienen TODOS sus scripts en disco, asi que bajo
# esa premisa los cinco pasan — y por eso el defecto era invisible.
anulado() {  # anulado <comando> -> 1 si el primer token de ruta no existe
    local t
    for t in $1; do
        if [[ "$t" == */* && "$t" != -* ]]; then
            [[ -e "$t" ]] && { echo 0; return; } || { echo 1; return; }
        fi
    done
    echo 0   # sin ruta que medir: la premisa original da por bueno el comando
}

OPACOS=(
    "python3 -m paquete.modulo"
    "bash $CLAUDE/hooks/uno.sh && bash $CLAUDE/hooks/dos.sh"
    "cat $CLAUDE/scripts/datos.txt | bash $CLAUDE/hooks/uno.sh"
    "bash -c $CLAUDE/hooks/uno.sh"
    "python3 --check $CLAUDE/scripts/uno.py"
)
CAEN_CON_EL_GATE=0
CAEN_ANULADO=0
for c in "${OPACOS[@]}"; do
    sembrar "$c"
    [[ "$(correr)"      == "1" ]] && CAEN_CON_EL_GATE=$((CAEN_CON_EL_GATE + 1))
    [[ "$(anulado "$c")" == "1" ]] && CAEN_ANULADO=$((CAEN_ANULADO + 1))
done
comprobar "3a. con el gate, las 5 formas opacas se rechazan" "5" "$CAEN_CON_EL_GATE"
comprobar "3b. con la premisa original, NINGUNA cae — por eso era invisible" "0" "$CAEN_ANULADO"

# --- Caso 4: POSITIVO REAL — el comando con `|| true` de api NO es opaco ----
REAL="$(python3 - <<'PY'
import json, pathlib
p = pathlib.Path('/home/user/kaupamex-api/.claude/settings.json')
if not p.is_file():
    print(''); raise SystemExit
for arr in (json.loads(p.read_text()).get('hooks') or {}).values():
    for m in arr:
        for h in m.get('hooks', []):
            if '||' in h.get('command', ''):
                print(h['command']); raise SystemExit
print('')
PY
)"
if [[ -z "$REAL" ]]; then
    printf 'AVISO: no se hallo el comando real con separador — el caso 4 no midio nada\n' >&2
    FALLOS=$((FALLOS + 1))
else
    sembrar "$REAL"
    comprobar "4. el comando real con '|| true' no se marca opaco" "0" "$(correr)"
fi

# --- Caso 5: POSITIVO REAL — el arbol de verdad -----------------------------
comprobar "5a. los cinco repos reales pasan el gate" "0" \
    "$(python3 "$GATE" --quiet --strict >/dev/null 2>&1; echo $?)"

MEDIDOS="$(python3 "$GATE" --quiet 2>/dev/null | grep -oE 'alcance medido: [0-9]+' | grep -oE '[0-9]+')"
if [[ -z "$MEDIDOS" || "$MEDIDOS" -eq 0 ]]; then
    printf 'AVISO: 0 comandos medidos — el caso 5 no midio nada\n' >&2
    FALLOS=$((FALLOS + 1))
else
    comprobar "5b. el gate publica su denominador (>0 comandos)" "si" "si"
fi

# --- Caso 6: cero comandos NO es un aprobado -------------------------------
mkdir -p "$TMP/vacio"
SALIDA="$(CHECK_HOOK_TOKEN_REPOS_ROOT="$TMP/vacio" python3 "$GATE" --quiet 2>&1)"
comprobar "6a. sin settings, el gate lo declara" "si" \
    "$(grep -q 'ADVERTENCIA: 0 comandos declarados' <<<"$SALIDA" && echo si || echo no)"
comprobar "6b. sin settings, --strict NO pasa en verde" "1" \
    "$(CHECK_HOOK_TOKEN_REPOS_ROOT="$TMP/vacio" python3 "$GATE" --quiet --strict >/dev/null 2>&1; echo $?)"

printf 'test-hook-script-token: %d de %d aserciones en verde\n' "$OK" "$((OK + FALLOS))"
[[ "$FALLOS" -eq 0 ]]
