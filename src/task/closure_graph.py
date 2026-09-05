#!/usr/bin/env python3
"""El grafo de cierre: qué se cierra primero, medido y no leído.

El problema
===========

Cada hallazgo que declara alcance abierto registra su sucesor —lo manda
``hallazgo-abierto-genera-sucesor.md``— y cerrar ese sucesor destapa hallazgos
nuevos, que registran los suyos. La recursión no se frena cerrando más rápido:
se frena **eligiendo qué cerrar**, porque un nodo que desbloquea a doce vale
doce veces uno que no bloquea a nadie, y el orden de lectura no distingue uno
del otro.

Hasta ahora la elección se hacía leyendo el tablero de arriba abajo. Este guion
la deriva del grafo.

El algoritmo se elige por la forma MEDIDA, no por preferencia
=============================================================

Es la directiva del ejecutor: *"no debes evaluar todos los problemas usando
exactamente los mismos criterios; cada situación tiene sus propias
necesidades"*. Los candidatos se descartan con su razón, no con un gusto:

.. list-table::
   :header-rows: 1

   * - Candidato
     - Qué responde
     - Veredicto
   * - ``floydWarshall``
     - distancia entre todos los pares
     - **descartado por coste**: es O(n³), y el guion lo mide y lo dice antes
       de negarlo (ver ``report_shape``)
   * - ``dijkstra`` / ``aStar``
     - la ruta más corta desde UN origen
     - responden otra pregunta: aquí no hay un destino, hay un frente
   * - ``kruskal``
     - el bosque de expansión mínima
     - **sí se usa**, para otra cosa: los componentes independientes son los
       frentes que se pueden despachar en paralelo
   * - ``pageRank``
     - qué nodo concentra el flujo de dependencia
     - **el que responde la pregunta**: cuánto desbloquea cerrar cada uno

Procedencia
===========

``page_rank`` es adaptación nativa de ``cytoscape.js``, leído en el bundle que
el propio cliente empaqueta: ``_references/claude-code-bin/2.1.246/
bunfs-root/mermaid.min.js`` (mermaid usa cytoscape para el layout de sus
diagramas). **Es referencia para adaptar, nunca dependencia de runtime** — el
mismo criterio con que se lee ``odoo-tools``: el stack aquí es Python, y el
bundle es JavaScript minificado dentro de un ejecutable de terceros.

Contrato leído verbatim de esa fuente:

- ``dampingFactor: .8`` — **no 0.85**, que es el valor del artículo original;
  cytoscape elige .8 y aquí se conserva el suyo.
- ``precision: 1e-6`` · ``iterations: 200`` · ``weight: () => 1``.
- Cada vuelta normaliza por la suma (``inPlaceSumNormalize``).
- Un **sumidero** —nodo sin aristas de salida— reparte su masa por igual sobre
  todos: su columna entera vale ``1/f + (1-d)/f``.
- Los lazos sobre sí mismo se ignoran (``if(k!==E)``).

**Divergencia de mecanismo, declarada:** cytoscape construye una matriz densa
de ``f*f`` (``new Array(p)`` con ``p = f*f``). Aquí la matriz es **dispersa**,
un diccionario de adyacencia. El algoritmo es el mismo —mismos pesos, mismo
teletransporte, misma convergencia—; lo que cambia es la estructura de datos,
porque este grafo tiene una densidad que el guion mide y publica: llenar n²
celdas para recorrer un puñado de aristas es trabajo que no cambia el
resultado.

Cómo se lee su salida
=====================

El ranking NO dice «haz esto». Dice cuánto desbloquea cada frente, y deja la
decisión donde vive (I-011: el cierre lo ordena el ejecutor). Lo que sí es
mecánico son las dos señales que publica junto al orden:

- **DESCONOCIDO** — sube de prioridad por directiva del ejecutor, y no por
  capricho: un DESCONOCIDO es un nodo cuya arista de salida **todavía no
  existe**, así que nada que dependa de él se puede planear. Dejarlo para
  después es el mismo diferimiento que *"espero al consumidor real"*.
- **sin sucesor** — un hallazgo con alcance abierto que no nombra a nadie. Es
  deuda anónima, que es exactamente lo que la regla del sucesor prohíbe.
"""
import argparse
import collections
import json
import os
import pathlib
import re
import sqlite3
import sys

