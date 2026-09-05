#!/bin/bash
# Pruebas de implementation_order.py sobre un UNIVERSO CONTROLADO.
#
# Directiva del ejecutor 2026-08-18: *"revisar si se puede realizar una prueba,
# con un universo controlado, para no gastar muchos tokens, y revisar que el
# algoritmo funciona, eso se hace para probarlo y encontrar alguna anomalia y no
# ejecutarlo y gastar mas tokens de lo que se realizara"*.
#
# El universo son 10 tareas con respuesta conocida de antemano, no el tablero
# real de 527. Correr las cuatro etapas contra un graph que cabe en la cabeza es
# lo unico que distingue "el guion no revienta" de "el guion acierta": el
# tablero real no trae oraculo, asi que una salida plausible ahi no prueba nada.
#
#   #1 → #2 → #3        cadena por `blocks`/`blockedBy` del tablero
#   #3 → #8             edge de PROSA ("bloqueada por #3")
#   #4 ↔ #5             cycle de DOS; el SCC entero bloquea a #6
#   #7                  hoja aislada: 0 edges
#   #9 [completed] → #10  bloqueador YA cerrado: #10 debe salir ready
#   #11 → #12 → #13 → #11  cycle de TRES (tarea #533)
#   #14 → #15 ↔ #16     cycle con BLOQUEADOR EXTERNO abierto (tarea #533)
#
# Respuestas esperadas, derivadas a mano del dibujo de arriba:
#   unblock(#1) = 3   ({2,3,8})      · unblock(SCC{4,5}) = 1  ({6})
#   unblock(#7) = 0                  · ready = {1,4,5,7,10,11,12,13,14}
#   cycles = 3                       · procedencia = 12 tablero + 1 prosa
#
# Los dos cycles nuevos separan lecturas que el cycle de dos NO distingue:
#
#   · **Tres, no dos.** Un Tarjan que junte pares por la arista de vuelta
#     —en vez de por el `lowlink`— acierta con {4,5} y parte {11,12,13} en
#     tres componentes. Con sólo el par, ese defecto pasa.
#   · **Bloqueador externo.** {15,16} es ready por dentro y bloqueado por
#     fuera. `is_ready` ignora al compañero de cycle: si además ignorara al
#     bloqueador externo —el error simétrico— declararía portable un lote que
#     no lo es, y el ranking mandaría a trabajar sobre algo imposible.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.." || exit 1

GUION=.claude/scripts/task/implementation_order.py
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
afirmar "implementation_order.py parsea" 0 $?

echo "== 2. el universo controlado =="
U=$(mktemp -d)
escribir() {  # escribir <id> <status> <subject> <description> <blocks-csv> <blockedBy-csv>
    python3 - "$U" "$@" <<'PY'
import json, sys, pathlib
destino, tid, status, subject, description, blocks, blocked_by = sys.argv[1:8]
lista = lambda s: [x for x in s.split(',') if x]
pathlib.Path(destino, f'{tid}.json').write_text(json.dumps({
    'id': tid, 'status': status, 'subject': subject, 'description': description,
    'blocks': lista(blocks), 'blockedBy': lista(blocked_by),
}), encoding='utf-8')
PY
}

escribir 1  pending   'Portar la raiz alfa'      'la raiz de la cadena'        2   ''
escribir 2  pending   'Portar el medio beta'     'depende de la raiz'          3   1
escribir 3  pending   'Portar la hoja gamma'     'el final de la cadena'       ''  2
escribir 4  pending   'Portar delta'             'necesita epsilon'            6   5
escribir 5  pending   'Portar epsilon'           'necesita delta'              ''  4
escribir 6  pending   'Portar zeta'              'espera al par delta epsilon' ''  4
escribir 7  pending   'Portar eta aislada'       'sin relacion con nada'       ''  ''
escribir 8  pending   'Portar theta'             'bloqueada por #3 en prosa'   ''  ''
escribir 9  completed 'Portar iota ya cerrada'   'cerrada hace tiempo'         10  ''
escribir 10 pending   'Portar kappa'             'su bloqueador ya cerro'      ''  9
escribir 11 pending   'Portar lambda'            'primero del trio'           12  13
escribir 12 pending   'Portar mu'                'segundo del trio'           13  11
escribir 13 pending   'Portar nu'                'tercero del trio'           11  12
escribir 14 pending   'Portar xi la raiz'        'bloquea al par cerrado'     15  ''
escribir 15 pending   'Portar omicron'           'par con pi, tras xi'        16  14,16
escribir 16 pending   'Portar pi'                'par con omicron'            15  15

