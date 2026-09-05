#!/usr/bin/env python3
"""K vecinos más cercanos sobre el tablero de tareas de implementación.

Adaptación de ``sklearn.neighbors`` (**BSD License**, scikit-learn developers
2007-2020). Se adapta, no se instala: la referencia Odoo no declara ninguna
dependencia científica en su ``requirements.txt``, y la premisa del proyecto es
nativa (DEC-KX-03).

Qué resuelve
------------

El tablero pasa de doscientas tareas pendientes. El costo dominante del bucle
no es escribir el código: es el cambio de contexto entre tareas que no
comparten archivo, addon ni familia de hallazgos. Dada una tarea, este guion
devuelve sus vecinas — las que ya tienen ese contexto pagado.

Por qué fuerza bruta
--------------------

No es la versión simplificada: es la que el heurístico de la propia fuente
elige. El dato dispara tres de sus cinco condiciones a la vez — entrada
dispersa, ``D > 15``, y una métrica (coseno) que no está entre las válidas del
árbol K-D ni del árbol de bolas. ``choose_algorithm()`` lo implementa entero;
la rama de árbol declara su divergencia en vez de callarla.

Alcance declarado (``porte-completo-no-parcial.md``)
-----------------------------------------------------

ENTRA: la familia no supervisada — ``NearestNeighbors`` con ``kneighbors``,
``radius_neighbors`` y ``kneighbors_graph`` (con su contrato de grafo disperso),
el heurístico ``algorithm='auto'`` y la ponderación ``uniform``/``distance``.

NO ENTRA, con razón: los árboles K-D y de bolas (el heurístico no los elegiría
para esta métrica); los clasificadores y regresores (no hay etiqueta que
predecir sobre una tarea); ``NearestCentroid``; y el análisis de componentes de
vecindario, que aprende la métrica desde etiquetas que aquí no existen y cuesta
memoria del orden de ``n_samples**2``.

Este guion es MECANISMO, no registro: no lleva la cuenta de qué tareas existen
— las lee de su fuente en cada corrida (``calibration-verified-numbers.md``).
"""
import argparse
import math
import os
import pathlib
import re
import sys
from collections import Counter

# El lector único vive junto a este guion; se resuelve por __file__ y no por
# CWD, porque los tests cargan estos módulos por ruta con importlib.
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
import task_source  # noqa: E402

#: Métricas admitidas por cada algoritmo — ≙ ``VALID_METRICS`` de la fuente.
#: El coseno SÓLO existe en fuerza bruta: es la condición que decide este caso.
VALID_METRICS = {
    'brute': ('cosine', 'euclidean', 'manhattan'),
    'kd_tree': ('euclidean', 'manhattan'),
    'ball_tree': ('euclidean', 'manhattan'),
}

#: Tamaño de hoja de los árboles — ≙ ``leaf_size`` de la fuente (por defecto 30).
#: Gobierna tres cosas a la vez: costo de construcción, de consulta y memoria.
#: Se declara porque es parte del contrato; hoy ninguna rama construida lo lee.
DEFAULT_LEAF_SIZE = 30

#: Umbral de dimensión del heurístico ``algorithm='auto'`` — ≙ ``D > 15``.
AUTO_DIMENSION_THRESHOLD = 15

_TOKEN = re.compile(r'[a-z0-9][a-z0-9_.\-]*')
_SPLIT = re.compile(r'[_.\-]+')


# === el motor, fiel a la fuente ==============================================


def choose_algorithm(metric, n_features, n_samples, n_neighbors, is_sparse):
    """Elige el algoritmo — ≙ el heurístico de ``algorithm='auto'``.

    La fuente elige fuerza bruta si la entrada es dispersa, si la métrica es
    ``'precomputed'``, si ``D > 15``, si ``k >= N/2``, o si la métrica efectiva
    no está entre las válidas del árbol. Devuelve el nombre y el motivo, porque
    un heurístico que no dice por qué eligió no es auditable.
    """
    if is_sparse:
        return 'brute', 'entrada dispersa'
    if metric == 'precomputed':
        return 'brute', "métrica 'precomputed'"
    if metric not in VALID_METRICS['kd_tree']:
        return 'brute', f'la métrica {metric!r} no es válida para árbol'
    if n_features > AUTO_DIMENSION_THRESHOLD:
        return 'brute', f'D={n_features} > {AUTO_DIMENSION_THRESHOLD}'
    if n_samples and n_neighbors >= n_samples / 2:
        return 'brute', f'k={n_neighbors} >= N/2={n_samples / 2:g}'
    return 'kd_tree', f'D={n_features} bajo y métrica de árbol'