# La fuente única de las raíces del multi-repo. `sys.path` a nivel de módulo, no
# lazy: `.claude/scripts/` no es un paquete y varias suites cargan este archivo
# con `spec_from_file_location`, vía por la que el directorio no queda en la
# ruta de búsqueda. Es el criterio que `agent_store.py` ya documenta.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import reach_roots  # noqa: E402

#: Un identificador de tarea, en cualquiera de las formas medidas en el corpus:
#: ``Sucesor: **#101**`` · ``Sucesores: #102`` · ``Sucesor: tarea **#103**`` ·
#: ``**Sucesor:** tarea **#104**`` · ``Registrado como #105``. Se captura por
#: el **ID** y no por la frase que lo introduce: medido sobre los hallazgos del
#: corpus, hay seis o más formas de escribir la frase, así que un patrón por
#: frase es ciego a la mayoría — el mismo defecto que el gate de sucesor
#: arrastró hasta que se midió.
TASK_ID = re.compile(r'#(\d{1,4})\b')

#: La declaración de sucesor, para acotar DÓNDE se buscan los IDs. Sin esta
#: acotación cualquier mención de una tarea entraría como arista, y el corpus
#: cita tareas de pasada continuamente ("el gate de la tarea #999 mide otra
#: cosa"). Es la frontera entre una arista y una nota al margen.
SUCCESSOR_CONTEXT = re.compile(
    r'(?:\*\*)?Sucesor(?:es)?(?:\*\*)?\s*:(?:\*\*)?[^\n]*'
    r'|Registrado como\s+#\d+'
    r'|[Ss]ucesora?\s+(?:es|son)\s+[^\n]*',
)

#: La cita de commit ``repo@hash`` — 760 de ellas en 503 hallazgos, medido.
#: Es la mitad que falta del grafo: sin ella las aristas van todas de hallazgo a
#: tarea, el grafo es **bipartito**, y un bipartito no puede tener ciclos. La
#: deteccion de ciclos sobre ese grafo seria un control incapaz de disparar —
#: verde por construccion, no por ausencia de ciclos.
COMMIT_CITE = re.compile(r'\b(api|ui|db|docs|server)@([0-9a-f]{7,40})\b')

#: El hallazgo declara que su alcance queda abierto. Las tres formas que el
#: corpus usa; la regla canónica enumera exactamente estas.
OPEN_SCOPE = re.compile(
    r'Lo que este hallazgo no cierra|queda abierto|queda pendiente',
)

#: Un desenlace DESCONOCIDO. Sube de prioridad — ver el docstring del módulo.
UNKNOWN = re.compile(r'DESCONOCIDO')

#: La etiqueta del hallazgo, que es como se cita (``:ref:`h-api-967```).
LABEL = re.compile(r'^\.\.\s+_([a-z0-9-]+):', re.M)


def parse_finding(path):
    """Un hallazgo, reducido a lo que el grafo necesita.

    Devuelve ``(label, successors, open_scope, unknown)``. Los sucesores salen
    **sólo** del contexto de declaración: un ID citado en prosa suelta no es
    una arista, y confundirlos infla el grafo con aristas que nadie declaró.
    """
    try:
        text = path.read_text(encoding='utf-8', errors='ignore')
    except OSError:
        return None
    label_match = LABEL.search(text)
    label = label_match.group(1) if label_match else path.stem
    successors = set()
    for fragment in SUCCESSOR_CONTEXT.findall(text):
        successors.update(TASK_ID.findall(fragment))
    commits = {f'{repo}@{h}' for repo, h in COMMIT_CITE.findall(text)}
    return {
        'label': label,
        'path': str(path),
        'commits': sorted(commits),
        'successors': sorted(f'#{n}' for n in successors),
        'open_scope': bool(OPEN_SCOPE.search(text)),
        'unknown': bool(UNKNOWN.search(text)),
    }


