#!/usr/bin/env python3
"""Etapa 5 del pipeline de orden: ¿la ficha de la tarea sigue siendo cierta?

Las cuatro etapas de ``implementation_order.py`` contestan **qué** implementar
después (Tarjan → Kahn → unblock count) y **con qué agruparlo** (KNN). Ninguna
mira si lo que la ficha *dice* sigue coincidiendo con el árbol. Una ficha se
escribe una vez y el árbol cambia todos los días: entre las dos fechas, la
premisa envejece sin que nada lo reporte.

El episodio que la origina
--------------------------

La ficha de una tarea declaraba construir doce grupos desde cero. Medido antes
de despachar, los doce ya existían y lo único ausente eran tres métodos. El
encuadre del prompt se corrigió a mano; el agente no tuvo que descubrirlo.
Ese trabajo manual es lo que este guion mecaniza — y la reincidencia está
medida: hay fichas vivas que listan como pieza a portar un símbolo que otra
tarea ya cerró.

Qué NO afirma
-------------

Una señal **no dice que la tarea esté hecha**. Dice que la ficha cita algo que
ya existe, y por tanto que **el encuadre del prompt debe re-medirse antes de
despachar**. La distinción es el valor entero del guion: un símbolo puede
existir con la mitad de su cuerpo portado (``porte-completo-no-parcial.md``),
y un cierre automático sobre esa señal sería exactamente el porte parcial
silencioso que ese archivo prohíbe.

Por eso el veredicto es ``RE-ENCUADRAR``, nunca ``CERRAR``, y por eso el guion
sale 0 salvo que se le pida ``--strict``.

Métrica: señales sintácticas sobre el texto de la ficha, contrastadas contra el
árbol de código y contra el estado del propio tablero. Tres formas:

- **S1 símbolo presente** — la ficha usa verbo de construcción y nombra un
  identificador que el árbol ya declara (``def``/``class``).
- **S2 ruta fantasma** — la ficha cita una ruta de archivo que no existe.
- **S3 bloqueador cerrado** — la ficha cita ``#NNN`` con verbo de bloqueo y esa
  tarea ya está cerrada.

Ciega a: la premisa que envejeció **sin dejar rastro léxico** — una ficha que
describe el trabajo en prosa, sin nombrar símbolo ni ruta, no produce ninguna
señal aunque su premisa sea falsa. Ciega también al símbolo homónimo: un
identificador corriente puede existir en otro addon sin relación con la tarea,
y esta métrica no distingue el homónimo de la coincidencia real — por eso cada
señal imprime su ``file:line`` para que el juicio lo haga quien lee.

Y una ceguera que se midió en su propia construcción: el primer extractor
buscaba identificadores entre dobles backticks y devolvió cero. El cero medía
**cómo se escriben las fichas**, no el fenómeno — apenas un puñado de fichas
usa esa forma. El extractor vigente lee identificadores desnudos, que es la
forma que el tablero sí usa (``metrica-decide-la-conclusion.md``, sub-patrón C).

Uso:
    verificar_premisa.py 573 399        # esas fichas
    verificar_premisa.py --top 10       # las primeras del ranking de orden
    verificar_premisa.py --todas        # todas las no cerradas
    verificar_premisa.py --top 5 --strict   # exit 1 si alguna tiene señal
"""
import argparse
import collections
import glob
import json
import os
import re
import sys

# El lector único (`task_source`) vive en `scripts/task/`, no junto a este
# guion: desde la organización por clase (2026-08-27) este archivo es un gate y
# aquél es del subsistema de tareas. Se resuelve por __file__ y no por CWD,
# porque los tests cargan estos módulos por ruta con importlib.
_SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
for _sub in ('task', 'gates'):
    _ruta = os.path.join(_SCRIPTS_DIR, _sub)
    if _ruta not in sys.path:
        sys.path.insert(0, _ruta)
