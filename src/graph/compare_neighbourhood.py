#!/usr/bin/env python3
"""¿Qué vecindario acierta más: el léxico o el del grafo?

Mide, sobre **la misma población**, cuántos de los vecinos que propone cada
método son dependencias reales. Es la comparación que faltaba para decidir si
la agrupación de Markov sustituye o complementa al vecindario por coseno.

- **Léxico** — coseno sobre tf-idf del texto del manifiesto (nombre, resumen,
  descripción). Es el mismo instrumento que ``vecinos_de_tarea.py`` aplica a
  las fichas de tarea, aquí sobre addons para que haya con qué comparar.
- **Grafo** — la comunidad que ``markovClustering`` asigna al nodo.

El acierto se define contra la adyacencia declarada: un vecino propuesto
acierta si existe una arista ``depends`` entre los dos, en cualquier sentido.

*Métrica:* fracción de vecinos propuestos que son adyacentes en el grafo.
*Ciega a:* la dependencia **transitiva** — dos addons de la misma familia sin
arista directa cuentan como fallo aunque el trabajo sí esté relacionado. Es
por tanto una **cota inferior** de la precisión de los dos métodos, y castiga
más al que propone comunidades grandes.

Uso
---
    compare_neighbourhood.py --manifests <raiz>
    compare_neighbourhood.py --manifests <raiz> -k 5 --inflation 2.0 --drop-hub base
    compare_neighbourhood.py --manifests <raiz> --seed sale --json
"""

import argparse
import ast
import importlib.util
import json
import math
import pathlib
import re
from collections import Counter, defaultdict

_HERE = pathlib.Path(__file__).resolve().parent
_SPEC = importlib.util.spec_from_file_location("graph_metrics", _HERE / "graph_metrics.py")
_GRAPH = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_GRAPH)

TOKEN = re.compile(r"[a-záéíóúñ]{3,}", re.IGNORECASE)


def load_documents(root):
    """Texto por addon: su nombre de directorio más los campos de prosa."""
    documents = {}
    for manifest in sorted(pathlib.Path(root).glob("*/__manifest__.py")):
        try:
            data = ast.literal_eval(manifest.read_text())
        except (SyntaxError, ValueError):
            continue
        name = manifest.parent.name
        pieces = [name.replace("_", " ")]
        for key in ("name", "summary", "description", "category"):
            value = data.get(key)
            if isinstance(value, str):
                pieces.append(value)
        documents[name] = " ".join(pieces)
    return documents


def tokenize(text):
    return [token.lower() for token in TOKEN.findall(text)]


def build_vectors(documents):
    """Vectores tf-idf normalizados, uno por documento."""
    tokenized = {name: tokenize(text) for name, text in documents.items()}
    frequency = Counter()
    for tokens in tokenized.values():
        frequency.update(set(tokens))
    total = len(tokenized)
    vectors = {}
    for name, tokens in tokenized.items():
        counts = Counter(tokens)
        vector = {}
        for token, count in counts.items():
            weight = (1 + math.log(count)) * math.log(total / (1 + frequency[token]))
            if weight > 0:
                vector[token] = weight
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
        vectors[name] = {token: value / norm for token, value in vector.items()}
    return vectors


def cosine(left, right):
    if len(left) > len(right):
        left, right = right, left
    return sum(value * right.get(token, 0.0) for token, value in left.items())