def cosine_distance(left, right):
    """Distancia coseno entre dos vectores dispersos ya normalizados a L2.

    Con norma unitaria el producto punto **es** la similitud, así que la
    distancia es ``1 - similitud``. Se itera el vector más corto: el costo es
    del orden de sus términos no nulos, no de la dimensión del vocabulario.
    """
    if len(right) < len(left):
        left, right = right, left
    similarity = sum(weight * right.get(term, 0.0) for term, weight in left.items())
    # El redondeo de punto flotante puede sacar la similitud del rango [-1, 1];
    # la distancia se acota para que nunca salga negativa (contrato del grafo).
    return max(0.0, 1.0 - similarity)


class NearestNeighbors:
    """Búsqueda no supervisada de vecinos — ≙ ``sklearn.neighbors.NearestNeighbors``.

    Trabaja sobre vectores dispersos representados como ``dict`` de término a
    peso, normalizados a norma unitaria. No usa ``numpy``: con la fuerza bruta
    que el heurístico elige, el costo es ``O[D N^2]`` sobre decenas de términos
    por punto.
    """

    def __init__(self, n_neighbors=5, radius=1.0, algorithm='auto',
                 leaf_size=DEFAULT_LEAF_SIZE, metric='cosine'):
        if metric not in VALID_METRICS['brute']:
            raise ValueError(f'métrica no soportada: {metric!r}')
        self.n_neighbors = n_neighbors
        self.radius = radius
        self.algorithm = algorithm
        self.leaf_size = leaf_size
        self.metric = metric
        self.effective_algorithm_ = None
        self.algorithm_reason_ = None
        self._fit_vectors = []
        self._postings = {}
        self._n_features = 0

    def fit(self, vectors, n_features=None):
        """Guarda los puntos, construye los postings y resuelve el algoritmo.

        Los postings —término → lista de ``(índice, peso)``— se construyen una
        vez aquí y los consume la acumulación de ``_distances_from``. Es la
        forma dispersa de lo que la fuente hace vectorizado: su fuerza bruta
        multiplica la matriz entera de una vez, no punto contra punto.
        """
        self._fit_vectors = list(vectors)
        self._postings = {}
        for index, vector in enumerate(self._fit_vectors):
            for term, weight in vector.items():
                self._postings.setdefault(term, []).append((index, weight))
        self._n_features = n_features or len(self._postings)
        self.effective_algorithm_, self.algorithm_reason_ = choose_algorithm(
            metric=self.metric,
            n_features=self._n_features,
            n_samples=len(self._fit_vectors),
            n_neighbors=self.n_neighbors,
            is_sparse=True,
        )
        if self.algorithm != 'auto':
            if self.algorithm != 'brute':
                raise NotImplementedError(
                    f'{self.algorithm!r} no está construido en este pase — ver '
                    'el alcance declarado en la cabecera. El heurístico no lo '
                    'elegiría para esta métrica ni esta dimensión.')
            self.effective_algorithm_ = self.algorithm
            self.algorithm_reason_ = 'forzado por el llamador'
        if self.effective_algorithm_ != 'brute':
            raise NotImplementedError(
                f'el heurístico eligió {self.effective_algorithm_!r} '
                f'({self.algorithm_reason_}) y esa rama no está construida')
        return self

    def _distances_from(self, query, exclude):
        """Todas las distancias del punto de consulta, acumuladas por postings.

        Se itera cada término de la consulta y se suma sobre su lista de
        postings, así que el costo por consulta es el número real de
        coincidencias término-documento — no ``N × D`` como el par-a-par de
        ``cosine_distance``, que paga cada término del vector más corto aunque
        no coincida. La medición que lo decidió (tarea #582, mismo ranking en
        toda la serie) está en :ref:`bc-cs106x-vectores-y-big-o`;
        ``cosine_distance`` se conserva como la primitiva par-a-par del
        contrato portado.
        """
        scores = [0.0] * len(self._fit_vectors)
        for term, weight in query.items():
            for index, other_weight in self._postings.get(term, ()):
                scores[index] += weight * other_weight
        # El mismo acotamiento que cosine_distance: el redondeo flotante puede
        # sacar la similitud de [-1, 1] y la distancia nunca sale negativa.
        return [(index, max(0.0, 1.0 - score))
                for index, score in enumerate(scores) if index != exclude]

    def kneighbors(self, query, n_neighbors=None, exclude=None,
                   return_distance=True):
        """Los *k* vecinos más cercanos, del más cercano al más lejano.

        ``exclude`` retira un índice del resultado: es cómo se pide "los
        vecinos de la tarea N" sin que la propia tarea N gane su consulta.

        Pedir más vecinos que puntos ajustados es error, no un resultado corto
        — ≙ el ``Expected n_neighbors <= n_samples`` de la fuente. Sin este
        guard, ``kneighbors_graph`` produce filas cortas que violan su
        contrato y sólo ``--check-graph`` las vería (tarea #580).
        """
        k = n_neighbors if n_neighbors is not None else self.n_neighbors
        n_samples = len(self._fit_vectors)
        if k > n_samples:
            raise ValueError(
                f'Expected n_neighbors <= n_samples, but n_neighbors = {k}, '
                f'n_samples = {n_samples} (contrato de la fuente)')
        ranked = sorted(self._distances_from(query, exclude),
                        key=lambda pair: (pair[1], pair[0]))[:k]
        if return_distance:
            return [distance for _, distance in ranked], [i for i, _ in ranked]
        return [index for index, _ in ranked]

    def radius_neighbors(self, query, radius=None, exclude=None,
                         return_distance=True):
        """Los vecinos dentro de un radio — vecindario de tamaño variable.

        La fuente lo prefiere cuando el muestreo no es uniforme: donde el
        tablero tiene una familia densa devuelve muchos, y donde una tarea está
        sola devuelve pocos o ninguno. ``kneighbors`` siempre devuelve *k*,
        aunque el k-ésimo esté lejísimos.
        """
        r = radius if radius is not None else self.radius
        within = [(index, distance)
                  for index, distance in self._distances_from(query, exclude)
                  if distance <= r]
        within.sort(key=lambda pair: (pair[1], pair[0]))
        if return_distance:
            return [distance for _, distance in within], [i for i, _ in within]
        return [index for index, _ in within]

    def kneighbors_graph(self, n_neighbors=None, mode='connectivity',
                         include_self=True):
        """Grafo disperso de vecindad — ≙ ``KNeighborsTransformer``.

        Devuelve ``(indptr, indices, data)``, la forma CSR. El contrato que la
        fuente exige y que ``check_graph_contract`` verifica: distancias no
        negativas **ordenadas** por fila, sin índices duplicados, y *k* o *k+1*
        vecinos por fila (``k+1`` cuando la fila se incluye a sí misma).
        """
        if mode not in ('connectivity', 'distance'):
            raise ValueError(f'modo no soportado: {mode!r}')
        k = n_neighbors if n_neighbors is not None else self.n_neighbors
        indptr, indices, data = [0], [], []
        for row, vector in enumerate(self._fit_vectors):
            exclude = None if include_self else row
            distances, neighbors = self.kneighbors(
                vector, n_neighbors=k, exclude=exclude)
            indices.extend(neighbors)
            data.extend([1.0] * len(neighbors) if mode == 'connectivity'
                        else distances)
            indptr.append(len(indices))
        return indptr, indices, data


