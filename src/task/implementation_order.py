#!/usr/bin/env python3
"""Qué se implementa después: Tarjan → Kahn → unblock count → KNN → premisa.

Contesta la pregunta que KNN **no** contesta. Medido sobre la tarea en curso,
el neighbourhood devolvió cinco candidatas y sólo una era dependencia real; las
otras cuatro eran vecinas del *texto* — comparten «completar», «símbolos»,
«porte» pero no tocan el mismo código. La distancia del KNN es coseno sobre
TF-IDF del asunto y la descripción: mide **cómo están redactadas las tareas**,
no **cómo depende el trabajo**. Ver
``analisis-implementation-order-graph-vs-knn``.

El orden lo fija un graph, y las cuatro etapas son éstas:

1. **Tarjan (strongly connected components)** — condensa los cycles. No es
   opcional: un cycle no tiene topological sort, así que sin condensar el
   paso 2 devuelve el conjunto vacío y parece que no hay nada listo.
2. **Kahn (topological sort)** sobre la condensation — el conjunto *ready*:
   lo que no tiene bloqueador pendiente.
3. **Unblock count** — de lo ready, primero lo que más destraba. Es la
   heurística de camino crítico, y formaliza dos decisiones que aquí ya se
   tomaron a mano y salieron bien: ``stock_warehouse.py`` primero *"porque
   desbloquea toda la suite"* (#340) y ``stock.picking.type`` porque *"9 FK
   cuelgan y el árbol no valida"* (#269).
4. **KNN** — entre las de prioridad pareja, agrupar por contexto compartido.
   Ahí su ceguera al código no cuesta nada, porque todo lo que compara ya es
   viable, y amortiza el ``cache_read``, que es el 97.8 % del gasto
   (:ref:`h-docs-195`). Lo aporta ``vecinos_de_tarea.py``; este guion lo
   invoca, no lo reimplementa.
5. **Verificación de premisa** — antes de despachar, medir si la ficha sigue
   siendo cierta. Las cuatro etapas anteriores ordenan y agrupan **fichas**, y
   una ficha es un texto escrito una vez sobre un árbol que cambia a diario:
   entre las dos fechas, su premisa envejece sin que nada lo reporte. Lo aporta
   ``verificar_premisa.py``; este guion lo invoca, no lo reimplementa.

**Por qué la etapa 5 existe, y por qué es la última.** Una ficha declaraba
construir doce grupos desde cero; medido antes de despachar, los doce ya
existían y sólo faltaban tres métodos. El encuadre se corrigió a mano y el
agente no tuvo que descubrirlo — pero esa medición dependía de que alguien se
acordara de hacerla, que es exactamente la forma de defecto que
``gitlink-bump-gate.md`` describe: *"la lección escrita no previene la
reincidencia; sólo un gate ejecutable integrado en el flujo lo hace"*.

Va **al final** porque verificar es caro comparado con ordenar: se paga sólo
sobre las pocas que el ranking ya eligió, no sobre el tablero entero.

**Tarjan va iterativo a propósito.** La versión recursiva es más corta y este
proyecto ya sabe cómo termina: ``ModuleGraph.depth`` revienta con
``RecursionError`` ante un cycle declarado (tarea #323). Escribir el
mecanismo que existe para tratar cycles de una forma que los cycles rompen
sería el mismo defecto una capa más arriba.

Métrica: edges de dependencia entre tareas, de dos fuentes declaradas —
``blockedBy``/``blocks`` del propio tablero, y las citas ``#NNN`` con verbo de
bloqueo en el texto.
Ciega a: la dependencia que nadie escribió. El graph cubre lo declarado, no lo
verdadero, y su cobertura se imprime junto al resultado para que la diferencia
esté a la vista. Ciega también al **peso** de cada tarea: ordena por cuántas
destraba, no por cuánto cuesta cada una.

Uso:
    implementation_order.py                 # el ranking de lo ready
    implementation_order.py --top 5         # cuántas mostrar
    implementation_order.py --batch         # + el KNN neighbourhood de la 1ª
    implementation_order.py --premisa       # + la etapa 5 sobre el top
    implementation_order.py --cycles        # sólo los SCC de tamaño > 1
"""
import argparse
import collections
import glob
import os
import re
import subprocess
import sys

# El lector único vive junto a este guion; se resuelve por __file__ y no por
# CWD, porque los tests cargan estos módulos por ruta con importlib.
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
import task_source  # noqa: E402

