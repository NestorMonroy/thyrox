#!/bin/bash
# Pruebas de verificar_premisa.py — la etapa 5 del pipeline de orden.
#
# El universo es controlado, pero los SÍMBOLOS que cita son REALES del árbol:
# `hallazgo-abierto-genera-sucesor.md` exige probar un gate contra un positivo
# conocido del repo y no contra uno fabricado — si el caso lo escribe quien
# escribió el patrón, hereda su encuadre y confirma el instrumento en vez de
# medirlo. Aquí el control positivo es `has_groups`, que el árbol declara y que
# la ficha #399 del tablero real lista como pieza «a portar».
#
# Casos, y qué separa cada uno:
#   1  sintaxis
#   2  S1 con símbolo REAL del árbol         → RE-ENCUADRAR
#   3  control negativo: símbolo inventado   → premisa firme
#   4  S1 no dispara sin verbo de construcción
#   5  S2 ruta fantasma vs ruta que existe
#   6  S3 bloqueador ya cerrado
#   7  tarea cerrada: señal esperada, NO cuenta al total
#   8  --strict sale 1 con señal y 0 sin ella
#   9  universo vacío sale 0 (no es un fallo)
#  10  el índice NO sale de cero — el defecto que este guion padeció

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
source "$_thyrox_root/src/lib/fixture.sh"
cd "$(thyrox_root)" || exit 1

GUION=src/verify/verificar_premisa.py
OK=0; FALLO=0

afirmar() {  # afirmar <descripción> <esperado> <obtenido>
    if [[ "$2" == "$3" ]]; then
        printf '  ok    %s\n' "$1"; (( OK++ ))
    else
        printf '  FALLO %s\n        esperado=[%s] obtenido=[%s]\n' "$1" "$2" "$3"; (( FALLO++ ))
    fi
}

echo "== 1. sintaxis =="
python3 -c "import ast,pathlib; ast.parse(pathlib.Path('$GUION').read_text())"
afirmar "verificar_premisa.py parsea" 0 $?

U=$(fixture_dir)
escribir() {  # escribir <id> <status> <subject> <description>
    python3 - "$U" "$@" <<'PY'
import json, sys, pathlib
destino, tid, status, subject, description = sys.argv[1:6]
pathlib.Path(destino, f'{tid}.json').write_text(json.dumps({
    'id': tid, 'status': status, 'subject': subject,
    'description': description, 'blocks': [], 'blockedBy': [],
}), encoding='utf-8')
PY
}

# El símbolo del caso 2 es real: si algún día deja de existir, esta prueba
# falla y hay que re-medirlo — que es la conducta correcta, no un estorbo.
escribir 1 pending 'Portar has_groups y sus piezas' 'el control positivo real'
escribir 2 pending 'Portar zzz_simbolo_inexistente_qqq' 'control negativo'
# OJO al redactarlo: la primera version decia «sin CONSTRUIR nada» y contenia
# el mismo verbo que afirma no contener, asi que el caso fallaba por su propio
# texto. El guion tenia razon; el caso estaba mal escrito.
escribir 3 pending 'Revisar has_groups y su cobertura' 'sin verbo que afirme ausencia'
escribir 4 pending 'Portar algo de src/inexistente/fantasma.py' 'ruta que no existe'
# Control positivo REAL del falso positivo medido: la ruta existe, pero bajo
# `.claude/`. Antes de anadir esa raiz, el guion la declaraba fantasma — y lo
# hizo sobre su PROPIA ficha, que es como se descubrio.
#
# La ficha citaba `scripts/gates/verificar_premisa.py`, que era ese mismo
# guion antes de mudarse a `thyrox/src/verify/`. Con la mudanza esa ruta dejo
# de existir bajo ninguna raiz, asi que el gate la declaraba fantasma con
# razon: rojo de PREMISA RANCIA, no del sujeto.
#
# El repunte tiene DOS condiciones, y la segunda no es obvia: la ruta tiene
# que (a) existir SOLO bajo `.claude/` —si existiera tambien en la raiz del
# clon, el caso pasaria sin ejercitar la raiz que mide— y (b) empezar por un
# segmento que `FILE_PATH` reconozca. Un primer repunte a
# `hooks/measure_subagent_delta.py` cumplia (a) y no (b): `hooks` no esta en
# la lista cerrada del patron, asi que no se extraia ninguna ruta y el caso
# pasaba en verde sin medir nada — sub-patron D con este caso como sujeto.
# Medido: `scripts/check-i001-prewrite.sh` existe bajo `.claude/` en api y ui
# y en NINGUNA raiz de clon; anulando las raices `.claude/` de `PATH_ROOTS`,
# S2 dispara.
escribir 11 pending 'Portar scripts/check-i001-prewrite.sh' 'ruta real bajo .claude/'
escribir 5 pending 'Portar otra cosa' 'esta tarea esta bloqueada por #9 desde hace tiempo'
escribir 6 pending 'Sin senal de ninguna clase' 'prosa sin simbolo ni ruta'
escribir 9 completed 'Portar has_groups ya cerrada' 'su senal es esperada'