import task_source  # noqa: E402

DONE = 'completed'

#: El árbol de clones hermanos, derivado de la posición de este guion
#: (``<árbol>/kaupamex-docs/.claude/scripts/``) y NO de ``~``: el proceso del
#: agente corre con un HOME distinto del dueño de los repos, así que
#: ``expanduser`` apuntaba fuera del árbol. Se midió: con esa raíz el índice
#: salía de cero símbolos y **todas** las rutas se declaraban fantasma — el
#: guion habría reportado el defecto que persigue por padecerlo él mismo.
#: Desde la organización por clase (2026-08-27) este guion vive un nivel más
#: hondo (``.claude/scripts/gates/``), así que son CINCO saltos y no cuatro.
#: Se deriva con un bucle y NO con dirname anidados: al mudarlo, el conteo a
#: mano es justo lo que se olvida, y su fallo es el silencioso que este
#: docstring describe — índice de cero símbolos y todas las rutas fantasma.
TREE_ROOT = os.path.abspath(__file__)
for _ in range(5):  # gates/ -> scripts/ -> .claude/ -> kaupamex-docs/ -> árbol
    TREE_ROOT = os.path.dirname(TREE_ROOT)

#: Dónde se buscan los símbolos declarados: el árbol de la aplicación. La
#: referencia queda fuera a propósito — que un símbolo exista en la fuente no
#: dice nada sobre si está portado.
CODE_ROOTS = (
    os.path.join(TREE_ROOT, 'kaupamex-api', 'src'),
    os.path.join(TREE_ROOT, 'kaupamex-api', 'addons'),
)

#: Raíces contra las que se resuelve una ruta citada en la ficha.
#:
#: Incluye ``<repo>/.claude`` porque la ficha cita esas rutas SIN ese prefijo:
#: «scripts/gates/verificar_premisa.py». Sin la raíz, S2 las declaraba fantasma
#: — y el falso positivo apareció sobre la ficha de este mismo guion, que es
#: cómo se descubrió.
#:
#: Añadir una raíz sólo puede convertir un falso positivo en silencio: una ruta
#: que de verdad no existe sigue sin resolver bajo ninguna, así que el cambio no
#: puede esconder una señal legítima.
PATH_ROOTS = tuple(
    os.path.join(TREE_ROOT, f'kaupamex-{name}', *extra)
    for name in ('api', 'ui', 'db', 'docs', 'server')
    for extra in ((), ('.claude',))
)

#: Un símbolo declarado: ``def foo`` o ``class Foo`` al principio de la línea.
DECLARATION = re.compile(r'^\s*(?:async\s+)?(?:def|class)\s+([A-Za-z_]\w*)')

#: Verbos que convierten la mención de un símbolo en una afirmación de ausencia.
#: Sin verbo no hay señal: nombrar un símbolo no es afirmar que falta.
BUILD_VERB = re.compile(
    r'\b(construir|portar|crear|a[nñ]adir|anadir|implementar|declarar|'
    r'completar|reponer|restaurar)\b', re.I)

#: Identificador desnudo: ``snake_case`` o ``dotted.name``, que es la forma con
#: que el tablero nombra el código. Se exige al menos un separador para no
#: capturar palabras corrientes del español.
BARE_IDENTIFIER = re.compile(r'\b([a-z_]{3,}(?:[_.][a-z_]{2,})+)\b')

#: Ruta de archivo citada en la ficha.
#:
#: Las extensiones de TypeScript se anadieron el 2026-09-02: el harness entero
#: es `.ts`, asi que sin ellas S2 era ciego a toda ficha suya — y son la mayoria
#: del tablero. Lo destapo un fixture que citaba `src/inexistente.ts` esperando
#: senal y no la recibia. Anadir una extension solo puede convertir un silencio
#: en senal: una ruta que si resuelve sigue sin producirla.
FILE_PATH = re.compile(
    r'\b((?:src|addons|tests|scripts|source|provisioners|config|bin|__tests__)/[\w./-]+'
    r'\.(?:py|sh|rst|js|jsx|ts|tsx|mjs|sql|conf|json))')