DEFAULT_TASKS_DIR = os.path.expanduser('~/.claude/tasks')
DONE = 'completed'

# Verbos que convierten una cita `#NNN` en edge. Deliberadamente estrecho:
# una mención suelta del número no es una dependencia, y contarla como tal
# inventaría edges que nadie declaró.
PROSE_EDGE = re.compile(
    r'\b(bloquead[ao]s?\s+por|bloqueada\s+por|depende\s+de|precursor\s+de)\b'
    r'[^#\n]{0,40}#(\d+)', re.I)
PROSE_UNBLOCKS = re.compile(r'\b(desbloquea|habilita)\b[^#\n]{0,40}#(\d+)', re.I)


def load_tasks(source):
    """Las tareas del sustrato elegido, indexadas por su id como cadena.

    La lectura vive en ``task_source`` (tarea #579 — el sustrato lo decide el
    llamador: directorio, ``-`` para stdin, o un iterable en memoria); aquí
    queda sólo la indexación que este guion necesita. Un directorio ausente es
    universo vacío, no error: el pipeline distingue «nada que ordenar» de
    «guion roto» (caso 9 del universo controlado).
    """
    try:
        records = task_source.load_records(source)
    except FileNotFoundError:
        return {}
    return {str(record['id']): record for record in records}


def newest_session_dir(root):
    """La sesión con más tareas — la activa, si hay varias en el disco."""
    if not os.path.isdir(root):
        return root
    candidates = [os.path.join(root, name) for name in os.listdir(root)]
    candidates = [c for c in candidates if os.path.isdir(c)]
    if not candidates:
        return root
    return max(candidates, key=lambda c: len(glob.glob(os.path.join(c, '*.json'))))


def build_edges(tasks):
    """Edges ``bloqueador → bloqueada``, con su procedencia.

    Devuelve ``(edges, provenance)`` donde ``edges`` es un dict de conjuntos y
    ``provenance`` cuenta cuántas aportó cada fuente. Las dos fuentes se
    mezclan a propósito —el graph es uno solo— pero se cuentan aparte para que
    la cobertura sea legible: una edge declarada en el tablero es más firme
    que una leída de un párrafo.
    """
    edges = collections.defaultdict(set)
    provenance = collections.Counter()

    def add(source, target, origin):
        """Añade la edge y la cuenta SÓLO si es nueva.

        ``blockedBy`` y ``blocks`` describen la misma edge desde sus dos
        extremos, así que contar cada inserción daría el doble de edges que
        el graph tiene — y el resumen se contradiría con su propio total, que
        es justo el defecto que la tarea #408 persigue en los artefactos.
        """
        if target in edges[source]:
            return
        edges[source].add(target)
        provenance[origin] += 1

    for task_id, task in tasks.items():
        for blocker in task.get('blockedBy') or []:
            if str(blocker) in tasks:
                add(str(blocker), task_id, 'tablero')
        for blocked in task.get('blocks') or []:
            if str(blocked) in tasks:
                add(task_id, str(blocked), 'tablero')

    for task_id, task in tasks.items():
        text = f"{task.get('subject', '')} {task.get('description', '')}"
        for _, blocker in PROSE_EDGE.findall(text):
            if blocker in tasks and blocker != task_id:
                add(blocker, task_id, 'prosa')
        for _, blocked in PROSE_UNBLOCKS.findall(text):
            if blocked in tasks and blocked != task_id:
                add(task_id, blocked, 'prosa')

    return edges, provenance


def tarjan_scc(nodes, edges):
    """Strongly connected components, iterativo.

    Un componente de tamaño > 1 es un cycle: sus miembros se necesitan
    mutuamente y no admiten orden entre sí. La condensation los trata como un
    nodo único, que es la única forma correcta de ordenarlos — y la razón de
    que este paso vaya antes que el topological sort.
    """
    index_of = {}
    low = {}
    on_stack = set()
    stack = []
    components = []
    counter = [0]

    for root in nodes:
        if root in index_of:
            continue
        # Pila explícita: (nodo, iterador de sus sucesores).
        work = [(root, iter(sorted(edges.get(root, ()))))]
        index_of[root] = low[root] = counter[0]
        counter[0] += 1
        stack.append(root)
        on_stack.add(root)

        while work:
            node, successors = work[-1]
            advanced = False
            for successor in successors:
                if successor not in index_of:
                    index_of[successor] = low[successor] = counter[0]
                    counter[0] += 1
                    stack.append(successor)
                    on_stack.add(successor)
                    work.append((successor, iter(sorted(edges.get(successor, ())))))
                    advanced = True
                    break
                if successor in on_stack:
                    low[node] = min(low[node], index_of[successor])
            if advanced:
                continue
            work.pop()
            if work:
                parent = work[-1][0]
                low[parent] = min(low[parent], low[node])
            if low[node] == index_of[node]:
                component = []
                while True:
                    member = stack.pop()
                    on_stack.discard(member)
                    component.append(member)
                    if member == node:
                        break
                components.append(frozenset(component))
    return components


