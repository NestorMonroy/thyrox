#!/usr/bin/env bash
# Pruebas de check_unreachable_rules.py — la regla de permiso que existe y
# nunca puede dispararse porque otra más ancha la cubre antes.
#
# Por qué existe: una regla `allow` cubierta por un `deny` o un `ask` no
# produce error. Sigue en el archivo, se lee como concedida, y el permiso se
# vuelve a pedir para siempre. Es la forma de #711 y H-DOCS-479 sobre otra
# superficie: la configuración declara algo que el motor nunca alcanza.
#
# La forma se adapta de `shadowedRuleDetection.ts` del corpus `ccb`, cuyo tipo
# principal se llama `UnreachableRule` — de ahí el nombre de este gate. Su
# criterio es sólo el de la regla de herramienta entera (`Bash` sin contenido);
# aquí se extiende a la cobertura por prefijo, que es la forma que este árbol
# tiene de verdad: `Bash(rm -rf *)` cubre a `Bash(rm -rf build/*)`.
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
GATE="$RAIZ/.claude/scripts/gates/check_unreachable_rules.py"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

OK=0
FALLO=0
afirmar() { # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then OK=$((OK + 1)); printf '  ok   %s\n' "$1"
    else FALLO=$((FALLO + 1)); printf '  FALLA %s — esperado [%s] obtenido [%s]\n' "$1" "$2" "$3"; fi
}

# Cuenta > 0 normalizada a 1. La aserción es «aparece», no «aparece una vez»:
# el reporte nombra un archivo por línea y una regla por hallazgo, así que
# fijar el número ataría la prueba al tamaño del árbol.
hay() { [[ "$1" -gt 0 ]] && echo 1 || echo 0; }

fabricar() { # fabricar <dir> <json del bloque permissions>
    mkdir -p "$TMP/$1/.claude"
    printf '{"permissions":%s}' "$2" > "$TMP/$1/.claude/settings.json"
}

# ---------------------------------------------------------------- caso 1
# CONTROL POSITIVO REAL, no fabricado: el árbol vivo SÍ tiene reglas
# inalcanzables. `Bash(rm -rf *)` está en el deny de docs, api y ui, y hay
# reglas `allow` de `rm -rf` en el repositorio y en la copia que el cliente
# ejecuta. Sin este caso el gate podría medir un universo vacío y pasar.
python3 "$GATE" --strict >/dev/null 2>&1
afirmar "el arbol vivo tiene al menos una regla inalcanzable" "1" "$?"

afirmar "el reporte nombra la regla de build/ cubierta por rm -rf" "1" \
    "$(hay "$(python3 "$GATE" | grep -c 'rm -rf build/')")"

# ---------------------------------------------------------------- caso 2
# Control negativo: reglas de herramientas distintas no se cubren.
fabricar disjunto '{"allow":["Bash(ls *)"],"deny":["Bash(rm -rf *)"]}'
python3 "$GATE" --strict --raiz "$TMP/disjunto" >/dev/null 2>&1
afirmar "un allow ajeno al deny no bloquea" "0" "$?"

# ---------------------------------------------------------------- caso 3
# El criterio de `ccb` verbatim: deny de herramienta entera contra un allow
# específico. Es el que su suite ejercita y el que este gate hereda.
fabricar herramienta '{"allow":["Bash(ls:*)"],"deny":["Bash"]}'
python3 "$GATE" --strict --raiz "$TMP/herramienta" >/dev/null 2>&1
afirmar "un deny de herramienta entera cubre al allow especifico" "1" "$?"

# ---------------------------------------------------------------- caso 4
# La otra mitad de `ccb`: el `ask` también cubre, con severidad menor.
fabricar pregunta '{"allow":["Bash(ls:*)"],"ask":["Bash"]}'
python3 "$GATE" --strict --raiz "$TMP/pregunta" >/dev/null 2>&1
afirmar "un ask de herramienta entera cubre al allow especifico" "1" "$?"