def check_graph_contract(indptr, indices, data, n_neighbors, include_self):
    """Verifica el contrato del grafo disperso; devuelve la lista de fallas.

    Existe porque la fuente lo declara como contrato explícito del
    transformador, no como recomendación: un consumidor que reciba distancias
    sin ordenar, o un índice repetido, produce vecindarios silenciosamente
    equivocados.
    """
    failures = []
    expected = {n_neighbors, n_neighbors + 1} if include_self else {n_neighbors}
    for row in range(len(indptr) - 1):
        start, end = indptr[row], indptr[row + 1]
        row_indices, row_data = indices[start:end], data[start:end]
        if len(row_indices) not in expected and len(row_indices) > 0:
            failures.append(
                f'fila {row}: {len(row_indices)} vecinos, se esperaban '
                f'{sorted(expected)}')
        if len(set(row_indices)) != len(row_indices):
            failures.append(f'fila {row}: índices duplicados')
        if any(value < 0 for value in row_data):
            failures.append(f'fila {row}: distancia negativa')
        if row_data != sorted(row_data):
            failures.append(f'fila {row}: distancias sin ordenar')
    return failures


def weigh(distances, weights='uniform'):
    """Pesos de los vecinos — ≙ el parámetro ``weights`` de la fuente.

    ``'uniform'``: todos valen igual. ``'distance'``: el inverso de la
    distancia, así que un vecino pegado pesa más que uno en el borde. La fuente
    fija el caso degenerado — distancia cero significa coincidencia exacta y se
    lleva todo el peso.
    """
    if weights == 'uniform':
        return [1.0] * len(distances)
    if weights != 'distance':
        raise ValueError(f'ponderación no soportada: {weights!r}')
    if any(distance == 0 for distance in distances):
        return [1.0 if distance == 0 else 0.0 for distance in distances]
    return [1.0 / distance for distance in distances]


