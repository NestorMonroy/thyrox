#!/usr/bin/env python3
"""Las consultas del tablero sobre su grafo de dependencias.

Qué algoritmo se implementa, y por qué ése
-------------------------------------------

La elección no sale de un catálogo sino de la **forma medida del grafo real**
(2026-09-05, 1006 tareas distintas del store): **66 aristas distintas**, densidad 0.000065, **90 %
de nodos aislados**, grado máximo 5, y **sin ciclos**.

Con esa forma, los criterios se ordenan distinto de lo habitual:

- **El rendimiento no es el que decide, y cuando decide es al revés.** 66
  aristas: cualquier recorrido termina al instante. Lo que sí pesa es el
  **número de nodos**: un all-pairs denso —Floyd-Warshall, O(n³)— serían ~1.0e9
  pasos sobre 1006 nodos para responder preguntas que un BFS resuelve
  recorriendo 66 aristas. No se descarta por «lento en teoría»: se descarta
  porque a **este** n cuesta ocho órdenes de magnitud más que la alternativa.
- **Lo que sí decide es la claridad**, porque este código se lee mucho más de
  lo que se ejecuta. Un BFS con una pila y un conjunto lo entiende quien llega;
  una matriz de distancias exige reconstruir por qué hay una matriz.
- **Y la capacidad de discriminar.** Una consulta que devuelve un valor para
  todo nodo y separa a casi ninguno no informa, aunque corra.

Lo que NO se implementa, medido
--------------------------------

**PageRank**, que la pieza equivalente de ``kaupamex-docs`` sí tiene. Corrido
sobre el grafo real da **16 valores distintos en 1006 nodos**, con **956 (95 %)
exactamente en el piso** ``(1-d)/N`` y un rango de 4.8x. Da un número a cada
tarea y no separa a dos tercios de ellas.

Tiene sentido: PageRank mide importancia en un paseo aleatorio, y en un grafo
donde el 90 % de los nodos no tiene ninguna arista el paseo no va a ninguna
parte. **No es que esté mal implementado: es que su pregunta no es la del
tablero.** Es el sub-patrón D de ``metrica-decide-la-conclusion.md`` aplicado a
un algoritmo — devuelve siempre, y su valor no discrimina.

Su sustituto es ``unblock_count``: responde «cerrar ésta, ¿a cuántas
desbloquea?», que es la pregunta que el tablero hace de verdad. Su reparto
medido —952 con cero, 41 con una, 6 con dos, 4 con tres, 1 con cuatro y 2 con
cinco— también concentra, pero las 54 no nulas son **accionables**.

Lo que se conserva aunque hoy no encuentre nada
------------------------------------------------

``find_cycle``, sobre un grafo que hoy es un DAG. Precisamente por eso: es un
control que **puede fallar**. Sin él, ``topological_order`` sobre un grafo con
ciclo devolvería una lista **corta en silencio** — el defecto que un verde sin
discriminación produce.
"""
from __future__ import annotations

from collections import deque
from typing import Iterable, Iterator, Mapping, Sequence


class CycleError(ValueError):
    """El grafo tiene un ciclo donde el consumidor esperaba un orden.

    Es un tipo propio y no un ``ValueError`` pelado para que un consumidor
    pueda distinguir «no hay orden posible» de «un argumento estaba mal»: el
    primero es un dato del tablero, el segundo un defecto de la llamada.
    """


class Graph:
    """Un grafo dirigido: nodos declarados y aristas ``origen -> destino``.

    Los nodos se declaran aparte de las aristas a propósito. En este tablero el
    **90 % no tiene ninguna arista**, y un grafo que sólo conociera las aristas
    perdería a la gran mayoría de sus tareas.
    """

    __slots__ = ("_nodes", "_out", "_in")

    def __init__(self, nodes: Iterable[str], edges: Iterable[tuple[str, str]]) -> None:
        self._nodes: list[str] = list(dict.fromkeys(nodes))
        known = set(self._nodes)
        self._out: dict[str, list[str]] = {n: [] for n in self._nodes}
        self._in: dict[str, list[str]] = {n: [] for n in self._nodes}
        for source, target in edges:
            for endpoint in (source, target):
                if endpoint not in known:
                    known.add(endpoint)
                    self._nodes.append(endpoint)
                    self._out[endpoint] = []
                    self._in[endpoint] = []
            self._out[source].append(target)
            self._in[target].append(source)

    def require(self, node: str) -> str:
        """El nodo, o un error que lo nombra.

        Rehusar es la conducta correcta: devolver un conjunto vacío para un
        nodo inexistente daría la misma respuesta que para una hoja real, y el
        consumidor no podría distinguirlas.
        """
        if node not in self._out:
            raise KeyError(f"nodo desconocido: {node!r}")
        return node


def build_graph(nodes: Iterable[str], edges: Iterable[tuple[str, str]]) -> Graph:
    """El grafo, desde nodos y aristas — nunca desde una base de datos."""
    return Graph(nodes, edges)


def nodes(graph: Graph) -> tuple[str, ...]:
    """Los nodos, en el orden en que se declararon."""
    return tuple(graph._nodes)