def condense(components, edges):
    """El graph de componentes: un node por SCC, sin edges internas."""
    component_of = {}
    for number, component in enumerate(components):
        for member in component:
            component_of[member] = number
    condensed = collections.defaultdict(set)
    for source, targets in edges.items():
        for target in targets:
            a, b = component_of.get(source), component_of.get(target)
            if a is not None and b is not None and a != b:
                condensed[a].add(b)
    return component_of, condensed


def kahn_topological_sort(node_count, condensed):
    """Topological sort sobre la condensation (ya sin cycles por construcción).

    Devuelve ``(orden, restantes)``. ``restantes`` debería ser vacío: si no lo
    es, la condensation tenía un cycle, que sería un fallo de Tarjan y no del
    graph — por eso se devuelve en vez de tragarse.
    """
    indegree = collections.Counter()
    for source in range(node_count):
        for target in condensed.get(source, ()):
            indegree[target] += 1
    queue = collections.deque(sorted(n for n in range(node_count) if not indegree[n]))
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for target in sorted(condensed.get(node, ())):
            indegree[target] -= 1
            if indegree[target] == 0:
                queue.append(target)
    remaining = [n for n in range(node_count) if indegree[n] > 0]
    return order, remaining


def unblock_count(component_index, condensed, order, components, tasks):
    """Cuántas tareas NO cerradas dependen, transitivamente, de cada componente.

    Se recorre el topological sort al revés, que es lo que permite acumular el
    alcance de cada nodo en una sola pasada: cuando se llega a un nodo, todos
    sus sucesores ya tienen su conjunto calculado.
    """
    reach = {node: set() for node in range(component_index)}
    for node in reversed(order):
        accumulated = set()
        for target in condensed.get(node, ()):
            accumulated |= reach[target]
            accumulated |= {m for m in components[target]
                            if tasks[m]['status'] != DONE}
        reach[node] = accumulated
    return {node: len(members) for node, members in reach.items()}


def is_ready(task_id, tasks, edges, component_of, components):
    """Ready = pendiente y sin bloqueador abierto fuera de SU COMPONENTE.

    La cláusula del componente no es un matiz: es la razón de que Tarjan vaya
    primero. Dentro de un cycle cada miembro bloquea al otro, así que medir la
    disponibilidad sobre las edges crudas los declara bloqueados **para
    siempre** — y el cycle desaparece del ranking sin que nada lo reporte. Es
    el mismo fallo que el análisis atribuye a «Kahn sin Tarjan», reintroducido
    una etapa más abajo.

    Un cycle sin bloqueador externo **sí** es portable: se porta entero, como
    un lote. Eso es lo que la condensation dice y lo que esta función respeta.

    **El bloqueo externo es del COMPONENTE, no del miembro.** Un cycle se
    porta entero o no se porta: si un bloqueador abierto apunta a *cualquiera*
    de sus miembros, ninguno es viable — el compañero no se puede portar sin el
    otro, y el otro está bloqueado. Medir sólo los bloqueadores directos del
    nodo declara ready al miembro que nadie apunta y manda a trabajar sobre un
    lote imposible.

    Los dos casos del universo controlado son los que separan estas lecturas, y
    ninguno de ellos es el cycle de dos aislado:

    - ``{4,5}`` sin bloqueador externo → **ready**, se porta como lote.
    - ``{15,16}`` con ``#14`` abierto apuntando sólo a ``#15`` → **ninguno**
      ready. Antes de este arreglo ``#16`` salía ready: su único bloqueador era
      su compañero de cycle, y la cláusula del componente lo saltaba.

    Lo destapó el universo controlado de
    ``.claude/scripts/tests/test-implementation-order.sh`` (casos 5 y 5-bis),
    no una corrida sobre el tablero real: con cientos de tareas la cifra de
    ready no tiene con qué compararse.
    """
    if tasks[task_id]['status'] == DONE:
        return False
    own = component_of.get(task_id)
    family = components[own] if own is not None else {task_id}
    for source, targets in edges.items():
        if component_of.get(source) == own:
            continue          # compañero de cycle, no bloqueador externo
        if not targets & family:
            continue
        if tasks[source]['status'] != DONE:
            return False
    return True