# Los casos 2-8 leen simbolos REALES del clon de la aplicacion. Sin el clon el
# gate REHUSA con 2 —correcto—, y lo unico que se puede medir es esa negativa:
# seguir contaria como fallo del gate la ausencia de su sujeto.
if ! python3 -c "from paths import reach; reach.root('api')" >/dev/null 2>&1; then
    echo "== 2'. sin el clon de la aplicacion: el gate REHUSA =="
    SIN_CLON="$(python3 "$GUION" --tasks-dir "$U" 2>&1)"; CODE=$?
    afirmar "sale con 2, no con un veredicto" 2 "$CODE"
    afirmar "  … y nombra la raiz que falta" 1 "$(grep -c "REHUSA.*'api'" <<<"$SIN_CLON")"
    printf '\n%d ok · %d fallo(s) · SIN MEDIR: falta el clon de la aplicacion\n' "$OK" "$FALLO"
    [[ "$FALLO" -eq 0 ]] && exit 2 || exit 1
fi

echo "== 2. S1: simbolo REAL del arbol dispara RE-ENCUADRAR =="
UNO=$(python3 "$GUION" --tasks-dir "$U" 1 2>&1)
afirmar "#1 pide re-encuadre" 1 "$(grep -c 'veredicto: RE-ENCUADRAR' <<<"$UNO")"
afirmar "  … nombra el simbolo has_groups" 1 "$(grep -c 'S1.*has_groups' <<<"$UNO")"
afirmar "  … y cita su file:line como evidencia" 1 \
    "$(grep -cE 'S1.*res_users\.py:[0-9]+' <<<"$UNO")"

echo "== 3. control negativo: simbolo que el arbol NO declara =="
DOS=$(python3 "$GUION" --tasks-dir "$U" 2 2>&1)
afirmar "#2 tiene premisa firme" 1 "$(grep -c 'veredicto: premisa firme' <<<"$DOS")"

echo "== 4. sin verbo de construccion no hay senal S1 =="
# Nombrar un simbolo no es afirmar que falta. Sin esta puerta, toda ficha que
# mencione codigo existente pediria re-encuadre y la senal seria ruido.
TRES=$(python3 "$GUION" --tasks-dir "$U" 3 2>&1)
afirmar "#3 no dispara S1 pese a citar has_groups" 0 "$(grep -c 'S1' <<<"$TRES")"

echo "== 5. S2: ruta citada que no existe =="
CUATRO=$(python3 "$GUION" --tasks-dir "$U" 4 2>&1)
afirmar "#4 reporta la ruta fantasma" 1 \
    "$(grep -c 'S2.*src/inexistente/fantasma.py' <<<"$CUATRO")"

echo "== 5-bis. S2: una ruta bajo .claude/ NO es fantasma =="
ONCE=$(python3 "$GUION" --tasks-dir "$U" 11 2>&1)
afirmar "#11 no declara fantasma una ruta que existe bajo .claude/" 0 \
    "$(grep -c 'S2' <<<"$ONCE")"

echo "== 6. S3: bloqueador citado que ya cerro =="
CINCO=$(python3 "$GUION" --tasks-dir "$U" 5 2>&1)
afirmar "#5 reporta que su bloqueador #9 ya cerro" 1 \
    "$(grep -c 'S3.*#9 ya está cerrado' <<<"$CINCO")"

echo "== 7. tarea cerrada: la senal es esperada y NO cuenta =="
# En una tarea cumplida, que sus simbolos existan es la huella de su trabajo.
# Contarla inflaria el total con lo unico que se sabe de antemano que no es
# hallazgo — y un total inflado es un gate que nadie mira.
NUEVE=$(python3 "$GUION" --tasks-dir "$U" 9 2>&1)
afirmar "#9 declara la senal como esperada" 1 \
    "$(grep -c 'veredicto: señal esperada' <<<"$NUEVE")"
afirmar "  … y no suma al conteo" 1 \
    "$(grep -c '^0 de 1 ficha' <<<"$NUEVE")"

echo "== 8. --strict: exit 1 con senal, exit 0 sin ella =="
python3 "$GUION" --tasks-dir "$U" 1 --strict >/dev/null 2>&1
afirmar "con senal sale 1" 1 $?
python3 "$GUION" --tasks-dir "$U" 6 --strict >/dev/null 2>&1
afirmar "sin senal sale 0" 0 $?

echo "== 9. universo vacio: no revienta =="
VACIO=$(fixture_dir)
python3 "$GUION" --tasks-dir "$VACIO" >/dev/null 2>&1
afirmar "directorio sin tareas sale 0" 0 $?

