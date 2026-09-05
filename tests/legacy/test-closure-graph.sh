#!/bin/bash
# =============================================================================
# test-closure-graph.sh — casos de regresión de `closure_graph.py`
# =============================================================================
#
# Qué protege — y por qué existe
# --------------------------------
# `closure_graph.py` decide QUÉ se cierra primero. Sus modos de fallo son
# silenciosos por construcción: publica un orden, y un orden equivocado se ve
# exactamente igual que uno correcto — se trabaja, se cierra algo, y nadie
# nota que era el nodo hoja en vez del que desbloqueaba a doce.
#
# Por eso cada caso afirma sobre el ORDEN y sobre la ARISTA, nunca sobre el
# código de salida. Y por eso el grafo de los fixtures tiene una forma
# CONOCIDA: se construye a mano con la respuesta ya sabida, para que el
# ranking se pueda comparar contra ella y no contra sí mismo.
#
# Los tres modos de fallo que los casos cubren:
#
#   F-1  La arista se extrae por la FRASE que la introduce ("Sucesor:") y no
#        por el ID. Medido en el corpus: seis o más formas distintas de
#        declararla, así que un patrón por frase es ciego a la mayoría.
#   F-2  El ranking se publica sin denominador — un orden sobre 3 nodos y uno
#        sobre 1248 se leen igual.
#   F-3  Un ciclo hace divergir la iteración y el script no termina, o peor,
#        termina publicando un ranking que depende de cuántas vueltas dio.
# =============================================================================
set -uo pipefail
cd "$(dirname "$0")/../../.." || exit 2

SCRIPT=.claude/scripts/task/closure_graph.py
FIXTURES=.claude/scripts/tests/fixtures/closure_graph
fallos=0
casos=0

fallo() { echo "  FALLA: $*"; fallos=$((fallos + 1)); }
caso()  { casos=$((casos + 1)); echo "caso $casos: $1"; }

# --- precondición: el guion existe y corre --------------------------------
caso "el guion existe y responde --help"
python3 "$SCRIPT" --help >/dev/null 2>&1 || fallo "no responde --help"

# --- F-1: la arista se extrae por el ID, no por la frase -------------------
caso "extrae la arista en las seis formas de declarar sucesor"
SALIDA=$(python3 "$SCRIPT" --corpus "$FIXTURES/formas" --no-git --json 2>&1)
for id in 101 102 103 104 105 106; do
  echo "$SALIDA" | grep -q "\"#$id\"" || fallo "no vio el sucesor #$id"
done

# --- el control positivo: una forma que NO es un sucesor no entra ----------
caso "no confunde una cita de tarea con una declaracion de sucesor"
echo "$SALIDA" | grep -q '"#999"' && fallo "tomo por sucesor una cita suelta (#999)"

# --- F-2: el ranking publica su denominador --------------------------------
caso "el ranking publica cuantos nodos midio"
python3 "$SCRIPT" --corpus "$FIXTURES/formas" --no-git 2>&1 | grep -qE "nodos medidos: [0-9]+" \
  || fallo "el reporte no declara su denominador"

# --- F-3: un ciclo no cuelga ni cambia el resultado entre corridas ----------
caso "un ciclo termina, y da el mismo resultado dos veces"
A=$(timeout 60 python3 "$SCRIPT" --corpus "$FIXTURES/ciclo" --json 2>&1); RA=$?
B=$(timeout 60 python3 "$SCRIPT" --corpus "$FIXTURES/ciclo" --json 2>&1)
[ $RA -eq 0 ] || fallo "no termino sobre un grafo con ciclo (exit $RA)"
[ "$A" = "$B" ] || fallo "dos corridas sobre el mismo grafo dan resultados distintos"

# El patron NO puede ser /ciclo/ a secas: la rama que dice "ciclos: 0" tambien
# lo contiene, asi que un grep por la palabra pasa con el reporte anulado —
# medido. Se afirma sobre el CONTEO y sobre la enumeracion, que es lo que
# distingue "hay ciclos" de "hay cero".
# Sin la arista de vuelta el grafo es BIPARTITO —todas las aristas van de
# hallazgo a tarea— y no puede tener ciclos. Un control de ciclos sobre el es
# verde por construccion, no por ausencia: el reporte tiene que DECIRLO en vez
# de publicar un cero que nadie puede interpretar. Medido: con --no-git los
# nueve fixtures dan 0 ciclos, y ese 0 no es evidencia de nada.
caso "sin arista de vuelta, el reporte declara que el cero no es evidencia"
python3 "$SCRIPT" --corpus "$FIXTURES/ciclo" --no-git 2>&1 \
  | grep -qE "bipartito y no puede tener ciclos" \
  || fallo "publico ciclos: 0 sin declarar que el grafo no puede tenerlos"

caso "con arista de vuelta, el reporte publica su cobertura"
python3 "$SCRIPT" --corpus "$FIXTURES/ciclo" 2>&1 \
  | grep -qE "arista de vuelta: [0-9]+ de [0-9]+ commits" \
  || fallo "no publico la cobertura de la arista de vuelta"

# --- el orden: el nodo que desbloquea a mas va antes que la hoja -----------
caso "ordena por lo que desbloquea, no por el numero de la tarea"
ORDEN=$(python3 "$SCRIPT" --corpus "$FIXTURES/orden" --no-git --json 2>&1)
CUBO=$(python3 - "$ORDEN" <<'PY'
import json, sys
d = json.loads(sys.argv[1])
orden = [n['id'] for n in d['ranking']]
# el fixture declara #201 como raiz de tres, y #204 como hoja
print('OK' if orden.index('#201') < orden.index('#204') else 'MAL')
PY
)
[ "$CUBO" = "OK" ] || fallo "la hoja quedo antes que la raiz que desbloquea a tres"