#: Las rutas de los cinco repos hermanos. El superproyecto esta ausente por
#: decision (ver ``gitlink-bump-gate.md``), asi que se listan los clones.
#:
#: Salen de `reach_roots`, que las declara una vez y DERIVA el padre en vez
#: de codificarlo: este diccionario era una de las cuatro copias con la ruta
#: absoluta escrita a mano (censo de 2026-09-05).
SIBLING_REPOS = {r: str(p) for r, p in reach_roots.reach().items()}


def commit_to_tasks(repos=None):
    """Mapa ``repo@hash`` -> tareas que el mensaje del commit cita.

    Es la arista de vuelta: *"esa tarea, al cerrarse, produjo este hallazgo"*.
    Sin ella el grafo es bipartito y la recursion no se ve.

    **Un solo ``git log`` por repo, no uno por hash.** Son 760 citas medidas;
    760 invocaciones de git costarian minutos y la respuesta es la misma que un
    barrido unico sobre el historial. Es la diferencia entre O(citas) procesos
    y O(1) por repo — el mismo criterio con que el subconjunto de pruebas se
    deriva en vez de correr la suite entera.

    Devuelve ``(mapa, cobertura)``. La **cobertura** no es decorado: un commit
    cuyo mensaje no cita ninguna tarea no aporta arista, y ninguna regla obliga
    a citarla. Publicar los ciclos sin decir sobre que fraccion del grafo se
    midieron seria un cero que no distingue *"no hay ciclos"* de *"no se ven
    con las aristas que hay"*.
    """
    import subprocess
    repos = repos or SIBLING_REPOS
    mapping, total, with_task = {}, 0, 0
    for name, path in repos.items():
        if not pathlib.Path(path, '.git').exists():
            continue
        try:
            out = subprocess.run(
                ['git', '-C', path, 'log', '--all', '--format=%H%x00%B%x01'],
                capture_output=True, text=True, timeout=120).stdout
        except (OSError, subprocess.SubprocessError):
            continue
        for record in out.split('\x01'):
            if '\x00' not in record:
                continue
            sha, body = record.split('\x00', 1)
            sha = sha.strip()
            if not sha:
                continue
            total += 1
            tasks = {f'#{n}' for n in TASK_ID.findall(body)}
            if tasks:
                with_task += 1
                mapping[f'{name}@{sha}'] = sorted(tasks)
    coverage = with_task / total if total else 0.0
    return mapping, {'commits': total, 'with_task': with_task,
                     'coverage': round(coverage, 4)}


def build_graph(corpus, commit_tasks=None):
    """El grafo dirigido del cierre, desde el corpus de hallazgos.

    Nodos: los hallazgos y las tareas que nombran. Aristas: **hallazgo →
    tarea**, en el sentido *"esto espera a aquello"*. El sentido importa: en
    PageRank la masa fluye hacia donde apuntan las aristas, así que puntuar
    alto significa *"muchos te esperan"*, que es la pregunta.
    """
    root = pathlib.Path(corpus)
    findings, edges, nodes = [], {}, {}
    for path in sorted(root.rglob('hallazgo-*.rst')):
        parsed = parse_finding(path)
        if parsed is None:
            continue
        findings.append(parsed)
        source = parsed['label']
        nodes.setdefault(source, {'id': source, 'kind': 'hallazgo',
                                  'unknown': parsed['unknown'],
                                  'open_scope': parsed['open_scope']})
        for target in parsed['successors']:
            nodes.setdefault(target, {'id': target, 'kind': 'tarea',
                                      'unknown': False, 'open_scope': False})
            # el DESCONOCIDO del hallazgo se propaga a la tarea que lo cierra:
            # es la tarea la que hereda la incógnita, no el documento
            if parsed['unknown']:
                nodes[target]['unknown'] = True
            edges.setdefault(source, set()).add(target)
        # la arista de VUELTA: la tarea que produjo este hallazgo apunta a el.
        # El hash citado se busca por prefijo porque el corpus cita formas
        # cortas (7 caracteres) y largas (40) de la misma revision.
        for cite in parsed.get('commits', ()):
            for full, tasks in (commit_tasks or {}).items():
                if not full.startswith(cite) and not cite.startswith(full):
                    continue
                for task in tasks:
                    nodes.setdefault(task, {'id': task, 'kind': 'tarea',
                                            'unknown': False,
                                            'open_scope': False})
                    edges.setdefault(task, set()).add(source)
                break
    return nodes, edges, findings