echo "== 10. el indice de simbolos NO sale de cero =="
# Memoria episodica ejecutable: la primera version derivaba las raices de `~`,
# y el proceso corre con un HOME distinto del dueño de los repos. El indice
# salio de CERO simbolos y todas las rutas se declararon fantasma — el guion
# reportaba el defecto que persigue por padecerlo el mismo. Sin esta afirmacion
# ese fallo es invisible: el guion corre, sale 0 y no encuentra nada.
INDICE=$(grep -oE 'índice de [0-9]+ símbolos' <<<"$UNO" | grep -oE '[0-9]+')
afirmar "el indice tiene simbolos (no 0)" "si" \
    "$( (( ${INDICE:-0} > 0 )) && echo si || echo no)"

echo "== 11. --emit-premises: la senal se vuelve premisa declarada =="
PREM=$(fixture_file)
python3 "$GUION" --tasks-dir "$U" --emit-premises "$PREM" >/dev/null 2>&1
afirmar "el archivo emitido es JSON valido" 0 \
    "$(python3 -c "import json,sys; json.load(open('$PREM'))" >/dev/null 2>&1; echo $?)"
# S1 sobre la ficha 1 (cita has_groups, que el arbol declara).
afirmar "#1 emite una presuposicion symbol-absent" 1 \
    "$(python3 -c "
import json
d = {t['id']: t for t in json.load(open('$PREM'))}
p = d.get('1', {}).get('presupposes', [])
print(sum(1 for x in p if x['kind'] == 'symbol-absent'))
")"
# El alcance NO es el archivo donde se hallo: eso seria circular — el
# evaluador buscaria justo donde ya se sabe que esta. Es un glob del universo
# de busqueda, y lo que lo distingue de una ruta concreta es el comodin.
afirmar "  … y su alcance es un glob, no el archivo donde se hallo" 1 \
    "$(python3 -c "
import json
d = {t['id']: t for t in json.load(open('$PREM'))}
p = d.get('1', {}).get('presupposes', [])
print(sum(1 for x in p if '*' in x.get('in','')))
")"
# S2 sobre la ficha 4 (ruta fantasma).
afirmar "#4 emite una presuposicion path-exists" 1 \
    "$(python3 -c "
import json
d = {t['id']: t for t in json.load(open('$PREM'))}
p = d.get('4', {}).get('presupposes', [])
print(sum(1 for x in p if x['kind'] == 'path-exists'))
")"
# S3 NO es emitible: el predicado hablaria del tablero, no del arbol.
afirmar "#5 (S3) no emite predicado: el evaluador no lee el tablero" 0 \
    "$(python3 -c "
import json
d = {t['id']: t for t in json.load(open('$PREM'))}
print(len(d.get('5', {}).get('presupposes', [])))
")"
# Una ficha sin senal no ensucia el archivo con una entrada vacia.
afirmar "una ficha sin senal no aparece" 0 \
    "$(python3 -c "
import json
print(sum(1 for t in json.load(open('$PREM')) if not t.get('presupposes')))
")"

# --- El PROVEEDOR entra en el universo de resolucion -----------------------
# `PATH_ROOTS` se componia de `reach.roots()`, que son los CONSUMIDORES. El
# arbol donde vive este gate quedaba fuera, asi que toda cita de codigo propio
# resolvia a None y S2 la publicaba como premisa envejecida. Medido sobre el
# tablero real al declararlo: 143 de 239 citas no resueltas SI existen en el
# proveedor — 59.8 % de veredictos falsos sobre codigo vivo.
#
# El sujeto es un archivo REAL del proveedor, no uno fabricado: el localizador
# que el propio arbol declara. Fabricar uno mediria el fixture, no el universo.
afirmar "el proveedor entra en PATH_ROOTS" "si" \
    "$(python3 -c "
import sys
sys.path.insert(0, 'src/verify'); sys.path.insert(0, '.')
import verificar_premisa as s
print('si' if s.resolve_path('src/paths/reach.py') else 'no')
")"
# Y la mitad que lo hace ABSTRACTO: la COMPOSICION no nombra a nadie. El
# proveedor servira arboles que no son los de hoy, asi que las raices se piden.
#
# El sujeto es el bloque de `PATH_ROOTS`, no el archivo: medir el archivo
# entero contaba tambien un comentario que CITA la forma rota historica —
# evidencia legitima— y un `EMIT_SYMBOL_SCOPE` que si cablea el producto pero
# es otro defecto, de la clase de TASK-THYROX-0093.
afirmar "la composicion de PATH_ROOTS no nombra ninguna raiz" 0 \
    "$(sed -n '/^PATH_ROOTS = tuple(/,/^)/p' src/verify/verificar_premisa.py \
        | grep -cE "kaupamex|/home/user")"

rm -rf "$U" "$VACIO"
printf '\n%s: %d ok · %d fallo(s)\n' "$(basename "$0")" "$OK" "$FALLO"
(( FALLO == 0 ))
