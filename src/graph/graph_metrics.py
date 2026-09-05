#!/usr/bin/env python3
"""Métricas de grafo para decidir el orden de un trabajo con dependencias.

Adaptación nativa de cuatro algoritmos de ``cytoscape.js`` (MIT), que viene
embebida en el ejecutable del cliente y por eso se pudo leer su superficie:
``degreeCentrality`` · ``betweennessCentrality`` (Brandes) ·
``closenessCentralityNormalized`` (sobre BFS) · ``markovClustering``.

La librería **no se instala**: es JavaScript de navegador con motor de
renderizado. Lo que se adapta es el algoritmo, con el mismo criterio que
gobierna el resto del proyecto — la fuente se lee, no se ejecuta.

Por qué existe: el grado de salida (cuántos dependen de un nodo) premia a los
nodos que *todo el mundo* usa, que suelen ser justo los que ya están hechos.
La intermediación mide los caminos que **pasan por** el nodo, así que destapa
los puentes; y la agrupación de Markov parte el grafo por flujo, no por
parecido de texto.

El script es abstracto: no conoce ningún dato del proyecto. La población
entra por argumento — una raíz de manifiestos o un archivo de aristas.

Uso
---
    graph_metrics.py --manifests <raiz>        # lee */__manifest__.py
    graph_metrics.py --edges <archivo>         # "origen destino" por línea
    graph_metrics.py --manifests <raiz> --inflation 3.0 --drop-hub base
    graph_metrics.py --edges <archivo> --json
"""

import argparse
import ast
import json
import pathlib
import sys
from collections import defaultdict, deque


def load_from_manifests(root):
    """Aristas ``addon -> dependencia`` leídas de cada ``__manifest__.py``.

    Un manifiesto ilegible se omite y se cuenta aparte: su silencio no debe
    leerse como «ese addon no depende de nada».
    """
    edges = []
    unreadable = []
    for manifest in sorted(pathlib.Path(root).glob("*/__manifest__.py")):
        try:
            data = ast.literal_eval(manifest.read_text())
        except (SyntaxError, ValueError):
            unreadable.append(manifest.parent.name)
            continue
        for dep in data.get("depends", []):
            edges.append((manifest.parent.name, dep))
    return edges, unreadable


def load_from_edges(path):
    """Aristas de un archivo de texto: dos campos por línea, ``#`` comenta."""
    edges = []
    for line in pathlib.Path(path).read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 2:
            raise ValueError(f"línea con {len(parts)} campos, se esperaban 2: {line!r}")
        edges.append((parts[0], parts[1]))
    return edges, []


def build_adjacency(edges):
    """Devuelve ``(nodes, successors, predecessors)`` con los nodos ordenados."""
    successors = defaultdict(set)
    predecessors = defaultdict(set)
    nodes = set()
    for source, target in edges:
        nodes.add(source)
        nodes.add(target)
        successors[source].add(target)
        predecessors[target].add(source)
    return sorted(nodes), successors, predecessors


def out_degree(nodes, successors):
    """Grado de salida — cuántos vecinos directos tiene cada nodo."""
    return {node: len(successors.get(node, ())) for node in nodes}


def in_degree(nodes, predecessors):
    """Grado de entrada — cuántos dependen directamente del nodo."""
    return {node: len(predecessors.get(node, ())) for node in nodes}


def betweenness(nodes, successors):
    """Intermediación de Brandes sobre un dígrafo sin pesos.

    ≙ ``betweennessCentrality`` de cytoscape.js. Acumula, para cada par de
    nodos, la fracción de caminos mínimos que atraviesan un tercero.
    """
    score = {node: 0.0 for node in nodes}
    for source in nodes:
        stack = []
        paths = defaultdict(list)
        sigma = defaultdict(int)
        sigma[source] = 1
        distance = {source: 0}
        queue = deque([source])
        while queue:
            current = queue.popleft()
            stack.append(current)
            for neighbour in successors.get(current, ()):
                if neighbour not in distance:
                    distance[neighbour] = distance[current] + 1
                    queue.append(neighbour)
                if distance[neighbour] == distance[current] + 1:
                    sigma[neighbour] += sigma[current]
                    paths[neighbour].append(current)
        delta = defaultdict(float)
        while stack:
            current = stack.pop()
            for predecessor in paths[current]:
                delta[predecessor] += (
                    sigma[predecessor] / sigma[current] * (1 + delta[current])
                )
            if current != source:
                score[current] += delta[current]
    return score