# --- el DESCONOCIDO tiene prioridad ---------------------------------------
# El fixture pone el DESCONOCIDO en #302 y el comun en #301 A PROPOSITO: con
# los IDs al reves, el desempate alfabetico del orden por rango produce el
# mismo resultado que la prioridad, y el caso pasaria con la prioridad
# quitada — medido. Asi solo la prioridad puede adelantarlo.
caso "un DESCONOCIDO va antes que un pendiente comun del mismo peso"
# El `|| exit 0` que este bloque tenia salia del script ENTERO con exit 0
# en cuanto el caso fallaba: el fallo se veia como un pase silencioso, sin
# resumen. Medido al sabotear la prioridad — el guion no imprimio ni FALLA
# ni OK. Ahora el estado se captura sin salir del script.
PRIO=$(python3 "$SCRIPT" --corpus "$FIXTURES/desconocido" --no-git --json 2>&1)
ORDEN_OK=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
orden = [n['id'] for n in d['ranking']]
print('OK' if orden.index('#302') < orden.index('#301') else 'MAL')
" "$PRIO" 2>/dev/null)
[ "$ORDEN_OK" = "OK" ] || fallo "el DESCONOCIDO no gano al pendiente comun de igual peso"

# --- el reparto del sumidero: lo que hace que un nodo aislado tenga masa ----
# Sin la rama de sumidero de cytoscape, un nodo que nadie apunta queda en CERO
# exacto antes de normalizar, y el ranking premia solo a los conectados. Es la
# pieza del mecanismo que ningun otro caso toca.
caso "un nodo aislado recibe masa, que es lo que hace el reparto del sumidero"
python3 "$SCRIPT" --corpus "$FIXTURES/orden" --no-git --json 2>&1 | python3 -c "
import json, sys
d = json.load(sys.stdin)
ceros = [r['id'] for r in d['ranking'] if r['rank'] == 0.0]
sys.exit(1 if ceros else 0)
" || fallo "algun nodo quedo en rango cero: el sumidero no repartio"

# --- el CRITERIO del orden es la alcanzabilidad, no el rango -----------------
# El caso del fixture `orden` no mide esto: alli los dos nodos comparados son
# tareas, con alcanzabilidad 0 las dos, asi que lo decide el rango. Anulando
# `reachable_count` la suite seguia verde — medido, control C6. Este fixture
# pone las dos metricas en DIRECCIONES OPUESTAS: `h-test-011` alcanza a cuatro
# y tiene el rango minimo (nadie apunta a un hallazgo en un grafo bipartito);
# `#405` tiene el rango mayor del fixture —cinco hallazgos lo apuntan— y no
# alcanza a nadie. Solo la alcanzabilidad puede adelantar al primero.
caso "ordena por alcanzabilidad cuando el rango dice lo contrario"
ALC=$(python3 "$SCRIPT" --corpus "$FIXTURES/alcance" --no-git --json 2>&1)
ALC_OK=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
orden = [n['id'] for n in d['ranking']]
rangos = {n['id']: n['rank'] for n in d['ranking']}
# precondicion del fixture: el rango de #405 es MAYOR, o el caso no prueba nada
if rangos['#405'] <= rangos['h-test-011']:
    print('FIXTURE-ROTO')
else:
    print('OK' if orden.index('h-test-011') < orden.index('#405') else 'MAL')
" "$ALC" 2>/dev/null)
case "$ALC_OK" in
  OK) ;;
  FIXTURE-ROTO) fallo "el fixture dejo de oponer rango y alcanzabilidad: no prueba nada" ;;
  *) fallo "el nodo de rango alto y alcance cero gano al que desbloquea a cuatro" ;;
esac

# --- el id de una tarea NO es unico: lo es el par (id, sesion) --------------
# La tabla `tasks` del store lo declara asi en su clave primaria, y el tablero
# que una sesion tiene a la vista es solo SU rebanada. El reporte tiene que
# publicar cuantas citas resuelven a mas de un trabajo — y, sin store, decir
# que NO PUDO medirlo en vez de publicar un cero, que seria un verde falso.
caso "publica la ambiguedad del id de tarea, y sin store dice que no pudo"
python3 "$SCRIPT" --corpus "$FIXTURES/orden" --no-git 2>&1 \
  | grep -qE "id de tarea: [0-9]+ de [0-9]+ citadas|id de tarea: SIN RESOLVER" \
  || fallo "el reporte no dice nada sobre la resolucion del id de tarea"

SIN_STORE=$(python3 -c "
import sys
sys.path.insert(0, '.claude/scripts/task')
import closure_graph as cg
print(cg.task_ambiguity({'h-x': ['#1']}, store='/no/existe/store.sqlite3'))
" 2>/dev/null)
[ "$SIN_STORE" = "None" ] \
  || fallo "sin store devolvio '$SIN_STORE' en vez de None: un 0 seria verde falso"

echo
if [ $fallos -eq 0 ]; then
  echo "OK: $casos casos, 0 fallos (alcance medido: 5 fixtures)"
else
  echo "FAIL: $casos casos, $fallos fallo(s)"
fi
exit $((fallos > 0))
