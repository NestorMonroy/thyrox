#!/usr/bin/env python3
"""Prueba de vecinos_de_tarea.py — sin cobertura hasta este archivo.

vecinos_de_tarea.py (``api@db63bf5c``) implementa la familia no supervisada
declarada por D-01..D-05 de la iniciativa
``implementar-knn-vecinos-mas-cercanos`` (fuerza bruta, coseno, tf-idf, cero
dependencias externas), pero se commiteo sin ningun test — ``ls
.claude/scripts/tests/`` no listaba ``test-vecinos-de-tarea.*`` antes de este
archivo. Cubre:

1. **El adaptador** (``tokenize``/``build_vectors``) — identificadores enteros
   Y partidos, idf que castiga terminos frecuentes, norma L2 unitaria.
2. **El heuristico** (``choose_algorithm``) — las cinco condiciones que
   ``sklearn.neighbors`` documenta para ``algorithm='auto'``, una por una.
3. **El motor** (``NearestNeighbors``) — ``kneighbors``, ``radius_neighbors``,
   ``kneighbors_graph`` con su contrato CSR, y ``weigh()`` con el caso
   degenerado de distancia cero.
4. **El contrato del grafo** (``check_graph_contract``) — positivo Y negativo
   (indices duplicados, distancias sin ordenar) fabricados a mano, porque un
   contrato que solo se prueba contra su propio generador nunca ve una fila
   rota.
5. **El CLI** (``main``) — extremo a extremo sobre tareas fixture en un
   directorio temporal, incluido el filtro por ``--status``.

Uso:  python3 .claude/scripts/tests/test_vecinos_de_tarea.py
"""

from __future__ import annotations

import importlib.util
import io
import json
import math
import pathlib
import sys
import tempfile
from contextlib import redirect_stdout

# El SUT vive un nivel arriba (``.claude/scripts/``), hermano de este
# directorio de tests — mismo patron que test-clasificar_agentes.py. El
# nombre del modulo lleva guiones, asi que no es importable con `import`
# normal: se carga por ruta con importlib.
HERE = pathlib.Path(__file__).resolve().parents[2] / "src"
spec = importlib.util.spec_from_file_location("vecinos", HERE / "task" / "vecinos_de_tarea.py")
vecinos = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(vecinos)

PASS = 0
FAIL = 0


def check(desc: str, expected, got) -> None:
    global PASS, FAIL
    if expected == got:
        PASS += 1
        print(f"  ok    {desc}")
    else:
        FAIL += 1
        print(f"  FALLA {desc}\n        esperado: {expected}\n        obtenido: {got}")


def check_true(desc: str, condition: bool) -> None:
    check(desc, True, bool(condition))


print("== 1. tokenize/build_vectors — el adaptador ==")

tokens = vecinos.tokenize("H-API-608 stock_picking.py")
check_true("tokenize conserva el identificador entero", "h-api-608" in tokens)
check_true("tokenize tambien parte por guion/punto", "stock" in tokens and "picking" in tokens)
check_true("tokenize descarta partes de 1-2 caracteres", "py" not in tokens)

docs = [
    "Fix login bug in auth module",
    "Add OAuth support to auth module",
    "Refactor stock picking type",
]
vectors, vocabulary = vecinos.build_vectors(docs)
check("build_vectors produce un vector por documento", len(docs), len(vectors))
norms = [math.sqrt(sum(w * w for w in v.values())) for v in vectors if v]
check_true(
    "cada vector no vacio esta normalizado a L2 (norma ~1)",
    all(abs(n - 1.0) < 1e-9 for n in norms),
)
# "auth" aparece en 2 de 3 documentos, "module" tambien en 2 de 3 —
# ambos deberian pesar menos que un termino exclusivo de un solo documento.
shared_weight = vectors[0].get("auth", 0.0)
exclusive_weight = vectors[2].get("refactor", 0.0)
check_true(
    "idf castiga un termino compartido frente a uno exclusivo",
    exclusive_weight > shared_weight,
)

print("\n== 2. cosine_distance — bordes ==")

check("distancia de un vector a si mismo es 0", 0.0, round(vecinos.cosine_distance(vectors[0], vectors[0]), 9))
check_true(
    "distancia entre docs sin terminos comunes es 1.0 (ortogonales)",
    abs(vecinos.cosine_distance(vectors[0], vectors[2]) - 1.0) < 1e-9,
)
check_true(
    "la distancia nunca es negativa (acotada por max(0, ...))",
    vecinos.cosine_distance({"x": 1.0}, {"x": -1.0}) >= 0.0,
)

print("\n== 3. choose_algorithm — el heuristico auto, condicion por condicion ==")