def closeness(nodes, successors):
    """Cercanía normalizada — inversa de la distancia media a los alcanzables.

    ≙ ``closenessCentralityNormalized``. Un nodo aislado obtiene 0, no un
    infinito que rompa el orden.
    """
    score = {}
    total = len(nodes)
    for source in nodes:
        distance = {source: 0}
        queue = deque([source])
        while queue:
            current = queue.popleft()
            for neighbour in successors.get(current, ()):
                if neighbour not in distance:
                    distance[neighbour] = distance[current] + 1
                    queue.append(neighbour)
        reachable = [d for node, d in distance.items() if node != source]
        if reachable:
            score[source] = (len(reachable) / (total - 1)) * (
                len(reachable) / sum(reachable)
            )
        else:
            score[source] = 0.0
    return score


def markov_clustering(
    nodes, edges, expansion=2, inflation=2.0, iterations=12, prune=1e-8
):
    """Agrupación de Markov sobre la forma no dirigida del grafo.

    ≙ ``markovClustering``. El ciclo es normalizar → expandir (M^p) → inflar
    (M.^r renormalizado) hasta que el flujo se concentra en atractores; cada
    atractor define una comunidad.

    La dirección se descarta a propósito: el flujo de Markov exige simetría, y
    lo que se busca aquí es la familia, no el orden.

    **La matriz es dispersa, y la poda es lo que la mantiene así.** El grafo de
    dependencias lo es —cada nodo toca a unos pocos— pero la **expansión no
    respeta esa dispersión**: ``M²`` convierte ceros en valores diminutos y a
    la segunda iteración la matriz está llena aunque el grafo no lo esté. Por
    eso el paso de poda no es una optimización opcional: sin él, una
    implementación dispersa degenera en la densa al segundo giro.

    ``prune`` es el umbral por debajo del cual una entrada se descarta tras
    inflar. Siempre sobrevive el máximo de cada columna, así que ninguna se
    queda vacía por agresivo que sea el umbral.

    **El default de 1e-8 está medido, no elegido.** Con ``prune=0`` el
    resultado es el de la implementación densa por construcción, así que sirve
    de control: sobre 628 nodos y 1332 aristas de la referencia, ``1e-8``
    devuelve la **partición idéntica** en 1.55 s contra 186.98 s. Un umbral más
    flojo compra un poco más de velocidad y cambia la respuesta — ``1e-6``
    mueve 4 grupos, ``1e-4`` mueve 23 y ``1e-3`` mueve 105. Es la frontera
    entre podar lo despreciable y podar lo que decide.

    La matriz se guarda como ``{columna: {fila: valor}}`` — por columna, porque
    es la orientación en la que se normaliza y en la que se lee el atractor.
    """
    matrix = defaultdict(dict)
    for source, target in edges:
        matrix[target][source] = 1.0
        matrix[source][target] = 1.0
    for node in nodes:
        matrix[node][node] = 1.0

    def normalise(current):
        for column, rows in current.items():
            total = sum(rows.values())
            if total:
                current[column] = {row: value / total for row, value in rows.items()}
        return current

    def multiply(left, right):
        """``left · right`` en dispersa: columna j = Σ_k right[j][k] · left[k]."""
        result = defaultdict(dict)
        for column, rows in right.items():
            accumulated = result[column]
            for middle, weight in rows.items():
                for row, value in left.get(middle, {}).items():
                    accumulated[row] = accumulated.get(row, 0.0) + weight * value
        return result

    def expand(current, power):
        result = current
        for _ in range(power - 1):
            result = multiply(result, current)
        return result

    def inflate(current, rate, threshold):
        result = defaultdict(dict)
        for column, rows in current.items():
            raised = {row: value**rate for row, value in rows.items()}
            peak = max(raised.values(), default=0.0)
            # El máximo sobrevive siempre: una columna vacía perdería su nodo.
            result[column] = {
                row: value
                for row, value in raised.items()
                if value >= threshold or value == peak
            }
        return normalise(result)

    matrix = normalise(matrix)
    for _ in range(iterations):
        matrix = inflate(expand(matrix, expansion), inflation, prune)

    communities = defaultdict(list)
    for node in nodes:
        rows = matrix.get(node)
        if not rows:
            communities[node].append(node)
            continue
        attractor = max(rows, key=lambda row: (rows[row], row))
        communities[attractor].append(node)
    return sorted(communities.values(), key=len, reverse=True)