# === el adaptador: una tarea es un punto =====================================


def tokenize(text):
    """Tokens de una tarea, con sus partes.

    Un identificador como ``H-API-608`` o ``stock_picking.py`` entra entero
    —es el token raro que más señal lleva— y además se parte, para que
    ``stock`` acerque a las demás tareas del addon. Filtrar por longitud
    descarta el ruido de una sola letra; las palabras vacías del español no se
    listan a mano: el ``idf`` las anula solo, porque aparecen en casi todas.
    """
    tokens = []
    for match in _TOKEN.findall(text.lower()):
        if len(match) > 1:
            tokens.append(match)
        tokens.extend(part for part in _SPLIT.split(match) if len(part) > 2)
    return tokens


def build_vectors(documents):
    """Vectores ``tf-idf`` normalizados a L2, uno por documento.

    Sin ``idf`` el vecindario lo dominarían los verbos del tablero —"portar",
    "gate", "barrer"— que están en decenas de tareas y no distinguen nada. El
    peso alto se lo llevan los identificadores raros, que es exactamente la
    señal de "estas dos tareas tocan lo mismo".
    """
    tokenized = [tokenize(document) for document in documents]
    total = len(tokenized) or 1
    frequency = Counter(term for tokens in tokenized for term in set(tokens))
    vectors = []
    for tokens in tokenized:
        counts = Counter(tokens)
        vector = {}
        for term, count in counts.items():
            idf = math.log(total / frequency[term]) + 1.0
            vector[term] = (1.0 + math.log(count)) * idf
        norm = math.sqrt(sum(weight * weight for weight in vector.values()))
        vectors.append({term: weight / norm for term, weight in vector.items()}
                       if norm else {})
    return vectors, len(frequency)


def load_tasks(source):
    """Las tareas del sustrato elegido, ordenadas por id numérico.

    La lectura vive en ``task_source`` (tarea #579): el sustrato —directorio,
    ``-`` para stdin, o un iterable en memoria— lo decide el llamador; aquí
    queda sólo el orden que este guion necesita. Un directorio ausente sigue
    siendo error de invocación para el KNN, no universo vacío.
    """
    try:
        tasks = task_source.load_records(source)
    except FileNotFoundError as error:
        raise SystemExit(str(error))
    tasks.sort(key=lambda task: int(task['id']))
    return tasks


def task_document(task):
    """El texto de una tarea: lo que lleva la señal de vecindad."""
    return ' '.join(str(task.get(field, ''))
                    for field in ('subject', 'description', 'activeForm'))


def default_tasks_dir():
    """El directorio de tareas de la sesión activa, si se puede derivar.

    Es efímero al contenedor — la misma condición que ``snapshot-tasks.sh``
    declara en su cabecera. Se puede fijar con ``--tasks-dir`` o con la
    variable ``KAUPAMEX_TASKS_DIR``.
    """
    override = os.environ.get('KAUPAMEX_TASKS_DIR')
    if override:
        return override
    root = pathlib.Path.home() / '.claude' / 'tasks'
    if not root.is_dir():
        return str(root)
    sessions = sorted(root.iterdir(), key=lambda path: path.stat().st_mtime)
    return str(sessions[-1]) if sessions else str(root)


# === interfaz ================================================================


def format_row(task, distance, weight, citations=None):
    """Una vecina, con su ordinal y —cuando el store la tiene— su cita durable.

    El ordinal se reinicia y se reusa por sesion: citarlo desde esta salida no
    resuelve manana (ERR-024, H-DOCS-1067). La cita se ancla al sujeto, asi que
    sobrevive al reinicio del board; sin store, sin columna o con el sujeto sin
    casar, la fila publica el ordinal a secas.
    """
    estado = task.get('status', '?')
    cita = (citations or {}).get(str(task['id']))
    # El ordinal conserva su alineacion a cuatro: sin cita la fila sale byte a
    # byte como antes, que es lo que el contrato de compatibilidad exige — un
    # consumidor sin store no debe ver moverse su salida.
    identidad = f'#{task["id"]:>4}' + (f' ({cita})' if cita else '')
    return (f'  {distance:.4f}  peso {weight:6.2f}  '
            f'{identidad} [{estado}] {task.get("subject", "")}')


