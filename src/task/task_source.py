#!/usr/bin/env python3
"""Lector único de fichas de tarea — el sustrato lo decide el llamador.

Porte del **parámetro de flujo** de CS 106X lectura 3
(:ref:`bc-cs106x-flujos-y-rejilla`, tarea #579): una función que procesa datos
no nombra de dónde vienen. Antes de este módulo el tablero tenía tres
``load_tasks`` divergentes —dos librerías, dos tipos de retorno y dos conductas
ante una ficha ilegible, una de ellas un descarte silencioso— y ninguno
aceptaba otra cosa que un directorio de ``*.json``.

Aquí el lector recibe **la fuente**, y quien llama decide el sustrato:

- una ruta de directorio → una ficha por archivo ``*.json``;
- un flujo de texto ya abierto (``sys.stdin``, un ``StringIO`` de test) →
  JSON array, JSON Lines, u objetos concatenados — el decodificador no exige
  una forma;
- un iterable de dicts ya en memoria → se valida y se devuelve, sin disco.

Conducta única ante una ficha ilegible o sin ``id``: **aviso a stderr y se
omite** — nunca un descarte silencioso (el ``continue`` de
``verificar_premisa.py:139`` era la forma pequeña de ``getErrorCode()``).

El módulo devuelve una **lista de dicts**; la indexación (dict por ``str(id)``,
orden por ``int(id)``) es del llamador — igual que la granularidad del token la
elige quien consume.
"""
import json
import pathlib
import sqlite3
import sys

#: La convención de CLI para «leer de stdin», compartida por los consumidores.
STDIN_SOURCE = '-'


def _warn(message):
    print(f'aviso: {message}', file=sys.stderr)


def _keep(record, origin):
    """¿La ficha entra al universo? Un dict con ``id``, o se avisa y se omite."""
    if not isinstance(record, dict):
        _warn(f'{origin}: no es un objeto JSON, se omite')
        return False
    if 'id' not in record:
        _warn(f'{origin}: ficha sin id, se omite')
        return False
    return True


def records_from_dir(tasks_dir):
    """Fichas desde un directorio — una por archivo ``*.json``.

    Un directorio inexistente levanta ``FileNotFoundError``: distinguirlo de un
    directorio vacío es decisión del llamador (el pipeline lo trata como
    universo vacío y sale 0; el KNN lo trata como error de invocación).
    """
    directory = pathlib.Path(tasks_dir)
    if not directory.is_dir():
        raise FileNotFoundError(f'no existe el directorio de tareas: {tasks_dir}')
    records = []
    for path in sorted(directory.glob('*.json')):
        try:
            record = json.loads(path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError) as error:
            _warn(f'{path.name} ilegible ({error}), se omite')
            continue
        if _keep(record, path.name):
            records.append(record)
    return records


def records_from_stream(stream):
    """Fichas desde un flujo de texto ya abierto.

    Acepta las tres formas sin declarar cuál llega: un JSON array de fichas,
    JSON Lines, u objetos concatenados. ``raw_decode`` consume valor a valor,
    así que la forma no es parte del contrato — sólo el contenido.
    """
    text = stream.read()
    decoder = json.JSONDecoder()
    values = []
    position = 0
    length = len(text)
    while position < length:
        while position < length and text[position].isspace():
            position += 1
        if position >= length:
            break
        try:
            value, position = decoder.raw_decode(text, position)
        except json.JSONDecodeError as error:
            _warn(f'flujo ilegible desde la posición {position} ({error}); '
                  f'se conserva lo ya leído')
            break
        values.append(value)
    records = []
    for value in values:
        for record in (value if isinstance(value, list) else [value]):
            if _keep(record, 'flujo'):
                records.append(record)
    return records


def load_records(source):
    """Despacho por sustrato. Devuelve siempre una lista de dicts con ``id``.

    - ``'-'`` → ``sys.stdin``;
    - una cadena o ``Path`` → directorio de ``*.json``;
    - un objeto con ``read()`` → flujo ya abierto;
    - cualquier otro iterable → fichas ya en memoria (se validan igual).
    """
    if isinstance(source, (str, pathlib.Path)):
        if str(source) == STDIN_SOURCE:
            return records_from_stream(sys.stdin)
        return records_from_dir(source)
    if hasattr(source, 'read'):
        return records_from_stream(source)
    return [record for record in source if _keep(record, 'memoria')]