SALIDA=$(python3 "$GUION" --tasks-dir "$U" --top 10 2>&1)
afirmar "corre sobre el universo" 0 $?

echo "== 3. cabecera: tamano del graph y su procedencia =="
afirmar "cuenta las 16 tareas" 1 \
    "$(grep -c '^implementation-order: 16 tareas' <<<"$SALIDA")"
afirmar "13 edges: 12 del tablero + 1 de prosa" 1 \
    "$(grep -c '13 edges (12 del tablero, 1 de prosa)' <<<"$SALIDA")"

echo "== 4. Tarjan: los cycles se detectan y se condensan =="
CYCLES=$(python3 "$GUION" --tasks-dir "$U" --cycles 2>&1)
afirmar "tres cycles" 3 "$(grep -c '^cycle:' <<<"$CYCLES")"
afirmar "el cycle de dos es {4,5}" 1 "$(grep -c '^cycle: #4, #5' <<<"$CYCLES")"
# El cycle de TRES es el caso de #533: un Tarjan que junte pares por la arista
# de vuelta acierta con {4,5} y parte este en tres componentes sueltos.
afirmar "el cycle de tres es {11,12,13}" 1 \
    "$(grep -c '^cycle: #11, #12, #13' <<<"$CYCLES")"
afirmar "el cycle bloqueado es {15,16}" 1 "$(grep -c '^cycle: #15, #16' <<<"$CYCLES")"
afirmar "12 componentes tras condensar (16 nodos - 1 - 2 - 1)" 1 \
    "$(grep -c '12 componentes, 3 cycle(s)' <<<"$SALIDA")"

echo "== 5. Kahn: ready es 'sin bloqueador ABIERTO', no 'sin bloqueador' =="
# #10 es el caso que separa las dos lecturas: tiene bloqueador declarado (#9)
# y ese bloqueador esta cerrado. Un Kahn que mire la existencia de la edge en
# vez del estado del bloqueador lo deja fuera, y nadie lo notaria en el tablero
# real porque ahi las dos cifras se parecen.
#
# Y {4,5} es el OTRO caso que separa dos lecturas: medir la disponibilidad
# sobre las edges crudas declara a cada miembro bloqueado por su companero
# —para siempre— y borra el cycle del ranking sin reportar nada. Ese es el
# fallo que esta prueba destapo en HEAD limpio; ver is_ready().
afirmar "9 de 15 no cerradas estan ready" 1 \
    "$(grep -c 'ready (sin bloqueador abierto): 9 de 15' <<<"$SALIDA")"

echo "== 5-bis. el bloqueo externo es del COMPONENTE, no del miembro (#533) =="
# #14 (abierto) apunta solo a #15. #16 no tiene mas bloqueador que su companero
# de cycle, asi que la clausula del componente lo dejaba pasar y #16 salia ready
# — un lote imposible: no se puede portar #16 sin #15, y #15 espera a #14.
# Este es el defecto que el universo ampliado destapo en su primera corrida.
READY=$(python3 "$GUION" --tasks-dir "$U" --top 16 2>&1 \
        | sed -n '/Siguientes por unblock/,$p')
afirmar "#15 NO esta ready" 0 "$(grep -c ' #15 \[' <<<"$READY")"
afirmar "#16 NO esta ready (el bloqueo es del cycle entero)" 0 \
    "$(grep -c ' #16 \[' <<<"$READY")"
afirmar "#14, su bloqueador externo, SI esta ready" 1 \
    "$(grep -c ' #14 \[' <<<"$READY")"
# El contraste: {11,12,13} no tiene bloqueador externo, asi que el trio entero
# es portable como lote. Sin esta afirmacion, un is_ready que declarara no-ready
# a todo cycle pasaria el caso de arriba por la razon equivocada.
afirmar "los tres del cycle sin bloqueador externo SI estan ready" 3 \
    "$(grep -cE ' #1[123] \[' <<<"$READY")"