def descendants(node, condensed):
    """Los componentes alcanzables desde ``node``, sin contarlo a él.

    Traversal iterativo por la misma razón que Tarjan: el graph puede tener
    cadenas largas y la recursión aquí no compra legibilidad.
    """
    seen = set()
    stack = list(condensed.get(node, ()))
    while stack:
        current = stack.pop()
        if current in seen:
            continue
        seen.add(current)
        stack.extend(condensed.get(current, ()))
    return seen


def _cita(task_id, citations):
    """``#122 (TASK-DOCS-0390)`` — el ordinal con su cita durable, si la hay.

    El ordinal se reinicia y se reusa por sesion, asi que una cita tomada de
    esta salida no resuelve manana (ERR-024, H-DOCS-1067). La cita se ancla al
    SUJETO. Sin store, sin columna o con el sujeto sin casar, se publica el
    ordinal a secas — mismo contrato que ``selectCitationId`` del harness.
    """
    cita = (citations or {}).get(str(task_id))
    return f'#{task_id} ({cita})' if cita else f'#{task_id}'


def explain(task_id, tasks, component_of, condensed, components,
            citations=None):
    """Qué destraba esa tarea, nombre por nombre.

    Un ranking sin el *por qué* no es una decisión: «desbloquea 4» no dice si
    esas cuatro importan. Esto imprime las tareas concretas que quedan
    alcanzables, que es lo que permite desempatar dos candidatas con el mismo
    conteo.
    """
    if task_id not in tasks:
        print(f'#{task_id} no está en el tablero')
        return 1
    node = component_of[task_id]
    print(f"{_cita(task_id, citations)} [{tasks[task_id]['status']}] "
          f"{tasks[task_id]['subject']}")
    if len(components[node]) > 1:
        companions = sorted((m for m in components[node] if m != task_id), key=int)
        print(f"  va en un cycle con: {', '.join('#' + m for m in companions)}")
    reachable = []
    for target in descendants(node, condensed):
        for member in components[target]:
            if tasks[member]['status'] != DONE:
                reachable.append(member)
    if not reachable:
        print('  destraba: nada — es una hoja del graph declarado')
        return 0
    print(f'  destraba {len(reachable)} tarea(s) no cerrada(s):')
    for member in sorted(reachable, key=int):
        print(f"    {_cita(member, citations)} [{tasks[member]['status']}] "
              f"{tasks[member]['subject'][:66]}")
    return 0