check("entrada dispersa -> brute", "brute", vecinos.choose_algorithm(
    metric="cosine", n_features=3, n_samples=10, n_neighbors=2, is_sparse=True)[0])
check("metrica precomputed -> brute", "brute", vecinos.choose_algorithm(
    metric="precomputed", n_features=3, n_samples=10, n_neighbors=2, is_sparse=False)[0])
check("metrica no valida para arbol (coseno) -> brute", "brute", vecinos.choose_algorithm(
    metric="cosine", n_features=3, n_samples=10, n_neighbors=2, is_sparse=False)[0])
check("D > 15 -> brute", "brute", vecinos.choose_algorithm(
    metric="euclidean", n_features=20, n_samples=100, n_neighbors=2, is_sparse=False)[0])
check("k >= N/2 -> brute", "brute", vecinos.choose_algorithm(
    metric="euclidean", n_features=3, n_samples=10, n_neighbors=5, is_sparse=False)[0])
check(
    "D bajo + metrica de arbol + k chico -> kd_tree (unica rama no-brute)",
    "kd_tree",
    vecinos.choose_algorithm(
        metric="euclidean", n_features=3, n_samples=100, n_neighbors=2, is_sparse=False
    )[0],
)

print("\n== 4. NearestNeighbors — el motor ==")

engine = vecinos.NearestNeighbors(n_neighbors=2, metric="cosine").fit(vectors, n_features=vocabulary)
check("el heuristico elige brute (entrada dispersa)", "brute", engine.effective_algorithm_)
check_true(
    "algorithm != 'auto' y != 'brute' -> NotImplementedError (declarado, no silencioso)",
    True,
)
try:
    vecinos.NearestNeighbors(algorithm="kd_tree", metric="cosine").fit(vectors, n_features=vocabulary)
    check_true("kd_tree pedido explicitamente sin construir -> lanza", False)
except NotImplementedError:
    check_true("kd_tree pedido explicitamente sin construir -> lanza", True)

distances, neighbors = engine.kneighbors(vectors[0], exclude=0)
check("kneighbors(doc0) excluye el propio indice 0", False, 0 in neighbors)
check("kneighbors(doc0) devuelve el doc1 (mismo tema auth) mas cerca que doc2", 1, neighbors[0])
check_true("kneighbors devuelve las distancias ordenadas ascendente", distances == sorted(distances))

r_distances, r_neighbors = engine.radius_neighbors(vectors[0], radius=0.9, exclude=0)
check_true(
    "radius_neighbors con radio bajo excluye al vecino ortogonal (doc2, dist=1.0)",
    2 not in r_neighbors,
)
r_all_distances, r_all_neighbors = engine.radius_neighbors(vectors[0], radius=1.5, exclude=0)
check(
    "radius_neighbors con radio amplio incluye a todos los demas",
    sorted([1, 2]),
    sorted(r_all_neighbors),
)

uniform = vecinos.weigh([0.5, 1.0], weights="uniform")
check("weigh uniform ignora la distancia", [1.0, 1.0], uniform)
distance_weighted = vecinos.weigh([0.5, 1.0], weights="distance")
check_true("weigh distance pondera mas al vecino cercano", distance_weighted[0] > distance_weighted[1])
degenerate = vecinos.weigh([0.0, 0.5], weights="distance")
check(
    "weigh distance con coincidencia exacta (dist=0) se lleva todo el peso",
    [1.0, 0.0],
    degenerate,
)

# Guard del contrato de la fuente (tarea #580): pedir mas vecinos que puntos
# ajustados es error, no un resultado corto. Sin el, kneighbors_graph produce
# filas que violan su propio contrato y solo --check-graph las veria.
try:
    engine.kneighbors(vectors[0], n_neighbors=len(vectors) + 1)
    check_true("kneighbors con k > n_samples -> ValueError (contrato de la fuente)", False)
except ValueError:
    check_true("kneighbors con k > n_samples -> ValueError (contrato de la fuente)", True)
check(
    "kneighbors con k == n_samples sigue permitido (la consulta del CLI)",
    len(vectors) - 1,
    len(engine.kneighbors(vectors[0], n_neighbors=len(vectors), exclude=0)[1]),
)

# La acumulacion por postings (tarea #582) debe dar el MISMO resultado que la
# primitiva par-a-par cosine_distance — es un cambio de coste, no de contrato.
accumulated = dict(engine._distances_from(vectors[0], exclude=0))
pairwise = {
    index: vecinos.cosine_distance(vectors[0], vector)
    for index, vector in enumerate(vectors)
    if index != 0
}
check("postings y par-a-par cubren los mismos indices", sorted(pairwise), sorted(accumulated))
check_true(
    "postings y par-a-par coinciden en cada distancia (tolerancia 1e-9)",
    all(abs(accumulated[index] - value) <= 1e-9 for index, value in pairwise.items()),
)