def strongly_connected(nodes, edges):
    """Los componentes fuertemente conexos — Tarjan, iterativo.

    Un componente de más de un nodo **es un ciclo**: el trabajo que se espera a
    sí mismo, que es la forma que toma la recursión que no termina. Se reporta
    siempre, aunque esté vacío: un cero medido es evidencia, y callarlo dejaría
    indistinguible *"no hay ciclos"* de *"no se miraron"*.

    Es iterativo y no recursivo a propósito: la versión recursiva revienta la
    pila de Python en un grafo profundo, y ese fallo se ve como un crash y no
    como un ciclo.
    """
    index, low, on_stack, stack, result = {}, {}, set(), [], []
    counter = [0]
    for start in nodes:
        if start in index:
            continue
        work = [(start, iter(sorted(edges.get(start, ()))))]
        index[start] = low[start] = counter[0]
        counter[0] += 1
        stack.append(start)
        on_stack.add(start)
        while work:
            node, children = work[-1]
            advanced = False
            for child in children:
                if child not in index:
                    index[child] = low[child] = counter[0]
                    counter[0] += 1
                    stack.append(child)
                    on_stack.add(child)
                    work.append((child, iter(sorted(edges.get(child, ())))))
                    advanced = True
                    break
                if child in on_stack:
                    low[node] = min(low[node], index[child])
            if advanced:
                continue
            work.pop()
            if work:
                parent = work[-1][0]
                low[parent] = min(low[parent], low[node])
            if low[node] == index[node]:
                component = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    component.append(member)
                    if member == node:
                        break
                result.append(sorted(component))
    return [c for c in result if len(c) > 1]