def _delegate(script_rel, arguments, missing_note, timeout):
    """Invoca otro guion del pipeline y devuelve su salida.

    Las etapas 4 y 5 viven en guiones propios y este las **invoca**: cada una
    se prueba y se corre por separado, y el pipeline no duplica su mecanismo.

    ``script_rel`` es relativo a ``.claude/scripts/``, no al directorio de este
    archivo: desde la organización por clase (2026-08-27) la etapa 4 vive en
    ``task/`` y la 5 en ``gates/``, así que «guion hermano» dejó de ser cierto.
    """
    scripts_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    script = os.path.join(scripts_dir, script_rel)
    if not os.path.exists(script):
        return missing_note
    result = subprocess.run([sys.executable, script] + arguments,
                            capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip() or result.stderr.strip()


def neighbourhood(task_id, tasks_dir, k):
    """La etapa 4: delega en el KNN ya construido, no lo reimplementa."""
    return _delegate(
        os.path.join('task', 'vecinos_de_tarea.py'),
        [task_id, '--k', str(k), '--tasks-dir', tasks_dir],
        'vecinos_de_tarea.py no encontrado — etapa 4 omitida',
        timeout=120)


def premise_check(task_ids, tasks_dir):
    """La etapa 5: ¿siguen siendo ciertas las fichas que el ranking eligió?

    Se corre sobre el top del ranking y no sobre el tablero entero: construir
    el índice de símbolos cuesta un recorrido del árbol, y lo que se va a
    despachar son unas pocas fichas.
    """
    return _delegate(
        os.path.join('gates', 'verificar_premisa.py'),
        list(task_ids) + ['--tasks-dir', tasks_dir],
        'verificar_premisa.py no encontrado — etapa 5 omitida',
        timeout=300)


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument('--tasks-dir', default=None,
                        help="directorio de fichas, o '-' para leer de stdin")
    parser.add_argument('--top', type=int, default=10)
    parser.add_argument('--k', type=int, default=6)
    parser.add_argument('--batch', action='store_true',
                        help='añade el KNN neighbourhood de la primera')
    parser.add_argument('--premisa', action='store_true',
                        help='etapa 5: verifica la premisa de las del top')
    parser.add_argument('--cycles', action='store_true',
                        help='sólo los SCC de tamaño > 1')
    parser.add_argument('--explain', metavar='ID',
                        help='qué destraba esa tarea, nombre por nombre')
    args = parser.parse_args()

    tasks_dir = args.tasks_dir or newest_session_dir(DEFAULT_TASKS_DIR)
    tasks = load_tasks(tasks_dir)
    if not tasks:
        # Sale 0, no 1: un tablero vacío es «nada que ordenar», no un fallo.
        # Con exit 1 quien lo invoque no puede distinguir el universo vacío de
        # un guion que reventó — y ésa es justo la ambigüedad que un gate en un
        # bucle no puede permitirse. Lo destapó el caso 9 del universo
        # controlado; el error real sí sale 1 (ver `--explain` de un id ausente).
        print(f'implementation-order: sin tareas en {tasks_dir}')
        return 0

    citations = task_source.citation_index(list(tasks.values()))
    edges, provenance = build_edges(tasks)
    nodes = sorted(tasks)
    components = tarjan_scc(nodes, edges)
    component_of, condensed = condense(components, edges)
    order, remaining = kahn_topological_sort(len(components), condensed)

    cycles = [c for c in components if len(c) > 1]
    if args.cycles:
        if not cycles:
            print(f'0 cycles (alcance medido: {len(tasks)} tareas, '
                  f'{sum(len(t) for t in edges.values())} edges)')
            return 0
        for cycle in cycles:
            print('cycle:', ', '.join('#' + m for m in sorted(cycle, key=int)))
            for member in sorted(cycle, key=int):
                print(f"   {_cita(member, citations)} "
                      f"[{tasks[member]['status']}] "
                      f"{tasks[member]['subject'][:70]}")
        return 0

    if args.explain:
        return explain(args.explain, tasks, component_of, condensed,
                       components, citations)

    reach = unblock_count(len(components), condensed, order, components, tasks)
    ready = [t for t in nodes if is_ready(t, tasks, edges, component_of, components)]
    ranked = sorted(
        ready,
        key=lambda t: (-reach.get(component_of[t], 0), int(t)))

    total_edges = sum(len(t) for t in edges.values())
    print(f'implementation-order: {len(tasks)} tareas · {total_edges} edges '
          f'({provenance["tablero"]} del tablero, {provenance["prosa"]} de prosa) '
          f'· {len(components)} componentes, {len(cycles)} cycle(s)')
    if remaining:
        print(f'  AVISO: {len(remaining)} componente(s) sin orden — la '
              f'condensation conserva un cycle, revisar Tarjan')
    print(f'  ready (sin bloqueador abierto): {len(ready)} de '
          f'{sum(1 for t in tasks.values() if t["status"] != DONE)} no cerradas')
    print()

    print(f'Siguientes por unblock count (top {args.top}):')
    for task_id in ranked[:args.top]:
        count = reach.get(component_of[task_id], 0)
        status = tasks[task_id]['status']
        marker = '·' if count == 0 else '↑'
        print(f'  {marker} desbloquea {count:>2}  '
              f'{_cita(task_id, citations)} [{status}] '
              f"{tasks[task_id]['subject'][:66]}")

    if args.batch and ranked:
        print()
        print(f'Lote por neighbourhood (etapa 4, KNN sobre #{ranked[0]}):')
        print(neighbourhood(ranked[0], tasks_dir, args.k))

    if args.premisa and ranked:
        print()
        print(f'Premisa de las {min(args.top, len(ranked))} del top '
              f'(etapa 5, antes de despachar):')
        print(premise_check(ranked[:args.top], tasks_dir))
    return 0


if __name__ == '__main__':
    sys.exit(main())