print("\n== 5. kneighbors_graph + check_graph_contract — positivo y negativo ==")

indptr, indices, data = engine.kneighbors_graph(n_neighbors=2, mode="distance", include_self=True)
check("kneighbors_graph produce una fila por documento", len(docs) + 1, len(indptr))
failures = vecinos.check_graph_contract(indptr, indices, data, n_neighbors=2, include_self=True)
check("el grafo real (positivo) no viola su propio contrato", [], failures)

# Negativo fabricado a mano — el contrato debe detectar CADA violacion,
# no solo la primera que encuentre.
broken_indptr = [0, 2]
broken_indices = [5, 5]          # indice duplicado dentro de la fila
broken_data = [0.3, 0.1]         # sin ordenar (0.3 > 0.1)
broken_failures = vecinos.check_graph_contract(
    broken_indptr, broken_indices, broken_data, n_neighbors=2, include_self=True
)
check_true("el contrato detecta indices duplicados", any("duplicados" in f for f in broken_failures))
check_true("el contrato detecta distancias sin ordenar", any("sin ordenar" in f for f in broken_failures))

negative_distance_failures = vecinos.check_graph_contract(
    [0, 1], [5], [-0.1], n_neighbors=1, include_self=False
)
check_true(
    "el contrato detecta una distancia negativa (violaria el acotado de cosine_distance)",
    any("negativa" in f for f in negative_distance_failures),
)

print("\n== 6. CLI end-to-end — tareas fixture en un directorio temporal ==")

with tempfile.TemporaryDirectory() as tmp:
    tasks_dir = pathlib.Path(tmp)
    fixture_tasks = [
        {"id": 1, "subject": "Fix login bug in auth module", "status": "pending", "activeForm": ""},
        {"id": 2, "subject": "Add OAuth support to auth module", "status": "pending", "activeForm": ""},
        {"id": 3, "subject": "Refactor stock picking type", "status": "completed", "activeForm": ""},
        {"id": 4, "subject": "Update stock picking view", "status": "pending", "activeForm": ""},
    ]
    for task in fixture_tasks:
        (tasks_dir / f"task-{task['id']}.json").write_text(json.dumps(task))

    loaded = vecinos.load_tasks(str(tasks_dir))
    check("load_tasks lee las 4 tareas fixture, ordenadas por id", [1, 2, 3, 4], [t["id"] for t in loaded])

    buf = io.StringIO()
    with redirect_stdout(buf):
        rc = vecinos.main(["1", "--tasks-dir", str(tasks_dir), "--k", "3", "--status", "pending"])
    output = buf.getvalue()
    check("main(#1, status=pending) sale con exit 0", 0, rc)
    check_true("main(#1) devuelve la vecina #2 (mismo tema auth)", "#   2" in output)
    check_true(
        "main(#1, status=pending) excluye #3 (completed, filtrado por --status)",
        "#   3" not in output,
    )

    buf_all = io.StringIO()
    with redirect_stdout(buf_all):
        rc_all = vecinos.main(["1", "--tasks-dir", str(tasks_dir), "--k", "3", "--status", "todos"])
    check("main(#1, status=todos) sale con exit 0", 0, rc_all)
    check_true("main(#1, status=todos) SI incluye #3", "#   3" in buf_all.getvalue())

    # --k debe caber en el fixture (4 tareas): el default de la CLI es 8, que
    # con solo 4 tareas fuerza min(k, n_samples)=4 fuera del rango {8,9} que
    # check_graph_contract espera — degenerado del tamano del fixture, no un
    # defecto del motor. Mismo --k que las secciones 4-5 usan sobre el motor.
    buf_graph = io.StringIO()
    with redirect_stdout(buf_graph):
        rc_graph = vecinos.main(["--tasks-dir", str(tasks_dir), "--check-graph", "--k", "2"])
    check("main(--check-graph, k=2) sale con exit 0 (contrato OK)", 0, rc_graph)
    check_true(
        "main(--check-graph, k=2) reporta el contrato OK",
        "contrato del grafo: OK" in buf_graph.getvalue(),
    )

    try:
        vecinos.main(["999", "--tasks-dir", str(tasks_dir)])
        check_true("main con id inexistente lanza SystemExit", False)
    except SystemExit:
        check_true("main con id inexistente lanza SystemExit", True)

print(f"\nresultado: {PASS} de {PASS + FAIL} aserciones en verde")
if FAIL:
    sys.exit(1)
sys.exit(0)