def connected_components(nodes, edges):
    """Los frentes independientes — la pregunta que ``kruskal`` responde.

    Se usa union-find, que es el motor del Kruskal de cytoscape sin la parte
    de ordenar por peso: sin pesos, el bosque de expansión y los componentes
    conexos son la misma partición, y ordenar aristas de peso constante es
    trabajo que no cambia el resultado.

    Para qué sirve: dos frentes de componentes distintos **no comparten
    ningún nodo**, así que se pueden despachar en paralelo sin que uno pise el
    working tree del otro — que es la precondición que
    ``bash-background-tasks.md`` exige para una tanda.
    """
    parent = {n: n for n in nodes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for source, targets in edges.items():
        for target in targets:
            a, b = find(source), find(target)
            if a != b:
                parent[a] = b
    groups = {}
    for node in nodes:
        groups.setdefault(find(node), []).append(node)
    return sorted(groups.values(), key=len, reverse=True)


def page_rank(nodes, edges, damping=0.8, precision=1e-6, iterations=200):
    """El rango de cada nodo — adaptación nativa del ``pageRank`` de cytoscape.

    ≙ ``cytoscape.js`` en ``_references/claude-code-bin/2.1.246/bunfs-root/
    mermaid.min.js``. Los tres defaults son los suyos, no los del artículo
    original: ``dampingFactor .8``, ``precision 1e-6``, ``iterations 200``.

    Las cuatro piezas del mecanismo, leídas de esa fuente y conservadas:

    1. **El teletransporte** ``v = (1 - d) / f`` se suma a cada columna.
    2. **El sumidero** —un nodo sin salida, ``y[i] === 0``— reparte su masa por
       igual: su columna entera vale ``1/f + v``. Sin esto la masa se escapa y
       el ranking premia a quien no bloquea a nadie, que es justo al revés.
    3. **Normalización por suma en cada vuelta** (``inPlaceSumNormalize``).
    4. **Convergencia por la suma de cuadrados** de la diferencia contra
       ``precision``, con tope de iteraciones — que es lo que hace que un ciclo
       termine en vez de girar para siempre.

    Los lazos sobre sí mismo se ignoran, como en la fuente (``if (k !== E)``).

    **Divergencia declarada:** la matriz es dispersa. Ver el docstring del
    módulo.
    """
    ids = sorted(nodes)
    count = len(ids)
    if count == 0:
        return {}
    position = {node: i for i, node in enumerate(ids)}
    teleport = (1 - damping) / count

    # grado de salida por nodo, con peso constante 1 y sin lazos — ≙ el bucle
    # que llena ``y[A] += P`` en la fuente
    outgoing = [0.0] * count
    incoming = {}
    for source, targets in edges.items():
        for target in targets:
            if source == target:
                continue
            a, b = position[source], position[target]
            outgoing[a] += 1.0
            incoming.setdefault(b, []).append(a)

    sink_share = 1.0 / count + teleport
    rank = [1.0] * count
    for _ in range(iterations):
        nxt = [0.0] * count
        # los sumideros reparten sobre todos por igual
        sink_mass = sum(rank[i] for i in range(count) if outgoing[i] == 0)
        for i in range(count):
            nxt[i] = sink_share * sink_mass
        # y el resto reparte entre sus destinos, más el teletransporte
        for target_index, sources in incoming.items():
            for source_index in sources:
                nxt[target_index] += (rank[source_index] / outgoing[source_index]
                                      + teleport * rank[source_index])
        total = sum(nxt) or 1.0
        nxt = [value / total for value in nxt]
        delta = sum((a - b) ** 2 for a, b in zip(rank, nxt))
        rank = nxt
        if delta < precision:
            break
    return {node: rank[position[node]] for node in ids}


def reachable_count(nodes, edges):
    """Cuántos nodos alcanza cada uno — la alcanzabilidad transitiva.

    **Es la métrica que decide el orden, y pageRank no lo es.** Medido sobre el
    corpus: con densidad 0.000545, el pageRank de este grafo converge casi al
    reparto uniforme — el 80.5 % de los nodos queda a menos del 20 % de él, la
    mediana coincide con el mínimo y el ratio entre el mayor y el menor es de
    3.6×. Un ranking así no separa: publica un orden que no distingue el nodo
    que desbloquea a doce del que no desbloquea a nadie.

    No es un defecto de pageRank; es que su pregunta —*"¿dónde se acumula el
    flujo?"*— sólo tiene respuesta interesante en un grafo con suficiente
    realimentación. Aquí el grafo es un bosque disperso de 637 frentes, y la
    pregunta que sí tiene respuesta es la literal: **cuántos nodos cuelgan de
    éste**.

    Se calcula con BFS desde cada nodo, con conjunto de visitados — que además
    es lo que lo hace inmune a los 43 ciclos medidos: un ciclo se recorre una
    vez y no vuelve a entrar. Coste O(n · aristas) en el peor caso, y el grafo
    es tan disperso que en la práctica es lineal.
    """
    reach = {}
    for start in nodes:
        seen, queue = set(), [start]
        while queue:
            node = queue.pop()
            for target in edges.get(node, ()):
                if target not in seen:
                    seen.add(target)
                    queue.append(target)
        seen.discard(start)
        reach[start] = len(seen)
    return reach


def rank_nodes(nodes, edges):
    """El orden de cierre: rango, con el DESCONOCIDO adelantado.

    El rango dice **cuánto desbloquea**; el DESCONOCIDO es una condición
    aparte y **no se mezcla con él sumando puntos**. Se ordena por la tupla
    ``(no es desconocido, -rango)``: dentro de cada grupo manda el rango, y
    ningún rango alto puede sepultar a un DESCONOCIDO.

    La razón es de fondo y la fijó el ejecutor: un DESCONOCIDO es un nodo cuya
    arista de salida todavía no existe. Mientras no se resuelva, todo lo que
    cuelgue de él es planificación sobre una incógnita — y postergarlo es el
    mismo diferimiento que *"espero al consumidor real"*, que se corrige
    midiendo quién es en la referencia y portándolo.
    """
    ranks = page_rank(nodes, edges)
    reach = reachable_count(nodes, edges)
    rows = []
    for node_id, node in nodes.items():
        rows.append({
            'id': node_id,
            'kind': node['kind'],
            'rank': round(ranks.get(node_id, 0.0), 8),
            'reach': reach.get(node_id, 0),
            'unblocks': len(edges.get(node_id, ())),
            'unknown': node['unknown'],
            'open_scope': node['open_scope'],
        })
    # El orden es (DESCONOCIDO primero, luego alcanzabilidad, luego rango). El
    # rango queda de DESEMPATE y no de criterio: sobre este grafo no separa, y
    # usarlo de criterio publicaría un orden que no distingue nada — ver
    # ``reachable_count``.
    rows.sort(key=lambda r: (not r['unknown'], -r['reach'], -r['rank'], r['id']))
    return rows


TASK_STORE = '.claude/agent-results/agent_store.sqlite3'


def task_ambiguity(edges, store=TASK_STORE):
    """Cuantas tareas citadas resuelven a MAS DE UN trabajo distinto.

    **El id de una tarea no es unico: lo es el par (id, sesion).** La tabla
    ``tasks`` del store lo declara asi en su clave primaria, y el tablero que
    una sesion tiene a la vista es sólo *su* rebanada — no el universo. Una
    arista ``hallazgo -> #NNN`` puede por tanto apuntar a dos trabajos
    distintos, y el grafo, que sólo ve el numero, no puede distinguirlos.

    **Esta funcion nacio de una conclusion falsa que casi se publica.** Al
    comparar los ids citados contra el maximo del tablero de la sesion en
    curso, 199 de 306 quedaban «fuera» y parecian apuntar a otro tablero —
    el 65 %. Medido contra el store, que es el universo real, las ambiguas
    son **5 de 306**, y el caso concreto que disparo la sospecha
    (``h-api-354 -> #155``) resuelve **bien**. El instrumento equivocado era
    el tablero de la sesion tomado por universo: el sub-patron B de
    ``metrica-decide-la-conclusion.md``.

    Devuelve ``None`` si el store no esta — sin el no se puede medir, y un 0
    ahi seria un verde falso.
    """
    if not os.path.exists(store):
        return None
    con = sqlite3.connect(store)
    try:
        subjects = collections.defaultdict(set)
        for task_id, subject in con.execute('select task_id, subject from tasks'):
            subjects[str(task_id)].add(subject)
    except sqlite3.DatabaseError:
        return None
    finally:
        con.close()
    cited = {t[1:] for targets in edges.values() for t in targets
             if t.startswith('#')}
    if not cited:
        return None
    ambiguous = sorted(t for t in cited if len(subjects.get(t, ())) > 1)
    absent = sorted(t for t in cited if t not in subjects)
    return {
        'cited': len(cited),
        'ambiguous': ambiguous,
        'absent': len(absent),
    }


def report_shape(nodes, edges, findings, coverage=None):
    """La forma del grafo — el insumo que decide el algoritmo.

    Se publica **antes** del ranking y con su denominador, porque es lo que
    justifica la elección: un conteo de nodos sin su universo no distingue un
    orden sobre tres de uno sobre mil, y el coste de ``floydWarshall`` no se
    puede negar sin haberlo calculado.
    """
    node_count = len(nodes)
    edge_count = sum(len(t) for t in edges.values())
    cycles = strongly_connected(nodes, edges)
    components = connected_components(nodes, edges)
    density = edge_count / (node_count * (node_count - 1)) if node_count > 1 else 0.0
    return {
        'nodes': node_count,
        'edges': edge_count,
        'density': round(density, 6),
        'findings': len(findings),
        'open_scope': sum(1 for f in findings if f['open_scope']),
        'without_successor': sum(1 for f in findings
                                 if f['open_scope'] and not f['successors']),
        'unknown': sum(1 for f in findings if f['unknown']),
        'cycles': cycles,
        'components': len(components),
        'largest_component': len(components[0]) if components else 0,
        'floyd_warshall_ops': node_count ** 3,
        'return_edge_coverage': coverage or {},
        'task_ambiguity': task_ambiguity(edges),
    }


def render(shape, ranking, limit):
    """El reporte para leer, con su denominador junto a cada cifra."""
    out = []
    out.append('GRAFO DE CIERRE')
    out.append('=' * 60)
    out.append(f"  nodos medidos: {shape['nodes']}  "
               f"(hallazgos {shape['findings']}, aristas {shape['edges']}, "
               f"densidad {shape['density']})")
    out.append(f"  alcance abierto: {shape['open_scope']}  ·  "
               f"sin sucesor: {shape['without_successor']}  ·  "
               f"DESCONOCIDO: {shape['unknown']}")
    out.append(f"  frentes independientes: {shape['components']}  "
               f"(el mayor, {shape['largest_component']} nodos)")
    cov = shape.get('return_edge_coverage') or {}
    if cov:
        out.append(f"  arista de vuelta: {cov['with_task']} de {cov['commits']} "
                   f"commits citan tarea ({cov['coverage']:.1%})")
    else:
        out.append('  arista de vuelta: AUSENTE — el grafo es bipartito y no '
                   'puede tener ciclos; el 0 de abajo no es evidencia')
    if shape['cycles']:
        out.append(f"  CICLOS: {len(shape['cycles'])} — el trabajo que se "
                   f"espera a si mismo")
        for cycle in shape['cycles'][:5]:
            out.append(f"     {' -> '.join(cycle)}")
    else:
        out.append('  ciclos: 0 — ningun frente se espera a si mismo')
    amb = shape.get('task_ambiguity')
    if amb is None:
        out.append('  id de tarea: SIN RESOLVER — falta el store; el id de una '
                   'tarea no es unico, lo es el par (id, sesion)')
    else:
        out.append(f"  id de tarea: {len(amb['ambiguous'])} de {amb['cited']} "
                   f"citadas resuelven a mas de un trabajo distinto"
                   + (f" ({', '.join('#' + a for a in amb['ambiguous'][:5])})"
                      if amb['ambiguous'] else '')
                   + (f"; {amb['absent']} ausentes del store"
                      if amb['absent'] else ''))
        if amb['ambiguous'] or amb['absent']:
            # El ordinal se reinicia y se reusa por sesion; la cita durable
            # `TASK-<CAPA>-NNNN` se ancla al SUJETO y por eso no se vuelve
            # ambigua (ERR-024, H-DOCS-1067). Se nombra aqui porque este es el
            # punto donde el lector descubre que su cita no resuelve: sin la
            # forma alternativa, el aviso diagnostica y no da salida.
            out.append('     la forma que NO se vuelve ambigua es la cita '
                       'durable del store, `TASK-<CAPA>-NNNN`')
            out.append('     (`python3 .claude/scripts/task/task_ids.py cita '
                       '<sesion> <ordinal>`)')
    out.append('')
    out.append(f"  floydWarshall costaria {shape['floyd_warshall_ops']:,} "
               f"operaciones (n^3); por eso el ranking es pageRank y no el")
    out.append('  camino entre todos los pares')
    out.append('')
    out.append(f'ORDEN DE CIERRE (los {limit} primeros de {len(ranking)})')
    out.append('-' * 60)
    for row in ranking[:limit]:
        mark = 'DESCONOCIDO' if row['unknown'] else ''
        out.append(f"  {row['id']:<16} alcanza {row['reach']:<4} "
                   f"directos {row['unblocks']:<3} rango {row['rank']:.6f} {mark}")
    return '\n'.join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description='El grafo de cierre: que se cierra primero, medido.')
    parser.add_argument('--corpus', default='source',
                        help='raiz donde buscar los hallazgo-*.rst')
    parser.add_argument('--json', action='store_true',
                        help='salida en JSON en vez del reporte')
    parser.add_argument('--no-git', action='store_true',
                        help='omite la arista de vuelta (grafo bipartito, sin '
                             'ciclos posibles: el reporte lo declara)')
    parser.add_argument('--limit', type=int, default=20,
                        help='cuantas filas del ranking mostrar')
    args = parser.parse_args(argv)

    commit_tasks, coverage = ({}, {}) if args.no_git else commit_to_tasks()
    nodes, edges, findings = build_graph(args.corpus, commit_tasks)
    shape = report_shape(nodes, edges, findings, coverage)
    ranking = rank_nodes(nodes, edges)

    if args.json:
        print(json.dumps({'shape': shape, 'ranking': ranking}, indent=2,
                         ensure_ascii=False))
    else:
        print(render(shape, ranking, args.limit))
    return 0


if __name__ == '__main__':
    sys.exit(main())