# ---------------------------------------------------------------------------
# La cita durable de una ficha — TASK-DOCS-0394 (#115)
# ---------------------------------------------------------------------------
#
# Las fichas del board se identifican por ORDINAL, y ese ordinal se reinicia y
# se reusa por sesión: una cita tomada de ahí no resuelve mañana (ERR-024,
# :ref:`h-docs-1067`). La cita durable vive en `tasks.citation_id` del store, y
# se ancla al SUJETO — no a la posición.
#
# Por eso la búsqueda de abajo **no es por ordinal**. Buscar por ordinal
# republicaría el defecto: medido 2026-09-05, el ordinal 122 del board nombra
# «Reparar el REcompile() panic» y en el store nombra «Cron A — portar el
# ejecutor de IrCron», dos sujetos sin relación. Publicar esa cita al lado del
# ordinal sería peor que no publicar ninguna: se leería como confirmación.
#
# El contrato es el de `selectCitationId` del harness: **una base sin la
# columna sigue respondiendo, sin el campo**. Ausencia de store, ausencia de
# columna y sujeto que no casa dan lo mismo — ninguna cita — y ninguna de las
# tres es un error del llamador.

#: El store por defecto, relativo a la raíz del repo `docs`.
DEFAULT_STORE = pathlib.Path(__file__).resolve().parents[3] \
    / '.claude' / 'agent-results' / 'agent_store.sqlite3'


def _subject_key(subject):
    """El sujeto normalizado por espacios; ``None`` si está vacío.

    Un sujeto vacío NO ancla: colapsaría todas las fichas sin título en una
    sola llave. Es el mismo criterio de `task_ids.TaskRef.subject_key`, y se
    repite aquí —cuatro líneas— para que este módulo no dependa de aquél: su
    razón de ser es leer fichas sin imponer sustrato.
    """
    if not isinstance(subject, str):
        return None
    normalized = ' '.join(subject.split())
    return normalized or None


def citation_index(records, store_path=None, session_id=None):
    """``{str(id): 'TASK-<CAPA>-NNNN'}`` para las fichas cuyo SUJETO casa.

    Devuelve ``{}`` —nunca levanta— cuando el store no existe, no tiene la
    columna, o ninguna ficha casa. Eso es deliberado: un consumidor del tablero
    no debe caerse porque la telemetría falte; publica el ordinal y ya.

    *Métrica:* filas de ``tasks`` de la sesión con ``citation_id`` cuyo sujeto
    normalizado coincide con el de una ficha viva.
    *Ciega a:* un sujeto reencuadrado — si el título cambió, la ficha deja de
    casar y se publica sin cita. Es el desenlace correcto: la alternativa es
    adivinar por ordinal, que es el defecto que este índice existe para evitar.
    """
    path = pathlib.Path(store_path) if store_path else DEFAULT_STORE
    if not path.is_file():
        return {}
    try:
        conn = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    except sqlite3.Error:
        return {}
    try:
        columns = {row[1] for row in conn.execute('PRAGMA table_info(tasks)')}
        if 'citation_id' not in columns:
            return {}
        if session_id:
            rows = conn.execute(
                'SELECT subject, citation_id FROM tasks '
                ' WHERE session_id = ? AND citation_id IS NOT NULL', (session_id,))
        else:
            rows = conn.execute(
                'SELECT subject, citation_id FROM tasks '
                ' WHERE citation_id IS NOT NULL')
        by_subject = {}
        for subject, citation in rows:
            key = _subject_key(subject)
            if key is None:
                continue
            # Un sujeto con DOS citas no desambigua: se descarta en vez de
            # elegir una al azar. Es el mismo criterio que `mint` aplica, y lo
            # que `task_ids duplicados` mide (93 sujetos hoy, TASK-DB-0002).
            by_subject[key] = None if key in by_subject else citation
    except sqlite3.Error:
        return {}
    finally:
        conn.close()
    index = {}
    for record in records:
        key = _subject_key(record.get('subject'))
        citation = by_subject.get(key) if key else None
        if citation:
            index[str(record.get('id'))] = citation
    return index


def format_identity(task_id, citation=None):
    """``#122 (TASK-DOCS-0390)`` — o ``#122`` a secas si no hay cita.

    El ordinal NO se retira: sigue siendo con lo que el board responde, y quien
    lee la salida lo necesita para operarlo. Lo que se añade es la cita que
    sobrevive al reinicio del board.
    """
    return f'#{task_id} ({citation})' if citation else f'#{task_id}'