def main(argv=None):
    parser = argparse.ArgumentParser(
        description='K vecinos más cercanos sobre el tablero de tareas.')
    parser.add_argument('task_id', nargs='?',
                        help='id de la tarea de referencia')
    parser.add_argument('--k', type=int, default=8,
                        help='cuántos vecinos devolver (por defecto 8)')
    parser.add_argument('--radius', type=float,
                        help='vecindario por radio en vez de por k')
    parser.add_argument('--status', default='pending',
                        help="filtrar candidatos por estado ('todos' para no filtrar)")
    parser.add_argument('--weights', default='distance',
                        choices=('uniform', 'distance'))
    parser.add_argument('--tasks-dir', default=None,
                        help="directorio de fichas, o '-' para leer de stdin")
    parser.add_argument('--check-graph', action='store_true',
                        help='verifica el contrato del grafo disperso y sale')
    args = parser.parse_args(argv)

    tasks_dir = args.tasks_dir or default_tasks_dir()
    tasks = load_tasks(tasks_dir)
    if not tasks:
        raise SystemExit(f'sin tareas legibles en {tasks_dir}')

    vectors, vocabulary = build_vectors([task_document(task) for task in tasks])
    engine = NearestNeighbors(n_neighbors=args.k, metric='cosine').fit(
        vectors, n_features=vocabulary)

    print(f'vecinos-de-tarea: {len(tasks)} tareas · vocabulario {vocabulary} '
          f'términos · algoritmo {engine.effective_algorithm_} '
          f'({engine.algorithm_reason_})')

    if args.check_graph:
        try:
            indptr, indices, data = engine.kneighbors_graph(
                n_neighbors=args.k, mode='distance', include_self=True)
        except ValueError as error:
            raise SystemExit(f'vecinos-de-tarea: {error}')
        failures = check_graph_contract(indptr, indices, data, args.k, True)
        print(f'  grafo: {len(indptr) - 1} filas, {len(indices)} aristas')
        for failure in failures:
            print(f'  FALLA {failure}')
        print('  contrato del grafo: OK' if not failures
              else f'  contrato del grafo: {len(failures)} fallas')
        return 0 if not failures else 1

    if not args.task_id:
        parser.error('falta el id de la tarea (o usar --check-graph)')

    by_id = {str(task['id']): index for index, task in enumerate(tasks)}
    if args.task_id not in by_id:
        raise SystemExit(f'la tarea #{args.task_id} no está en {tasks_dir}')
    anchor = by_id[args.task_id]

    if args.radius is not None:
        distances, neighbors = engine.radius_neighbors(
            vectors[anchor], radius=args.radius, exclude=anchor)
        criterio = f'radio <= {args.radius}'
    else:
        # Se piden más de los necesarios porque el filtro por estado se aplica
        # después: pedir k y filtrar devolvería menos de k.
        distances, neighbors = engine.kneighbors(
            vectors[anchor], n_neighbors=len(tasks), exclude=anchor)
        criterio = f'k = {args.k}'

    wanted = None if args.status == 'todos' else args.status
    selected = [(index, distance)
                for index, distance in zip(neighbors, distances)
                if wanted is None or tasks[index].get('status') == wanted]
    if args.radius is None:
        selected = selected[:args.k]

    weights = weigh([distance for _, distance in selected], args.weights)
    citations = task_source.citation_index(tasks)
    cita_ancla = citations.get(str(tasks[anchor]['id']))
    print(f'\nAncla  #{tasks[anchor]["id"]}'
          + (f' ({cita_ancla})' if cita_ancla else '')
          + f' [{tasks[anchor].get("status", "?")}] '
          f'{tasks[anchor].get("subject", "")}')
    print(f'Vecinas ({criterio} · estado {args.status} · '
          f'ponderación {args.weights}):')
    if not selected:
        print('  (ninguna)')
    for (index, distance), weight in zip(selected, weights):
        print(format_row(tasks[index], distance, weight, citations))
    return 0


if __name__ == '__main__':
    sys.exit(main())
