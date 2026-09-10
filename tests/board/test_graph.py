#!/usr/bin/env python3
"""Prueba de ``board.graph`` — la capa de consulta del tablero (tarea #78).

Mitad ROJA escrita antes del mecanismo.

Por que estas funciones y no otras
-----------------------------------

La eleccion no sale de un catalogo de algoritmos sino de la **forma medida del
grafo real**: 1006 nodos, 66 aristas distintas, densidad 0.000065, **90 % de nodos
aislados**, grado maximo 5, y sin ciclos. Con esa forma:

- **El rendimiento no decide.** 66 aristas: cualquier recorrido termina al
  instante. Lo que si decide es el **numero de nodos**, y en sentido contrario
  al habitual: un all-pairs denso como Floyd-Warshall serian ~1.0e9 pasos sobre
  1006 nodos para responder preguntas que un BFS resuelve en 66.
- **PageRank no discrimina.** Medido sobre el grafo real: 16 valores distintos
  en 1006 nodos y **956 (95 %) exactamente en el piso** ``(1-d)/N``. Da un
  numero a cada tarea y separa a casi ninguna. Es el sub-patron D aplicado a un
  algoritmo: devuelve un valor siempre, y ese valor no distingue.
- **Contar descendientes si.** Responde a una pregunta que el tablero hace de
  verdad —«cerrar esta, ¿a cuantas desbloquea?»— y su reparto medido es
  952/41/6/4/1/2: concentrado, pero las 54 no nulas son accionables.
- **El detector de ciclos se queda aunque hoy no encuentre ninguno**, y
  precisamente por eso: es un control que **puede fallar**. Un orden topologico
  sobre un grafo con ciclo devolveria una lista corta en silencio.

Que se prueba, y contra que
----------------------------

1. Las funciones operan sobre un **grafo**, no sobre una base de datos. Es lo
   que las hace comprobables sin store y reusables por otro consumidor.
2. Cada consulta trae su caso negativo: el ciclo que se detecta, el orden que
   rehusa, el nodo desconocido que se nombra.

Uso:  python3 tests/board/test_graph.py
"""

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[2] / "src"))

from board import graph  # noqa: E402

PASS = 0
FAIL = 0


def check(label: str, expected, actual) -> None:
    global PASS, FAIL
    if expected == actual:
        PASS += 1
        print(f"  ok    {label}")
    else:
        FAIL += 1
        print(f"  FALLA {label}\n          esperado: {expected!r}\n          real:     {actual!r}")


def check_raises(label: str, exc_type, fn) -> None:
    global PASS, FAIL
    try:
        fn()
    except exc_type:
        PASS += 1
        print(f"  ok    {label}")
        return
    except Exception as err:  # noqa: BLE001
        FAIL += 1
        print(f"  FALLA {label}: alzó {type(err).__name__}, no {exc_type.__name__}")
        return
    FAIL += 1
    print(f"  FALLA {label}: no alzó nada")


#   a -> b -> d
#   a -> c
#   e            (aislado, como el 90 % del grafo real)
EDGES = [("a", "b"), ("b", "d"), ("a", "c")]
NODES = ["a", "b", "c", "d", "e"]


print("\n1. El grafo se construye desde aristas, no desde una base de datos")
g = graph.build_graph(NODES, EDGES)
check("conserva los nodos declarados", set(NODES), set(graph.nodes(g)))
check("y las aristas", 3, len(list(graph.edges(g))))
check("un nodo aislado sigue siendo nodo", True, "e" in graph.nodes(g))

print("\n2. Descendientes — a cuántas desbloquea cerrar una")
check("a desbloquea a las tres", {"b", "c", "d"}, graph.descendants(g, "a"))
check("b sólo a d", {"d"}, graph.descendants(g, "b"))
check("una hoja a ninguna", set(), graph.descendants(g, "d"))
check("un aislado a ninguna", set(), graph.descendants(g, "e"))
check("unblock_count es su tamaño", 3, graph.unblock_count(g, "a"))
check_raises("un nodo desconocido se nombra", KeyError, lambda: graph.descendants(g, "zz"))

print("\n3. Listas para trabajar — sin bloqueante pendiente")
status = {"a": "pending", "b": "pending", "c": "pending", "d": "pending", "e": "pending"}
check("sólo las que nadie bloquea", {"a", "e"}, set(graph.ready(g, status)))
# Al cerrar `a`, sus dos hijas quedan listas.
status["a"] = "completed"
check("cerrar a libera b y c", {"b", "c", "e"}, set(graph.ready(g, status)))
# Un estado ausente cuenta como pendiente: es el default seguro.
check("un estado ausente cuenta como pendiente", True, "e" in graph.ready(g, {}))

print("\n4. Orden topológico, y el ciclo que lo invalida")
order = graph.topological_order(g)
check("los cinco aparecen una vez", 5, len(order))
check("a va antes que b", True, order.index("a") < order.index("b"))
check("b va antes que d", True, order.index("b") < order.index("d"))

ciclico = graph.build_graph(["x", "y", "z"], [("x", "y"), ("y", "z"), ("z", "x")])
check("find_cycle NO ve ciclo donde no lo hay", None, graph.find_cycle(g))
check("y SÍ lo ve donde lo hay", True, graph.find_cycle(ciclico) is not None)
check_raises(
    "el orden REHÚSA sobre un ciclo, no devuelve una lista corta",
    graph.CycleError,
    lambda: graph.topological_order(ciclico),
)

print("\n5. Componentes — los grupos independientes de trabajo")
comps = graph.components(g)
check("dos: {a,b,c,d} y {e}", 2, len(comps))
check("el aislado es su propio componente", True, {"e"} in comps)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
sys.exit(1 if FAIL else 0)