def lexical_neighbours(vectors, seed, k):
    """Los ``k`` documentos más cercanos por coseno, sin contar el propio."""
    scored = [
        (cosine(vectors[seed], vector), name)
        for name, vector in vectors.items()
        if name != seed
    ]
    scored.sort(key=lambda pair: -pair[0])
    return [name for _, name in scored[:k]]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--manifests", required=True, help="raíz con <addon>/__manifest__.py")
    parser.add_argument("-k", type=int, default=5, help="vecinos léxicos por nodo")
    parser.add_argument("--inflation", type=float, default=2.0)
    parser.add_argument("--expansion", type=int, default=2)
    parser.add_argument("--iterations", type=int, default=12)
    parser.add_argument("--drop-hub", action="append", default=[])
    parser.add_argument("--seed", help="detallar un nodo concreto")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    edges, _ = _GRAPH.load_from_manifests(args.manifests)
    documents = load_documents(args.manifests)
    dropped = set(args.drop_hub)

    nodes = sorted({node for edge in edges for node in edge} - dropped)
    pruned = [
        (source, target)
        for source, target in edges
        if source not in dropped and target not in dropped
    ]
    adjacency = defaultdict(set)
    for source, target in pruned:
        adjacency[source].add(target)
        adjacency[target].add(source)

    documents = {name: text for name, text in documents.items() if name in set(nodes)}
    vectors = build_vectors(documents)

    communities = _GRAPH.markov_clustering(
        nodes, pruned, args.expansion, args.inflation, args.iterations
    )
    community_of = {}
    for community in communities:
        for member in community:
            community_of[member] = [other for other in community if other != member]

    rows = []
    for node in nodes:
        if node not in vectors or not adjacency[node]:
            continue
        lexical = lexical_neighbours(vectors, node, args.k)
        graph_side = community_of.get(node, [])
        rows.append(
            {
                "node": node,
                "degree": len(adjacency[node]),
                "lexical": lexical,
                "lexical_hits": sum(1 for other in lexical if other in adjacency[node]),
                "community": graph_side,
                "community_hits": sum(
                    1 for other in graph_side if other in adjacency[node]
                ),
            }
        )

    # El denominador de la cobertura: las adyacencias reales de los nodos medidos.
    real = sum(row["degree"] for row in rows)

    def block(proposed, adjacent):
        return {
            "proposed": proposed,
            "adjacent": adjacent,
            "precision": round(adjacent / proposed, 4) if proposed else 0,
            "recall": round(adjacent / real, 4) if real else 0,
        }

    summary = {
        "measured_nodes": len(rows),
        "real_adjacencies": real,
        "k": args.k,
        "inflation": args.inflation,
        "dropped_hubs": sorted(dropped),
        "lexical": block(
            sum(len(row["lexical"]) for row in rows),
            sum(row["lexical_hits"] for row in rows),
        ),
        "community": block(
            sum(len(row["community"]) for row in rows),
            sum(row["community_hits"] for row in rows),
        ),
    }

    if args.json:
        print(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2))
        return 0

    print(
        f"{summary['measured_nodes']} nodos medidos · k={args.k} · "
        f"inflación {args.inflation}"
        + (f" · sin {', '.join(summary['dropped_hubs'])}" if dropped else "")
    )
    for label, block in (("léxico", summary["lexical"]), ("comunidad", summary["community"])):
        print(
            f"  {label:10s} {block['adjacent']:4d} de {block['proposed']:4d} propuestos "
            f"son adyacentes  (precisión {block['precision']:.1%} · "
            f"cobertura {block['recall']:.1%} de {summary['real_adjacencies']})"
        )
    if args.seed:
        for row in rows:
            if row["node"] == args.seed:
                print(f"\n{args.seed} (grado {row['degree']}):")
                print(
                    f"  léxico    {row['lexical_hits']}/{len(row['lexical'])}: "
                    + ", ".join(
                        f"{other}{'*' if other in adjacency[args.seed] else ''}"
                        for other in row["lexical"]
                    )
                )
                print(
                    f"  comunidad {row['community_hits']}/{len(row['community'])}: "
                    + ", ".join(
                        f"{other}{'*' if other in adjacency[args.seed] else ''}"
                        for other in row["community"]
                    )
                )
                print("  (* = dependencia declarada)")
                break
        else:
            print(f"\n{args.seed}: sin aristas o sin manifiesto legible")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