# ---------------------------------------------------------------- caso 5
# EL CASO QUE DECIDE LA DIRECCIÓN. Un deny MÁS ESTRECHO que el allow no lo
# cubre: `git push --force x` cae en el deny, `git push origin y` no. Sin este
# caso, un criterio ingenuo de «mismo prefijo de herramienta» marcaría las
# cuatro reglas de git de los tres repositorios como inalcanzables, y el gate
# publicaría deuda que no existe.
fabricar direccion '{"allow":["Bash(git push *)"],"deny":["Bash(git push --force *)"]}'
python3 "$GATE" --strict --raiz "$TMP/direccion" >/dev/null 2>&1
afirmar "un deny mas estrecho que el allow NO lo cubre" "0" "$?"

# ---------------------------------------------------------------- caso 6
# Sin reglas NO hay veredicto: un árbol sin bloque `permissions` sale con 2,
# no con 0. Un cero ahí sería un verde falso — no midió nada.
mkdir -p "$TMP/vacio/.claude"
printf '{"hooks":{}}' > "$TMP/vacio/.claude/settings.json"
python3 "$GATE" --raiz "$TMP/vacio" >/dev/null 2>&1
afirmar "sin reglas que medir sale con codigo 2" "2" "$?"

# ---------------------------------------------------------------- caso 7
# El reporte publica su denominador: qué archivos leyó y cuántas reglas midió.
afirmar "el reporte declara los archivos leidos" "1" \
    "$(hay "$(python3 "$GATE" | grep -c 'leído:')")"
afirmar "el reporte declara cuantas reglas midio" "1" \
    "$(python3 "$GATE" | grep -c 'alcance medido')"

# ---------------------------------------------------------------- caso 8
# Y declara lo que NO pudo decidir. El criterio de cobertura sólo es sólido
# para el comodín final; `Edit(/.claude/scripts/*.sh)` lo lleva en medio y el
# instrumento no lo resuelve. Callarlo haría que su silencio se leyera como
# ausencia de cobertura.
fabricar medio '{"allow":["Edit(/.claude/scripts/uno.sh)"],"ask":["Edit(/.claude/scripts/*.sh)"]}'
afirmar "el comodin intermedio se declara indecidible" "1" \
    "$(python3 "$GATE" --raiz "$TMP/medio" | grep -c 'sin decidir')"

# ---------------------------------------------------------------- caso 9
# `ccb` no evalua el deny contra la cadena entera: trocea el comando en
# subcomandos y lo aplica a cada uno (checkSemanticsDeny, bashPermissions.ts
# :1422). Un allow que lleva el comando cubierto DESPUES de un `&&` es
# igual de inalcanzable, y comparar cadenas enteras no lo ve.
#
# El caso arranca de una regla REAL del arbol —`rm -rf .claude/references/ccb
# && echo ...`, que hoy si se detecta— con un `cd` antepuesto. No hay positivo
# real de esta forma en los cinco repos (medido: 0), asi que este es derivado,
# no observado; se declara.
fabricar sub '{"allow":["Bash(cd /home/user/kaupamex-docs \u0026\u0026 rm -rf build/)"],"deny":["Bash(rm -rf *)"]}'
afirmar "el deny alcanza al subcomando, no solo a la cadena entera" "1" \
    "$(python3 "$GATE" --raiz "$TMP/sub" --quiet)"

# ---------------------------------------------------------------- caso 10
# Y despoja las asignaciones de variable que preceden al comando. `ccb` las
# quita TODAS para el deny —no solo las de su lista segura— porque una regla
# restrictiva debe ser dificil de evadir (bashPermissions.ts:706). Sin esto,
# `FOO=bar rm -rf x` evade un deny de `rm -rf`.
fabricar env '{"allow":["Bash(TMPDIR=/tmp rm -rf build/)"],"deny":["Bash(rm -rf *)"]}'
afirmar "la variable antepuesta no evade el deny" "1" \
    "$(python3 "$GATE" --raiz "$TMP/env" --quiet)"

# ---------------------------------------------------------------- caso 11
# La direccion sigue importando tras trocear: un subcomando cubierto por un
# deny MAS ESTRECHO que el allow no lo vuelve inalcanzable.
fabricar sub-estrecho '{"allow":["Bash(cd /x \u0026\u0026 git push *)"],"deny":["Bash(git push --force *)"]}'
afirmar "un deny estrecho no cubre al subcomando ancho" "0" \
    "$(python3 "$GATE" --raiz "$TMP/sub-estrecho" --quiet)"

printf '\n%d ok · %d falla(s)\n' "$OK" "$FALLO"
[[ "$FALLO" -eq 0 ]]