#: Por encima de este número de declaraciones, un identificador es vocabulario
#: corriente del árbol y no la pieza concreta que la ficha nombra.
GENERIC_SYMBOL_THRESHOLD = 2

#: Cita de tarea con verbo de bloqueo — la misma forma estrecha que usa
#: ``implementation_order.py`` para no inventar edges.
BLOCKER_CITE = re.compile(
    r'\b(bloquead[ao]s?\s+por|bloqueada\s+por|depende\s+de|precursor\s+de)\b'
    r'[^#\n]{0,40}#(\d+)', re.I)


def default_tasks_dir():
    """El sustrato por defecto, en un solo sitio.

    Vivía interpolado dentro de ``main()``, así que un segundo consumidor
    —``check_premise_drift.py``— tenía que copiar la ruta o inventarse otra.
    Dos definiciones del mismo sustrato divergen; ésta es la única.
    """
    return newest_session_dir(os.path.expanduser('~/.claude/tasks'))


def newest_session_dir(root):
    """La sesión con más tareas — la activa, si hay varias en el disco."""
    if not os.path.isdir(root):
        return root
    candidates = [os.path.join(root, name) for name in os.listdir(root)]
    candidates = [c for c in candidates if os.path.isdir(c)]
    if not candidates:
        return root
    return max(candidates, key=lambda c: len(glob.glob(os.path.join(c, '*.json'))))


def load_tasks(source):
    """Las tareas del sustrato elegido, indexadas por su id como cadena.

    La lectura vive en ``task_source`` (tarea #579), que además cierra el
    defecto que este lector cargaba: una ficha ilegible desaparecía del
    universo con un ``continue`` silencioso — la forma pequeña de
    ``getErrorCode()``. Ahora toda omisión se avisa por stderr.
    """
    try:
        records = task_source.load_records(source)
    except FileNotFoundError:
        return {}
    return {str(record['id']): record for record in records}


def build_symbol_index(roots):
    """Dónde se declara cada símbolo del árbol: nombre → lista de ``file:line``.

    Un índice en una pasada, no un ``grep`` por símbolo: las fichas citan
    decenas de identificadores y el árbol tiene miles de archivos. Se guarda la
    primera declaración de cada nombre y su conteo, que es lo que permite
    distinguir un símbolo único de uno corriente al leer el informe.
    """
    index = collections.defaultdict(list)
    files = 0
    for root in roots:
        if not os.path.isdir(root):
            continue
        for directory, _, names in os.walk(root):
            if '__pycache__' in directory:
                continue
            for name in names:
                if not name.endswith('.py'):
                    continue
                path = os.path.join(directory, name)
                files += 1
                try:
                    lines = open(path, encoding='utf-8').read().splitlines()
                except (OSError, UnicodeDecodeError):
                    continue
                for number, line in enumerate(lines, 1):
                    found = DECLARATION.match(line)
                    if found:
                        index[found.group(1)].append(f'{path}:{number}')
    return index, files


def task_text(task):
    """El texto de la ficha: asunto y descripción."""
    return f"{task.get('subject', '')} {task.get('description', '') or ''}"


def resolve_path(cited):
    """Dónde existe la ruta citada, o ``None`` si en ninguna raíz."""
    for root in PATH_ROOTS:
        candidate = os.path.join(root, cited)
        if os.path.exists(candidate):
            return candidate
    return None