echo "== 6. unblock count: descendientes en el reverse graph =="
EXPLICA1=$(python3 "$GUION" --tasks-dir "$U" --explain 1 2>&1)
afirmar "#1 destraba 3" 1 "$(grep -c 'destraba 3 tarea(s) no cerrada(s)' <<<"$EXPLICA1")"
afirmar "  … y nombra a #2" 1 "$(grep -c '#2 \[pending\]' <<<"$EXPLICA1")"
afirmar "  … y a #3"        1 "$(grep -c '#3 \[pending\]' <<<"$EXPLICA1")"
afirmar "  … y a #8 (via prosa)" 1 "$(grep -c '#8 \[pending\]' <<<"$EXPLICA1")"

EXPLICA4=$(python3 "$GUION" --tasks-dir "$U" --explain 4 2>&1)
afirmar "#4 declara su cycle con #5" 1 "$(grep -c 'va en un cycle con: #5' <<<"$EXPLICA4")"
afirmar "el SCC {4,5} destraba 1 (#6)" 1 \
    "$(grep -c 'destraba 1 tarea(s) no cerrada(s)' <<<"$EXPLICA4")"

EXPLICA7=$(python3 "$GUION" --tasks-dir "$U" --explain 7 2>&1)
afirmar "#7 es hoja del graph declarado" 1 \
    "$(grep -c 'es una hoja del graph declarado' <<<"$EXPLICA7")"

echo "== 7. el ranking pone primero al que mas destraba =="
PRIMERO=$(grep -A1 'Siguientes por unblock count' <<<"$SALIDA" | tail -1 \
          | grep -oE '#[0-9]+' | head -1)
afirmar "el top-1 es #1" '#1' "$PRIMERO"

echo "== 8. control negativo: id fuera del universo =="
python3 "$GUION" --tasks-dir "$U" --explain 99999 >/dev/null 2>&1
afirmar "--explain de un id ausente sale 1" 1 $?

echo "== 8-bis. etapa 5: la premisa se verifica antes de despachar =="
# El universo controlado no cita simbolos del arbol real, asi que su premisa
# esta firme por construccion: lo que esta afirmacion mide es el CABLEADO —que
# la etapa 5 corra y reporte— no la deteccion, que tiene su propia prueba.
PREMISA=$(python3 "$GUION" --tasks-dir "$U" --top 3 --premisa 2>&1)
afirmar "la etapa 5 corre desde el pipeline" 1 \
    "$(grep -c 'Premisa de las 3 del top' <<<"$PREMISA")"
afirmar "y publica su denominador" 1 \
    "$(grep -c '0 de 3 ficha(s) piden re-encuadre' <<<"$PREMISA")"

echo "== 9. universo vacio: no revienta =="
VACIO=$(mktemp -d)
python3 "$GUION" --tasks-dir "$VACIO" --top 3 >/dev/null 2>&1
afirmar "directorio sin tareas sale 0" 0 $?

echo "== 10. el sustrato lo decide el llamador: el mismo universo por stdin (#579) =="
# El lector unico (task_source.py) acepta un flujo ademas del directorio. El
# universo entero entra por tuberia como JSON array y la cabecera debe dar el
# MISMO graph que la lectura por directorio — si difiere, los dos sustratos
# leyeron poblaciones distintas.
PIPED_OUTPUT=$(python3 -c "
import json, glob
print(json.dumps([json.load(open(p)) for p in sorted(glob.glob('$U/*.json'))]))" \
    | python3 "$GUION" --tasks-dir - --top 10 2>&1)
afirmar "por stdin cuenta las mismas 16 tareas" 1 \
    "$(grep -c '^implementation-order: 16 tareas' <<<"$PIPED_OUTPUT")"
afirmar "por stdin arma el mismo graph (13 edges, 3 cycles)" 1 \
    "$(grep -c '12 componentes, 3 cycle(s)' <<<"$PIPED_OUTPUT")"

rm -rf "$U" "$VACIO"
printf '\n%s: %d ok · %d fallo(s)\n' "$(basename "$0")" "$OK" "$FALLO"
(( FALLO == 0 ))