def edges(graph: Graph) -> Iterator[tuple[str, str]]:
    """Las aristas, en el orden de su nodo origen."""
    for source in graph._nodes:
        for target in graph._out[source]:
            yield (source, target)


def descendants(graph: Graph, node: str) -> set[str]:
    """Todo lo alcanzable desde ``node``, sin incluirlo.

    Un BFS con cola y conjunto visitado. Sobre 66 aristas es instantáneo, y su
    coste es proporcional a lo que **alcanza**, no al tamaño del grafo: para el
    90 % de nodos aislados el recorrido termina sin dar un paso.
    """
    graph.require(node)
    seen: set[str] = set()
    queue = deque(graph._out[node])
    while queue:
        current = queue.popleft()
        if current in seen:
            continue
        seen.add(current)
        queue.extend(graph._out[current])
    seen.discard(node)
    return seen


def unblock_count(graph: Graph, node: str) -> int:
    """A cuántas desbloquea cerrar ``node``. El sustituto de PageRank."""
    return len(descendants(graph, node))


def ready(graph: Graph, status: Mapping[str, str], *, done: str = "completed") -> tuple[str, ...]:
    """Las que nadie bloquea: ningún predecesor sigue sin cerrar.

    Dos condiciones, y las dos hacen falta: **no estar cerrada** y no tener
    ningún predecesor abierto. Devolver también las cerradas fue el primer
    intento, y el test lo atrapó — una lista de «qué puedo tomar» que incluye lo
    ya hecho no es una lista de trabajo, es el grafo entero menos los
    bloqueados.

    Un estado ausente cuenta como **pendiente**, que es el default seguro: dar
    por lista una tarea cuyo bloqueante no se sabe si cerró es el error caro;
    dejarla fuera sólo cuesta una consulta más.
    """
    return tuple(
        node for node in graph._nodes
        if status.get(node) != done
        and all(status.get(pred) == done for pred in graph._in[node])
    )


def find_cycle(graph: Graph) -> list[str] | None:
    """Un ciclo del grafo, o ``None``.

    Recorrido en profundidad **iterativo** con los tres colores clásicos. Es
    iterativo y no recursivo por una razón del tablero, no de estilo: con 1006
    nodos una cadena larga agotaría la pila de Python, y el fallo aparecería
    como ``RecursionError`` — un error que no nombra el problema real.
    """
    WHITE, GREY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph._nodes}
    parent: dict[str, str | None] = {}
    for start in graph._nodes:
        if color[start] != WHITE:
            continue
        color[start] = GREY
        parent[start] = None
        stack: list[tuple[str, Iterator[str]]] = [(start, iter(graph._out[start]))]
        while stack:
            node, pending = stack[-1]
            advanced = False
            for nxt in pending:
                if color[nxt] == GREY:
                    cycle = [nxt]
                    walk: str | None = node
                    while walk is not None and walk != nxt:
                        cycle.append(walk)
                        walk = parent.get(walk)
                    cycle.append(nxt)
                    cycle.reverse()
                    return cycle
                if color[nxt] == WHITE:
                    color[nxt] = GREY
                    parent[nxt] = node
                    stack.append((nxt, iter(graph._out[nxt])))
                    advanced = True
                    break
            if not advanced:
                color[node] = BLACK
                stack.pop()
    return None


def topological_order(graph: Graph) -> list[str]:
    """Un orden donde cada nodo va después de sus predecesores.

    Kahn, por indegree. **Rehúsa sobre un ciclo en vez de devolver una lista
    corta**: ésa es la diferencia entre un resultado y un silencio. El ciclo se
    nombra en el error, porque saber que existe sin saber cuál es no deja
    arreglarlo.
    """
    indegree = {n: len(graph._in[n]) for n in graph._nodes}
    queue = deque(n for n in graph._nodes if indegree[n] == 0)
    order: list[str] = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nxt in graph._out[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)
    if len(order) != len(graph._nodes):
        cycle = find_cycle(graph)
        raise CycleError(
            f"no hay orden topológico: {len(graph._nodes) - len(order)} nodo(s) en ciclo. "
            f"Uno de ellos: {' -> '.join(cycle) if cycle else '(no localizado)'}. "
            "NO se devuelve el orden parcial: una lista corta se lee como completa."
        )
    return order


def components(graph: Graph) -> list[set[str]]:
    """Los grupos de trabajo independientes, ignorando la dirección.

    Débilmente conexos: para repartir trabajo lo que importa es si dos tareas
    se tocan, no en qué sentido. Sobre el grafo real esto separa el 90 % de
    aislados en sus propios componentes, que es el dato útil — cada uno se
    puede tomar sin coordinar con nadie.
    """
    seen: set[str] = set()
    result: list[set[str]] = []
    for start in graph._nodes:
        if start in seen:
            continue
        group: set[str] = set()
        queue = deque([start])
        while queue:
            node = queue.popleft()
            if node in group:
                continue
            group.add(node)
            queue.extend(graph._out[node])
            queue.extend(graph._in[node])
        seen |= group
        result.append(group)
    return result