def rank(score, top):
    """Los ``top`` nodos de mayor puntaje, de mayor a menor."""
    return sorted(score.items(), key=lambda pair: -pair[1])[:top]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    origin = parser.add_mutually_exclusive_group(required=True)
    origin.add_argument("--manifests", help="raíz con <addon>/__manifest__.py")
    origin.add_argument("--edges", help="archivo de aristas 'origen destino'")
    parser.add_argument("--top", type=int, default=10, help="cuántos nodos listar")
    parser.add_argument("--expansion", type=int, default=2, help="potencia de expansión")
    parser.add_argument("--inflation", type=float, default=2.0, help="tasa de inflación")
    parser.add_argument("--iterations", type=int, default=12, help="ciclos de Markov")
    parser.add_argument(
        "--prune",
        type=float,
        default=1e-8,
        help="umbral de poda tras inflar; 0 reproduce la densa (lento). "
        "El default está medido: da la partición idéntica a la densa",
    )
    parser.add_argument(
        "--drop-hub",
        action="append",
        default=[],
        help="nodo a excluir antes de agrupar (repetible)",
    )
    parser.add_argument("--no-clustering", action="store_true", help="omitir Markov")
    parser.add_argument("--json", action="store_true", help="salida legible por máquina")
    args = parser.parse_args(argv)

    if args.manifests:
        edges, unreadable = load_from_manifests(args.manifests)
    else:
        edges, unreadable = load_from_edges(args.edges)

    if not edges:
        print("sin aristas: no hay grafo que medir", file=sys.stderr)
        return 1

    nodes, successors, predecessors = build_adjacency(edges)
    grade_out = out_degree(nodes, successors)
    grade_in = in_degree(nodes, predecessors)
    bridge = betweenness(nodes, successors)
    near = closeness(nodes, successors)

    communities = []
    if not args.no_clustering:
        kept = [node for node in nodes if node not in set(args.drop_hub)]
        pruned = [
            (source, target)
            for source, target in edges
            if source in set(kept) and target in set(kept)
        ]
        if pruned:
            communities = markov_clustering(
                kept,
                pruned,
                args.expansion,
                args.inflation,
                args.iterations,
                args.prune,
            )

    result = {
        "nodes": len(nodes),
        "edges": len(edges),
        "unreadable": unreadable,
        "in_degree": rank(grade_in, args.top),
        "out_degree": rank(grade_out, args.top),
        "betweenness": rank(bridge, args.top),
        "closeness": rank(near, args.top),
        "communities": communities,
        "parameters": {
            "expansion": args.expansion,
            "inflation": args.inflation,
            "iterations": args.iterations,
            "dropped_hubs": args.drop_hub,
        },
    }

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    print(f"{len(nodes)} nodos · {len(edges)} aristas", end="")
    if unreadable:
        print(f" · {len(unreadable)} manifiesto(s) ilegible(s): {', '.join(unreadable)}")
    else:
        print()
    for label, ranking in (
        ("grado de entrada (cuántos dependen de él)", result["in_degree"]),
        ("grado de salida (de cuántos depende)", result["out_degree"]),
        ("intermediación (puentes)", result["betweenness"]),
        ("cercanía", result["closeness"]),
    ):
        print(f"\n{label}:")
        for node, value in ranking:
            print(f"  {value:10.2f}  {node}")
    if communities:
        print(
            f"\ncomunidades (inflación {args.inflation}, "
            f"{len(communities)} grupos sobre {sum(len(c) for c in communities)} nodos):"
        )
        for community in communities:
            print(f"  [{len(community):3d}] {', '.join(community[:12])}"
                  + (" …" if len(community) > 12 else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