def signals_for(task, tasks, symbols):
    """Las señales de premisa envejecida de una ficha, con su evidencia."""
    text = task_text(task)
    found = []

    if BUILD_VERB.search(text):
        seen = []
        for identifier in dict.fromkeys(BARE_IDENTIFIER.findall(text)):
            # El punto separa modelo de campo en la notación de la referencia
            # (`res.users`); el símbolo declarado en Python nunca lo lleva.
            name = identifier.replace('.', '_') if '.' not in identifier \
                else identifier.split('.')[-1]
            for candidate in (identifier, name):
                where = symbols.get(candidate)
                if not where or candidate in seen:
                    continue
                # Un identificador declarado en muchos sitios es vocabulario
                # corriente del árbol (`country`, `compute_all`), no la pieza
                # que la ficha nombra. Se descarta: medido, era la mitad del
                # ruido de esta señal, y una señal que dispara siempre es una
                # que nadie mira.
                if len(where) > GENERIC_SYMBOL_THRESHOLD:
                    continue
                seen.append(candidate)
                found.append((
                    'S1',
                    f'«{candidate}» ya está declarado — {where[0]}'
                    + (f' (+{len(where) - 1} más)' if len(where) > 1 else '')))
                break

    for cited in dict.fromkeys(FILE_PATH.findall(text)):
        if resolve_path(cited) is None:
            found.append(('S2', f'la ruta citada no existe: {cited}'))

    for _, blocker in BLOCKER_CITE.findall(text):
        blocking = tasks.get(blocker)
        if blocking is not None and blocking['status'] == DONE:
            found.append((
                'S3',
                f'su bloqueador #{blocker} ya está cerrado — '
                f'{blocking["subject"][:52]}'))

    return found


def report(task_id, task, found):
    """Imprime el veredicto de una ficha. Devuelve True si tenía señales.

    En una tarea ya cerrada la señal S1 es **esperada** —su trabajo declaró
    esos símbolos— así que el veredicto lo dice en vez de presentarla como
    hallazgo. Sin esa distinción, el guion daría por envejecida toda ficha
    cumplida, que es la lectura opuesta a la que existe para dar.
    """
    if not found:
        verdict = 'premisa firme'
    elif task['status'] == DONE:
        verdict = 'señal esperada (la tarea ya cerró: declaró esos símbolos)'
    else:
        verdict = 'RE-ENCUADRAR'
    print(f'#{task_id} [{task["status"]}] {task["subject"][:64]}')
    print(f'   veredicto: {verdict}')
    for code, detail in found:
        print(f'   {code}  {detail}')
    # El conteo cuenta lo que pide acción, y una tarea cerrada no la pide: sus
    # señales son la huella de su propio trabajo. Contarlas inflaba el total
    # con lo único que el guion sabe de antemano que no es un hallazgo.
    return bool(found) and task['status'] != DONE


#: El alcance con que se emite una presuposición de símbolo.
#:
#: **No** es el archivo donde el detector lo halló: derivar el alcance del
#: hallazgo lo haría circular —el evaluador buscaría justo donde ya se sabe que
#: está— y su veredicto no sería una segunda medición sino un eco de la primera.
#: Se emite el **universo de búsqueda** del detector, para que el evaluador lo
#: recorra con su propio instrumento y pueda discrepar.
EMIT_SYMBOL_SCOPE = 'kaupamex-api/{src,addons}/**/*.py'


def premise_from_signals(task_id, task, found):
    """La ficha como premisa declarada, o ``None`` si no hay nada que declarar.

    El puente **no es total, y la parte que falta se declara**:

    - ``S1`` → ``symbol-absent``. La ficha dice «portar X» y por tanto presupone
      que X falta. Que falte no la **bloquea**: la **justifica**, así que va en
      ``presupposes`` y no en ``blockedWhile``.
    - ``S2`` → ``path-exists``. Citar una ruta presupone que existe.
    - ``S3`` → **no se emite**. Su predicado hablaría del *tablero* («la tarea
      #N está cerrada»), y el evaluador sólo lee el árbol: su ``PremiseIo`` no
      tiene acceso al tablero, y dárselo metería vocabulario de este proyecto en
      un mecanismo que es abstracto a propósito. Queda declarado, no olvidado.
    """
    supuestos = []
    for code, detail in found:
        if code == 'S1':
            simbolo = detail.split('«', 1)[1].split('»', 1)[0]
            supuestos.append({'kind': 'symbol-absent', 'symbol': simbolo,
                              'in': EMIT_SYMBOL_SCOPE})
        elif code == 'S2':
            supuestos.append({'kind': 'path-exists',
                              'path': detail.rsplit(': ', 1)[1]})
    if not supuestos:
        return None
    return {'id': task_id, 'open': task['status'] != DONE,
            'presupposes': supuestos}


def emit_premises(destino, tasks, selected, symbols):
    """Escribe las fichas con señal como premisas declaradas. Devuelve cuántas.

    Sólo las que tienen algo que declarar: una entrada con ``presupposes``
    vacío haría que el evaluador la reportara ``unmeasurable``, que es ruido
    con forma de medición.
    """
    salida = []
    for task_id in selected:
        premisa = premise_from_signals(
            task_id, tasks[task_id],
            signals_for(tasks[task_id], tasks, symbols))
        if premisa is not None:
            salida.append(premisa)
    with open(destino, 'w', encoding='utf-8') as fh:
        json.dump(salida, fh, ensure_ascii=False, indent=2)
    return len(salida)


def main():
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument('ids', nargs='*', help='ids de tarea a verificar')
    parser.add_argument('--tasks-dir', default=None,
                        help="directorio de fichas, o '-' para leer de stdin")
    parser.add_argument('--top', type=int,
                        help='verifica las N primeras no cerradas por id')
    parser.add_argument('--todas', action='store_true',
                        help='verifica todas las no cerradas')
    parser.add_argument('--strict', action='store_true',
                        help='exit 1 si alguna ficha tiene señal')
    parser.add_argument('--emit-premises', metavar='ARCHIVO',
                        help='escribe las señales como premisas declaradas '
                             'para `harness --check-premises`')
    args = parser.parse_args()

    tasks_dir = args.tasks_dir or default_tasks_dir()
    tasks = load_tasks(tasks_dir)
    if not tasks:
        # Mismo criterio que implementation_order.py: un tablero vacío es
        # «nada que verificar», no un fallo. Con exit 1 quien lo invoque no
        # podría distinguirlo de un guion que reventó.
        print(f'verificar-premisa: sin tareas en {tasks_dir}')
        return 0

    symbols, files = build_symbol_index(CODE_ROOTS)

    if args.ids:
        selected = [i for i in args.ids if i in tasks]
        missing = [i for i in args.ids if i not in tasks]
        for absent in missing:
            print(f'#{absent} no está en el tablero')
        if not selected:
            return 1
    else:
        pending = sorted((i for i, t in tasks.items() if t['status'] != DONE),
                         key=int)
        selected = pending if args.todas else pending[:args.top or 10]

    print(f'verificar-premisa: {len(tasks)} tareas · índice de {len(symbols)} '
          f'símbolos sobre {files} archivos · {len(selected)} ficha(s) medidas')
    print()

    flagged = 0
    for task_id in selected:
        if report(task_id, tasks[task_id],
                  signals_for(tasks[task_id], tasks, symbols)):
            flagged += 1

    if args.emit_premises:
        cuantas = emit_premises(args.emit_premises, tasks, selected, symbols)
        print()
        print(f'· emitidas: {cuantas} de {len(selected)} ficha(s) como premisa '
              f'declarada en {args.emit_premises}')
        print('· S3 no se emite: su predicado hablaría del tablero, y el '
              'evaluador sólo lee el árbol')

    print()
    print(f'{flagged} de {len(selected)} ficha(s) piden re-encuadre antes de '
          f'despachar')
    return 1 if (args.strict and flagged) else 0


if __name__ == '__main__':
    sys.exit(main())
