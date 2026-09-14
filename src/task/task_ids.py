#!/usr/bin/env python3
"""``TASK-<CAPA>-NNNN`` — el identificador de cita de una tarea.

El prefijo dice el GENERO, no el proyecto
------------------------------------------
Nacio como ``KX-<CAPA>-NNNN`` —«el identificador de cita del proyecto»— con un
solo eje de clasificacion: la capa. El tipo no entraba porque la unica poblacion
citable era ``tasks``.

Corregido 2026-09-04 por decision del ejecutor. Dos razones medidas:

1. **El resto del arbol ya declara el genero en el id.** ``H-DOCS-1039`` dice
   hallazgo, ``ERR-030`` dice error, ``ADR-028`` dice decision, ``SOL-018`` dice
   solicitud. La tarea era el unico artefacto citado cuyo id no decia que era:
   un ``KX-DOCS-0375`` suelto en prosa no se distingue de un hallazgo sin ir a
   buscarlo.
2. **El store ya tiene tres poblaciones mas que van a querer cita** —
   ``agent_sessions`` (897), ``documents`` (5078), ``findings_history`` (1154)—
   y con un namespace sin genero serian indistinguibles entre si.

El cambio **no renumera**: la migracion sustituyo el prefijo conservando capa y
ordinal, asi que ``KX-DOCS-0375`` es hoy ``TASK-DOCS-0375`` — la misma tarea,
el mismo numero. La propiedad 3 (la identidad no cambia) se mantiene.

Y ``KX-`` no aportaba desambiguacion: todo en este arbol es kaupamex.

Por que existe
--------------
El ``#NNN`` que el cliente asigna a una tarea **reinicia por sesion**. Medido
al registrarlo (ERR-024): de los 337 ids de la sesion activa, **332 chocan**
con los de la sesion anterior; solo 5 son inequivocos. Una cita ``#371`` en un
``.rst`` no resuelve contra el tablero — apunta a dos tareas distintas y nada
en el texto dice a cual.

La decision del ejecutor (2026-09-04) es que **el id de cita es nuestro, no del
harness**: este modulo lo acuña, un mapa versionado lo guarda, y el ``#NNN``
queda como asa operativa interna que no se cita nunca en un ``.rst``.

El contrato, en cuatro propiedades
-----------------------------------
1. **La llave natural es ``(session_id, task_id)``**, nunca ``task_id`` solo.
   Es exactamente la colision que el mapa existe para deshacer.
2. **Acuñar es aditivo.** Un par ya presente conserva su id; uno nuevo toma el
   siguiente de su capa. No hay renumeracion, no hay reuso, no hay ventana en
   que el corpus quede roto.
3. **La capa del id se congela al acuñar.** Si ``derivar-capa`` le asigna
   despues una capa a una tarea que nacio sin ella, el id NO cambia: es
   identidad, no clasificacion. Renumerar romperia toda cita ya escrita, y la
   capa viva sigue leyendose en su columna del tablero.
4. **El contador sale del maximo acuñado**, no del conteo de filas. Borrar una
   entrada del mapa no libera su numero.

De ahi se sigue la propiedad que hace reconstruible el acuñado: hacerlo desde
cero sobre las mismas tareas en el mismo orden reparte los mismos ids. El orden
lo fija :func:`refs_from_store`, y reproduce el del renderizador del tablero.

La llave es una COORDENADA DE UN INSTANTE, no una identidad
------------------------------------------------------------
Ampliacion de ERR-024, medida 2026-09-04. Aquel error registro que el ``#NNN``
*reinicia por sesion*, y esa formulacion es correcta e incompleta: dentro de un
mismo ``session_id`` el numero **tambien se renumera** cuando la lista del
cliente se reconstruye. Control directo: la fila ``168b0fdf#995`` del store y el
archivo vivo ``#2`` de esa misma sesion llevan el mismo ``subject``; de los 81
archivos vivos, **0** conservan el ``task_id`` con que el store los registro
bajo ese ``session_id``.

Consecuencia para este modulo: la propiedad 1 sigue siendo la llave correcta
—es la unica que el store expone—, pero **no identifica una tarea a lo largo del
tiempo**. Lo que sostiene el esquema es la propiedad 2: como acuñar es aditivo,
un volcado renumerado **no reescribe** los ids ya acuñados, asi que ninguna cita
publicada se rompe.

El riesgo que queda abierto es el simetrico: si un volcado renumerado se acuña
bajo el **mismo** ``session_id``, la misma tarea recibe DOS ids distintos y las
dos citas resuelven, de modo que nada las delata. Medido al declararlo: **0**
subjects con mas de un ``task_id`` dentro de su sesion y **0** con mas de un
``citation_id``, sobre 1326 filas. No esta impedido — no se ha dado. Su check
es la tarea **#82** («Añadir a task_ids un check de doble citation_id por subject
dentro de una sesion»).

Donde vive el mapa, y por que NO es un archivo aparte
-----------------------------------------------------
En la columna ``tasks.citation_id`` del store, no en un JSON propio. El primer
diseño fue un ``.json`` versionado y estaba mal: el store ya declara la llave
natural en su ``PRIMARY KEY (session_id, task_id)``, asi que un archivo aparte
seria una SEGUNDA fuente de verdad —una diria que tareas hay y otra que id
tienen— y divergirian en cuanto alguien volcara sin acuñar. Es el corolario de
``calibration-verified-numbers.md``: dos copias y ninguna autoridad.

La columna sigue el patron que el store ya usa **cuatro veces**
(``_migrate_tasks_layer_columns``, ``_migrate_tasks_opening_columns``,
``_migrate_documents_series_columns``, ``_migrate_agent_sessions_usage_columns``):
ALTER TABLE mas un comando que la rellena. Lo que un archivo daba y la columna
no —un diff revisable— lo da el **tablero**, que se genera desde el store y se
versiona: su diff muestra que id nacio.

*Metrica:* filas de ``tasks`` con ``citation_id`` no nulo.
*Ciega a:* que la tarea siga existiendo en el cliente — el acuñado es aditivo a
proposito, asi que una cita a una tarea ya borrada del directorio vivo sigue
resolviendo a la fila que la describio. Y ciega al ordinal por encima de 9999,
donde el relleno de cuatro digitos deja de ordenar lexicograficamente.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import re
import sqlite3
import sys

# La resolucion de entorno del proyecto: `env_value` lee primero el proceso y
# despues el `.env` que `THYROX_ENV_FILE` declara. `sys.path` a nivel de modulo
# —no lazy— porque varias suites cargan este archivo con
# `spec_from_file_location`, via por la que su directorio no queda en la ruta
# de busqueda. Es el mismo criterio que `closure_graph.py` ya documenta.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "paths"))
import reach  # noqa: E402

#: Los REPOS del multi-repo donde un trabajo puede aterrizar.
#:
#: EL EJE ES EL REPO, NO LA CAPA DEL PRODUCTO — decidido el 2026-09-07, y es
#: un cambio de significado, no una entrada mas. Los dos ejes coincidian
#: mientras los cinco repos eran las cinco capas; con ``thyrox`` dejan de
#: coincidir, porque es un repo y **no** es una capa del producto: es su
#: PROVEEDOR de metodologia, y los cinco ``kaupamex-*`` son sus consumidores.
#: Es lo mismo que el comentario de la clave ``submodulos:`` en ``CLAUDE.md``
#: ya declara un nivel mas arriba.
#:
#: Lo que gana el eje del repo: se decide **sin juicio**. El repo del commit lo
#: dice, mientras que «¿esto es capa docs?» exige leer el sujeto — medido al
#: decidirlo, un clasificador lexico sobre 477 sujetos se quedo ciego en el
#: 54 %, y de los que si clasifico, el trabajo de proveedor superaba 5:1 al de
#: arbol documental DENTRO de la etiqueta ``DOCS``.
LAYERS = ("api", "db", "docs", "server", "thyrox", "ui")

#: El trabajo que CRUZA repos — no el que no se supo clasificar.
#:
#: Nacio como «sin señal», y con el eje en la capa del producto eso lo
#: convirtio en desague: medido el 2026-09-07, **632 de 1565** citas acuñadas
#: (el 40 %) llevaban ``GEN``, mas que cualquier repo. Un cubo de descarte que
#: resulta ser el mayor del esquema no es una categoria, es la ausencia de una.
#:
#: REDEFINIDO el 2026-09-07 por decision del ejecutor: ``GEN`` nombra el
#: trabajo que **CRUZA repos**, que en un multi-repo es una categoria real y
#: frecuente — un porte que toca thyrox y su consumidor, un barrido de los
#: cinco, una regla que se replica.
#:
#: *Ciega a:* la diferencia entre «cruza» y «no se pudo derivar». Distinguirlas
#: exige el repo del commit, que se conoce DESPUES de acuñar, asi que hoy las
#: dos aterrizan aqui. La ceguera se declara en vez de disimularse; separarlas
#: pide una columna de procedencia —``layer_source``, hermana de
#: ``usage_source`` y ``outcome_source``— que guarde de donde salio la capa y
#: no solo cual es. Sin ella, un ``GEN`` no distingue las dos, que es el
#: sub-patron D aplicado a la propia etiqueta.
#:
#: Las 632 ya acuñadas NO se re-etiquetan: reasignar una cita ya publicada es
#: el deslizamiento de sujeto que ``merge_stores.citation_is_stable`` rehusa.
UNKNOWN_LAYER = "gen"

#: Separador de la llave natural. NUL, no espacio ni guion: un ``session_id``
#: o un ``task_id`` con el separador dentro colapsaria dos llaves distintas en
#: una sola, y NUL no aparece en ninguno de los dos.
KEY_SEP = "\0"

#: La forma canonica. Cuatro digitos con relleno para que el orden
#: lexicografico coincida con el numerico hasta 9999.
ID_RE = re.compile(r"^TASK-[A-Z]+-\d{4}$")

#: Version del formato del mapa. Un lector que encuentre una mayor rehusa en
#: vez de interpretar un esquema que no conoce.
FORMAT_VERSION = 1

#: El store de tareas: donde vive el mapa, en ``tasks.citation_id``.
#:
#: Lo resuelve ``reach.agent_store_path()``, que tiene dos desenlaces y ninguno
#: es un rehuse: la constante ``THYROX_AGENT_STORE`` declarada gana —es el caso
#: del consumidor, cuyo store vive en el clon que despacha— y sin ella el store
#: es de thyrox (``<thyrox>/agent-results/``), **creado bajo demanda e
#: idempotente**.
#:
#: Lo que estaba prohibido no era tener default: era **derivarlo por aritmetica
#: de** ``__file__``. La forma anterior —``parents[2]`` mas ``agent-results/``—
#: describia el arbol de `docs`, donde este guion vivia, y desde
#: ``thyrox/src/task/`` apuntaba a un directorio que nadie creaba nunca. Fallaba
#: **en silencio**: el llamador leia «la ruta no existe» como «no hay tareas».
DEFAULT_STORE_PATH = reach.agent_store_path()


def resolve_store(declared=None):
    """La ruta del store: la pasada, o la declarada, o la de thyrox creada."""
    return pathlib.Path(declared) if declared else DEFAULT_STORE_PATH

#: La variable que declara el hogar del board del cliente. Es el VALOR; la RUTA
#: a su declaracion la aporta ``reach.ENV_FILE_VAR`` (``THYROX_ENV_FILE``), que
#: es el mismo par con que ``THYROX_ROOT`` se resuelve. Va por constante y no
#: en linea porque el hogar del board es un parametro del consumidor: un clon
#: que corra el cliente en otro `HOME` tenia que editar el codigo.
BOARD_ROOT_VAR = "THYROX_BOARD_ROOT"

#: El respaldo, medido en este entorno: el cliente escribe una tarjeta por
#: tarea bajo ``<raiz>/<session_id>/<ordinal>.json``. No es una adivinanza —
#: es donde estan las 220 tarjetas de la sesion viva.
BOARD_ROOT_DEFAULT = "/root/.claude/tasks"


def board_root(start=None) -> pathlib.Path:
    """El hogar del board, por declaracion o por el respaldo medido."""
    declared = reach.env_value(BOARD_ROOT_VAR, start)
    return pathlib.Path(declared or BOARD_ROOT_DEFAULT)


def board_dir(session_id: str, start=None) -> pathlib.Path:
    """El directorio de tarjetas de una sesion."""
    return board_root(start) / session_id


class MappingError(RuntimeError):
    """El mapa existe y no se pudo leer.

    Se levanta en vez de devolver un mapa vacio. Un mapa vacio acuñaria desde
    1 sobre tareas que ya tienen id, y el defecto no se veria hasta que alguien
    siguiera una cita equivocada — el sub-patron D de
    ``metrica-decide-la-conclusion.md`` aplicado a un archivo de identidad.
    """


class TaskRef:
    """La tarea tal como llega a acuñarse: su llave natural y su contexto."""

    __slots__ = ("session_id", "task_id", "layer", "subject")

    def __init__(self, session_id: str, task_id: str,
                 layer: str | None = None, subject: str = "") -> None:
        self.session_id = str(session_id)
        self.task_id = str(task_id)
        self.layer = layer
        self.subject = subject or ""

    @property
    def key(self) -> str:
        return f"{self.session_id}{KEY_SEP}{self.task_id}"

    @property
    def subject_key(self) -> str | None:
        """La llave por SUJETO, o ``None`` cuando el sujeto no puede anclar.

        Existe porque el ``task_id`` **renumera** dentro de su propia sesion
        (ERR-024 ampliado): la llave natural del store es una coordenada de un
        instante, no una identidad. El sujeto si lo es — lo escribe una persona
        y sobrevive al volcado.

        Devuelve ``None`` con sujeto vacio a proposito: un sujeto vacio
        colapsaria en una sola llave a todas las tareas sin titulo, y una
        colision de anclaje es peor que no anclar.
        """
        s = " ".join(self.subject.split())
        return f"{self.session_id}{KEY_SEP}{s}" if s else None

    def normalized_layer(self) -> str:
        """La capa que se congelara en el id, ya normalizada."""
        candidate = (self.layer or "").strip().lower()
        return candidate if candidate in LAYERS else UNKNOWN_LAYER


class Mapping:
    """El mapa ``TASK-<CAPA>-NNNN`` ↔ ``(session_id, task_id)``.

    Guarda **un** diccionario —el directo— y deriva el inverso al cargar o al
    llamar a :meth:`reindex`. Guardar los dos en el archivo abriria la puerta a
    que discrepen, que es la clase de defecto que este modulo existe para
    cerrar un nivel mas arriba.
    """

    def __init__(self, ids: dict | None = None,
                 next_by_layer: dict | None = None) -> None:
        self.ids: dict = dict(ids or {})
        #: Marca de agua por capa — el numero mas alto repartido, mas uno.
        #:
        #: Se DERIVA del maximo presente, y eso solo es correcto porque
        #: ``tasks`` es **append-only**: medido, ``DELETE FROM tasks`` sale 0
        #: veces en todo el arbol, y el unico escritor de filas nuevas es un
        #: ``INSERT … ON CONFLICT DO UPDATE`` que nunca borra. Si esa premisa
        #: dejara de valer, borrar una fila liberaria su numero y una cita ya
        #: escrita apuntaria a otra tarea; el parametro ``next_by_layer``
        #: existe para poder imponer un piso el dia que haga falta.
        self._next: dict = dict(next_by_layer or {})
        self._by_key: dict = {}
        #: ``(session, subject)`` -> lista de identificadores. Lista y no valor:
        #: ver :meth:`reindex`.
        self._by_subject: dict = {}
        self.reindex()

    def reindex(self) -> None:
        """Reconstruye los dos indices inversos; la marca de agua solo SUBE.

        El segundo indice —por sujeto— es lo que ancla el id a la tarea y no a
        su ordinal (#104). Guarda una LISTA y no un identificador: dos tareas
        de la misma sesion pueden compartir titulo, y en ese caso el sujeto no
        desambigua. Colapsarlas en una entrada elegiria una al azar.
        """
        self._by_key = {}
        self._by_subject = {}
        for identifier, record in self.ids.items():
            key = f"{record['session']}{KEY_SEP}{record['task']}"
            self._by_key[key] = identifier
            subject = " ".join((record.get("subject") or "").split())
            if subject:
                sk = f"{record['session']}{KEY_SEP}{subject}"
                self._by_subject.setdefault(sk, []).append(identifier)
            layer, ordinal = _split(identifier)
            # Piso, no valor: una entrada presente obliga a que el siguiente sea
            # mayor, pero nunca hace BAJAR la marca que el archivo ya declaraba.
            if ordinal >= self._next.get(layer, 0):
                self._next[layer] = ordinal + 1

    def next_ordinal(self, layer: str) -> int:
        return self._next.get(layer, 1)


def _now() -> str:
    """El sello ISO 8601 en UTC. Del reloj, nunca de memoria."""
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def _split(identifier: str) -> tuple:
    """``TASK-API-0007`` → ``('api', 7)``."""
    if not ID_RE.match(identifier):
        raise MappingError(f"identificador fuera de la forma canonica: {identifier!r}")
    _, layer, ordinal = identifier.split("-")
    return layer.lower(), int(ordinal)


def format_id(layer: str, ordinal: int) -> str:
    return f"TASK-{layer.upper()}-{ordinal:04d}"


def lookup(mapping: Mapping, session_id: str, task_id: str) -> str | None:
    """El id de cita de un par, o ``None`` si nunca se acuñó."""
    return mapping._by_key.get(f"{session_id}{KEY_SEP}{task_id}")


def mint(mapping: Mapping, refs) -> dict:
    """Acuña lo que falte y devuelve el id de **todas** las referencias dadas.

    Devuelve el id tambien de las que ya lo tenian: quien llama necesita el
    identificador para renderizar, no solo saber cuantos nacieron. El conteo de
    nuevos se obtiene comparando ``len(mapping.ids)`` antes y despues.
    """
    assigned: dict = {}
    #: Los identificadores ya entregados EN ESTA llamada. Un volcado es una
    #: instantanea: cada referencia es una tarea distinta, asi que un mismo id
    #: no puede servir a dos de ellas aunque compartan titulo. Sin esto, dos
    #: tareas homonimas colapsan en una.
    usados: set = set()
    for ref in refs:
        # EL SUJETO MANDA, y el orden de estas consultas ES el arreglo de #104.
        # El par ``(sesion, ordinal)`` es una COORDENADA de un instante: el
        # cliente renumera dentro de su propia sesion, asi que preguntar primero
        # por el ordinal entrega el id del inquilino anterior — que es
        # exactamente H-DOCS-1042 (92 citas reasignadas). El sujeto lo escribe
        # una persona y sobrevive al volcado: es la identidad.
        subject_key = ref.subject_key
        candidatos = [i for i in mapping._by_subject.get(subject_key or "", [])
                      if i not in usados]
        if subject_key is not None and len(candidatos) == 1:
            identifier = candidatos[0]
            record = mapping.ids[identifier]
            # Se re-ancla la llave natural al ordinal de hoy. El id NO cambia:
            # es identidad, no coordenada (propiedad 3 del contrato).
            vieja = f"{record['session']}{KEY_SEP}{record['task']}"
            if vieja != ref.key:
                mapping._by_key.pop(vieja, None)
            record["task"] = ref.task_id
            mapping._by_key[ref.key] = identifier
            usados.add(identifier)
            assigned[ref.key] = identifier
            continue
        if subject_key is not None:
            # Sujeto util y sin candidato unico: se ACUÑA. NO se cae al ordinal
            # — caer ahi es lo que hacia que un ordinal reciclado heredara el id
            # del sujeto anterior. Con dos o mas candidatos tampoco se elige al
            # azar; ese caso lo mide el check de #82.
            pass
        else:
            # Sin sujeto util (vacio) la llave natural es lo unico que queda.
            existing = mapping._by_key.get(ref.key)
            if existing is not None and existing not in usados:
                usados.add(existing)
                assigned[ref.key] = existing
                continue
        layer = ref.normalized_layer()
        ordinal = mapping.next_ordinal(layer)
        identifier = format_id(layer, ordinal)
        mapping.ids[identifier] = {
            "layer": layer,
            "session": ref.session_id,
            "task": ref.task_id,
            "subject": ref.subject,
        }
        mapping._by_key[ref.key] = identifier
        if subject_key is not None:
            mapping._by_subject.setdefault(subject_key, []).append(identifier)
        usados.add(identifier)
        mapping._next[layer] = ordinal + 1
        assigned[ref.key] = identifier
    return assigned


def dumps(mapping: Mapping) -> str:
    """El mapa como texto estable — para comparar dos acuñaciones, no para
    guardarlo.

    El mapa vive en el store; esta funcion existe porque la suite necesita
    decidir si dos acuñaciones dieron el mismo resultado, y comparar dos
    diccionarios de Python no distingue el orden.
    """
    payload = {"version": FORMAT_VERSION, "ids": mapping.ids}
    return json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


# ---------------------------------------------------------------------------
# Adaptador al store. El nucleo de arriba —``Mapping``, ``mint``, ``lookup``—
# no sabe que existe una base de datos, y esa separacion es deliberada: el mapa
# tiene que poder reconstruirse con el JSON y nada mas. Lo unico que el store
# aporta es DE QUE TAREAS hay que acuñar id, y en que orden.
# ---------------------------------------------------------------------------

#: El orden de acuñacion, y por que es este. Reproduce el del renderizador del
#: tablero: sesion por su tarea mas antigua, tarea por su id NUMERICO. Fijarlo
#: es lo que hace reconstruible al mapa — acuñar desde cero las mismas tareas
#: en este orden devuelve los mismos ids. Un ``ORDER BY task_id`` a secas los
#: ordenaria como texto (`10` antes que `2`) y el mapa reconstruido no
#: coincidiria con el versionado.
_STORE_QUERY = """
    SELECT t.session_id, t.task_id, t.submodule, t.subject
      FROM tasks t
      JOIN (SELECT session_id, MIN(created_at) AS primera
              FROM tasks GROUP BY session_id) s
        ON s.session_id = t.session_id
     ORDER BY s.primera, t.session_id
"""


def _numeric_order(task_id: str):
    """``('7',)`` ordena antes que ``('10',)``; lo no numerico va al final."""
    text = str(task_id)
    return (0, int(text), "") if text.isdigit() else (1, 0, text)


def refs_from_store(store_path) -> list:
    """Las tareas del store como :class:`TaskRef`, en el orden de acuñacion.

    Abre en solo lectura: acuñar no escribe en el store. Esa es la mitad que
    evita el conflicto — ``agent_store.sqlite3`` es un binario versionado que
    dos ramas escriben, y un conflicto binario no tiene resolucion textual.
    """
    store_path = pathlib.Path(store_path)
    if not store_path.exists():
        raise MappingError(
            f"no existe el store {store_path}. NO se acuña nada: sin la fuente "
            f"de tareas, un mapa vacio se leeria como «no hay tareas»."
        )
    conn = sqlite3.connect(f"file:{store_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = list(conn.execute(_STORE_QUERY))
    finally:
        conn.close()
    grouped: dict = {}
    order: list = []
    for row in rows:
        if row["session_id"] not in grouped:
            grouped[row["session_id"]] = []
            order.append(row["session_id"])
        grouped[row["session_id"]].append(row)
    refs: list = []
    for session in order:
        for row in sorted(grouped[session], key=lambda r: _numeric_order(r["task_id"])):
            refs.append(TaskRef(session_id=row["session_id"],
                                task_id=row["task_id"],
                                layer=row["submodule"],
                                subject=row["subject"] or ""))
    return refs


def _cmd_acunar(args: argparse.Namespace) -> int:
    """Acuña el id que falte para cada tarea del store. Aditivo, nunca renumera."""
    mapping = mapping_from_store(args.store)
    antes = len(mapping.ids)
    refs = refs_from_store(args.store)
    assignments = mint(mapping, refs)
    nuevos = len(mapping.ids) - antes
    if args.dry_run:
        print(f"acuñar (simulacro): {nuevos} id(es) nuevo(s) sobre {len(refs)} "
              f"tarea(s); el mapa quedaria en {len(mapping.ids)}")
        return 0
    tocadas = persist_to_store(args.store, assignments)
    print(f"acuñar: {nuevos} id(es) nuevo(s) sobre {len(refs)} tarea(s) del "
          f"store ({tocadas} fila(s) escrita(s)); {len(mapping.ids)} id(es) de "
          f"cita en total")
    return 0


def mapping_from_store(store_path) -> Mapping:
    """El mapa ya acuñado, leido de ``tasks.citation_id``.

    Una fila con ``citation_id`` fuera de la forma canonica hace REHUSAR a
    :func:`_split`, y eso es deliberado: seguir acuñando sobre un mapa que no
    se entiende repartiria numeros ya usados. Es el mismo criterio de guard que
    el resto de los gates del proyecto — sin lectura fiable NO se emite conteo.
    """
    store_path = pathlib.Path(store_path)
    if not store_path.exists():
        raise MappingError(
            f"no existe el store {store_path}. NO se acuña nada: sin la fuente "
            f"de tareas, un mapa vacio se leeria como «no hay tareas»."
        )
    conn = sqlite3.connect(f"file:{store_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        columnas = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
        if "citation_id" not in columnas:
            # La columna la crea la migracion del store. Sin ella el mapa esta
            # vacio de verdad — es el primer uso, no un fallo.
            return Mapping()
        rows = list(conn.execute(
            "SELECT session_id, task_id, citation_id, submodule, subject "
            "  FROM tasks WHERE citation_id IS NOT NULL"))
    finally:
        conn.close()
    ids = {}
    for row in rows:
        ids[row["citation_id"]] = {
            "layer": _split(row["citation_id"])[0],
            "session": row["session_id"],
            "task": row["task_id"],
            "subject": row["subject"] or "",
        }
    return Mapping(ids)


def persist_to_store(store_path, assignments: dict) -> int:
    """Escribe en ``tasks.citation_id`` lo que falte. Devuelve cuantas filas toco.

    Es la UNICA escritura de este modulo, y solo asigna donde hoy hay ``NULL``:
    el ``WHERE citation_id IS NULL`` deja fuera lo ya acuñado, asi que ningun
    id existente se puede pisar ni siquiera por error de quien llama.
    """
    conn = sqlite3.connect(pathlib.Path(store_path))
    tocadas = 0
    try:
        for key, identifier in assignments.items():
            session_id, task_id = key.split(KEY_SEP, 1)
            cur = conn.execute(
                "UPDATE tasks SET citation_id = ? "
                " WHERE session_id = ? AND task_id = ? AND citation_id IS NULL",
                (identifier, session_id, task_id))
            tocadas += cur.rowcount
        conn.commit()
    finally:
        conn.close()
    return tocadas


def ingest_board(store_path, board_dir, session_id, ordinals, layer=None) -> list:
    """Trae al store el sujeto de una tarjeta del board que aun no tiene fila.

    El board del cliente numera por ORDINAL de sesion, y ese ordinal se reusa:
    el store recuerda al ocupante anterior, asi que citar ``#122`` en un `.rst`
    puede nombrar hoy un sujeto muerto (:ref:`h-docs-1067`). La reparacion no
    es reasignar el ``citation_id`` viejo —eso destruiria la cita del sujeto
    anterior, que es el daño de :ref:`h-docs-1042`— sino dar al sujeto nuevo
    una fila propia en un ordinal libre, con su cita acuñada.

    Es ADITIVO por construccion: inserta filas nuevas y no toca ninguna
    existente. Devuelve ``(ordinal_board, ordinal_store, cita, sujeto)`` por
    tarjeta acuñada.

    *Metrica:* tarjetas del board cuyo sujeto no aparece en ninguna fila del
    store para esta sesion.
    *Ciega a:* un sujeto que exista en el store con otra redaccion — la
    comparacion es por texto exacto, no por semantica, asi que un reencuadre
    del titulo se acuña como sujeto nuevo.
    """
    store_path = pathlib.Path(store_path)
    board_dir = pathlib.Path(board_dir)
    if not store_path.exists():
        raise MappingError(
            f"no existe el store {store_path}. NO se acuña nada: sin la fuente "
            f"de tareas, un mapa vacio se leeria como «no hay tareas»."
        )
    if not board_dir.is_dir():
        raise MappingError(
            f"no existe el board {board_dir}. NO se acuña nada: sin las "
            f"tarjetas no hay sujeto que anclar, y una fila sin sujeto es "
            f"justo el defecto que este comando repara."
        )
    stamp = _now()
    conn = sqlite3.connect(store_path)
    acunadas = []
    try:
        vistos = {row[0] for row in conn.execute(
            "SELECT subject FROM tasks WHERE session_id = ?", (session_id,))}
        ordinal = int(conn.execute(
            "SELECT MAX(CAST(task_id AS INTEGER)) FROM tasks WHERE session_id = ?",
            (session_id,)).fetchone()[0] or 0)
        for board_id in ordinals:
            card = board_dir / f"{board_id}.json"
            if not card.is_file():
                raise MappingError(
                    f"falta la tarjeta {card}. NO se acuña nada: acuñar la "
                    f"mitad dejaria el lote sin forma de saber cual falto."
                )
            data = json.loads(card.read_text())
            subject = data.get("subject", "")
            if subject in vistos:
                continue
            # La tarjeta del board NO trae capa (medido: sus claves son
            # blockedBy/blocks/description/id/status/subject). `--capa` es una
            # DECLARACION de quien acuña, no una adivinanza del guion; sin
            # ella la fila nace en `gen`, que dice «no se sabe».
            capa = layer or data.get("submodule") or UNKNOWN_LAYER
            capa = capa.lower()
            layer_actual = capa
            if layer_actual not in LAYERS and layer_actual != UNKNOWN_LAYER:
                layer_actual = UNKNOWN_LAYER
            siguiente = conn.execute(
                "SELECT MAX(CAST(substr(citation_id, ?) AS INTEGER)) FROM tasks "
                " WHERE citation_id LIKE ?",
                (len(f"TASK-{layer_actual.upper()}-") + 1,
                 f"TASK-{layer_actual.upper()}-%")
            ).fetchone()[0]
            cita = format_id(layer_actual, int(siguiente or 0) + 1)
            ordinal += 1
            conn.execute(
                "INSERT INTO tasks (task_id, subject, description, status, "
                "  session_id, source, created_at, updated_at, submodule, "
                "  submodule_source, opened_at, opened_at_source, citation_id) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (str(ordinal), subject, data.get("description", ""),
                 data.get("status", "pending"), session_id, "task_ids ingerir-board",
                 stamp, stamp, layer_actual, "acuñado al ingerir el board",
                 stamp, "acuñado al ingerir el board", cita))
            vistos.add(subject)
            acunadas.append((str(board_id), str(ordinal), cita, subject))
        conn.commit()
    finally:
        conn.close()
    return acunadas


def correct_layer(store_path, citation_id: str, layer: str,
                  reason: str) -> tuple[str, str]:
    """Corrige la CAPA de una tarea sin tocar su ``citation_id``.

    Para que existe, y por que la columna y no el id
    -------------------------------------------------
    El eje declarado es **el repo, no la capa del producto** (ver ``LAYERS``),
    y ``gen`` nombra el trabajo que CRUZA repos. Una tarea puede acuñarse con
    la capa equivocada por una razon concreta y frecuente: su sujeto MENCIONA
    un repo en el que el trabajo nunca aterrizo. Medido: ``TASK-API-0395``
    nacio en ``api`` porque su descripcion habla de ``kaupamex-api``, y sus dos
    commits cayeron en ``thyrox`` y en ``docs`` — ninguno en api.

    Lo que se corrige es la COLUMNA. El id es **identidad, no clasificacion**
    (Propiedad 3): renumerarlo romperia toda cita ya escrita, que es justo el
    fallo que el esquema durable existe para no tener. La suite lo exige con
    una asercion propia — sin ella, una version que renumerara pasaria las
    otras dos.

    ``submodule_source`` guarda la RAZON, no solo el valor nuevo: una columna
    que cambia sin decir por que es indistinguible de una que se corrompio.

    Devuelve ``(capa_anterior, capa_nueva)``.
    """
    layer_actual = (layer or "").lower()
    if layer_actual not in LAYERS and layer_actual != UNKNOWN_LAYER:
        raise MappingError(
            f"capa '{layer}' fuera del canon. Las admitidas son "
            f"{', '.join(LAYERS)} y '{UNKNOWN_LAYER}' (el trabajo que cruza "
            f"repos). NO se escribe nada: una capa inventada corrompe el censo "
            f"en silencio.")
    if not (reason or "").strip():
        raise MappingError(
            "falta la razon de la correccion. Una columna que cambia sin decir "
            "por que es indistinguible de una que se corrompio.")
    conn = sqlite3.connect(store_path)
    try:
        fila = conn.execute(
            "SELECT submodule FROM tasks WHERE citation_id = ?",
            (citation_id,)).fetchone()
        if fila is None:
            raise MappingError(
                f"no hay ninguna tarea con la cita {citation_id} en "
                f"{store_path}. NO se escribe nada.")
        previa = fila[0]
        stamp = _now()
        conn.execute(
            "UPDATE tasks SET submodule = ?, submodule_source = ?, "
            "  updated_at = ? WHERE citation_id = ?",
            (layer_actual, f"corregida {stamp}: {reason.strip()}",
             stamp, citation_id))
        conn.commit()
    finally:
        conn.close()
    return previa, layer_actual


def _cmd_corregir_capa(args: argparse.Namespace) -> int:
    previa, nueva = correct_layer(args.store, args.cita, args.capa, args.razon)
    print(f"corregir-capa: {args.cita} {previa} -> {nueva} "
          f"(la cita NO se mueve: es identidad, no clasificacion)")
    return 0


def _cmd_ingerir_board(args: argparse.Namespace) -> int:
    acunadas = ingest_board(args.store, args.board, args.sesion, args.ordinal,
                            layer=args.capa)
    print(f"ingerir-board: {len(acunadas)} cita(s) acuñada(s) "
          f"(alcance medido: {len(args.ordinal)} tarjeta(s) pedida(s))")
    for board_id, store_id, cita, subject in acunadas:
        print(f"  board #{board_id:<5} -> store #{store_id:<6} {cita}  {subject[:52]}")
    return 0


#: Cuanto del sujeto entra en la linea de `cita`. Es presentacion, no dato:
#: quien necesite el sujeto entero lee la fila del store.
SUBJECT_WIDTH = 60


def _normalized(text: str) -> str:
    """El sujeto comparable: sin espacios de sobra. Misma norma que ``subject_key``."""
    return " ".join((text or "").split())


def board_subject_of(board, task_id):
    """El sujeto que la tarjeta ``<ordinal>.json`` declara, con su ESTADO.

    Devuelve ``(state, subject)`` con ``state`` en ``unreachable`` / ``absent``
    / ``present``. Los tres se distinguen a proposito: colapsar «no pude mirar»
    con «mire y no hay tarjeta» haria que la guarda de abajo callara igual en
    los dos casos, y un silencio que significa dos cosas no es evidencia de
    ninguna — el sub-patron D aplicado a la propia guarda.
    """
    if not board:
        return "unreachable", ""
    directory = pathlib.Path(board)
    if not directory.is_dir():
        return "unreachable", ""
    card = directory / f"{task_id}.json"
    if not card.is_file():
        return "absent", ""
    try:
        return "present", json.loads(card.read_text()).get("subject", "")
    except (OSError, ValueError):
        # Una tarjeta ilegible no es una tarjeta ausente: se declara.
        return "unreachable", ""


def _cmd_lookup(args: argparse.Namespace) -> int:
    """El id de cita **y su sujeto**, y REHUSA cuando el numero es ambiguo.

    Imprimia solo el identificador. Un llamador que le pasa un ordinal del
    board recibe una respuesta bien formada sobre OTRA tarea, y sin el sujeto
    no tiene con que notarlo. Medido sobre los cuatro ordinales de un pase:
    2 de 4 coincidian —ordinal y fila comparten numero— y 2 de 4 no. Acertar
    la mitad de las veces es peor que fallar siempre: entrena a confiar.

    Publicar el sujeto era **deteccion**, y exige que el lector compare. El
    defecto reincidio con esa mitigacion ya puesta (:ref:`h-docs-1240`), porque
    la causa no es que falte informacion: es que hay **dos espacios de
    numeracion con la misma forma** ``NNN`` —el ordinal del board y el
    ``task_id`` del store— y este comando esta llaveado en el segundo. Por eso
    ahora no responde cuando los dos existen y nombran sujetos distintos: una
    respuesta correcta-en-su-espacio es indistinguible de la correcta.

    El sujeto va en la MISMA linea que el id, separado por dos espacios, para
    que un consumidor que hace `$(... cita ...)` siga leyendo un solo renglon
    y pueda quedarse con el primer campo si solo quiere el id.
    """
    state, board_subject = board_subject_of(getattr(args, "board", None), args.tarea)
    if state == "unreachable":
        # Se avisa y se responde. Bloquear por no poder mirar dejaria el
        # comando inservible en cualquier clon sin board; callar volveria
        # indistinguible «no hay ambiguedad» de «no la busque».
        print(f"aviso: board no alcanzable ({getattr(args, 'board', None)}); "
              f"no puedo descartar que «{args.tarea}» sea un ordinal del board "
              f"y no un task_id del store.", file=sys.stderr)

    mapping = mapping_from_store(args.store)
    identifier = lookup(mapping, args.sesion, args.tarea)
    if identifier is None:
        print(f"sin id de cita para ({args.sesion}, {args.tarea})", file=sys.stderr)
        if state == "present":
            # El camino de :ref:`h-docs-1236`: la tarjeta existe, la fila no, y
            # la respuesta escueta no dice que hacer — asi que la mano fabrica
            # la cita prefijando el ordinal. Se nombra el sujeto y el comando
            # que la acuña.
            print(f"  el board SI tiene esa tarjeta: «{board_subject[:SUBJECT_WIDTH]}»\n"
                  f"  la cita NO se compone prefijando el ordinal — se acuña:\n"
                  f"    task_ids.py ingerir-board {args.sesion} {args.tarea} "
                  f"--capa <capa>", file=sys.stderr)
        return 1

    record = mapping.ids.get(identifier) or {}
    subject = (record.get("subject") or "").strip()

    if state == "present" and _normalized(board_subject) != _normalized(subject):
        print(f"«{args.tarea}» es ambiguo: nombra una fila del store Y una "
              f"tarjeta del board, y los dos sujetos difieren. NO se publica "
              f"ninguna cita.\n"
              f"  store  task_id {args.tarea}: {identifier}  "
              f"{subject[:SUBJECT_WIDTH]}\n"
              f"  board  ordinal {args.tarea}: {board_subject[:SUBJECT_WIDTH]}\n"
              f"  si lo que se tiene es el ORDINAL, su cita se resuelve por el "
              f"sujeto, no por el numero.", file=sys.stderr)
        return 2

    if subject:
        print(f"{identifier}  {subject[:SUBJECT_WIDTH]}")
    else:
        # Sin sujeto se DICE, no se calla: una linea con solo el id volveria
        # indistinguible «esta tarea no tiene titulo» de «este comando no
        # publica el sujeto», que es el defecto que esta salida cierra.
        print(f"{identifier}  (sin sujeto en el store)")
    return 0


def _cmd_censo(args: argparse.Namespace) -> int:
    """Cuantos ids hay por capa. Publica su denominador, como todo gate."""
    mapping = mapping_from_store(args.store)
    by_layer: dict = {}
    for record in mapping.ids.values():
        by_layer[record["layer"]] = by_layer.get(record["layer"], 0) + 1
    for layer in sorted(by_layer):
        print(f"  {layer:<8} {by_layer[layer]}")
    print(f"total: {len(mapping.ids)} id(es) de cita en {args.store}")
    return 0


def duplicate_citations(store_path) -> list:
    """Sujetos con MAS de un ``citation_id``. El check de ``TASK-DB-0002``.

    Es el defecto en espejo del que el guard de ``snapshot-tareas`` ya impide.
    Aquel vigila que un id no pase a nombrar otro sujeto; este vigila lo
    contrario: que un sujeto no acumule varios ids. Los dos salen de la misma
    causa —la identidad colgaba del ordinal, no del sujeto (:ref:`h-docs-1067`)—
    y por eso ninguno de los dos basta solo.

    Por que hace falta y no es teorico: medido al escribirlo, 93 sujetos tenian
    mas de una cita y uno tenia tres. Un sujeto con tres ids hace que tres
    documentos citen «la misma tarea» sin que nada relacione las tres citas.

    *Metrica:* sujetos distintos de ``tasks`` con mas de un ``citation_id`` no
    nulo, sobre TODO el store.
    *Ciega a:* dos tareas que son la misma cosa con el sujeto redactado
    distinto — eso es juicio de tema y ningun agrupamiento por cadena lo ve.
    """
    store_path = pathlib.Path(store_path)
    if not store_path.exists():
        raise MappingError(
            f"no existe el store {store_path}. NO se emite conteo: un 0 aqui "
            f"se leeria como «no hay duplicados» y significa «no pude medir»."
        )
    conn = sqlite3.connect(f"file:{store_path}?mode=ro", uri=True)
    try:
        columnas = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
        if "citation_id" not in columnas:
            raise MappingError(
                "el store no tiene la columna citation_id. NO se emite conteo."
            )
        rows = list(conn.execute(
            "SELECT subject, COUNT(DISTINCT citation_id) AS n, "
            "       GROUP_CONCAT(DISTINCT citation_id) AS ids "
            "  FROM tasks WHERE citation_id IS NOT NULL AND citation_id != '' "
            " GROUP BY subject HAVING n > 1 ORDER BY n DESC, subject"))
        universo = conn.execute(
            "SELECT COUNT(DISTINCT subject) FROM tasks "
            " WHERE citation_id IS NOT NULL AND citation_id != ''").fetchone()[0]
    finally:
        conn.close()
    return [(r[0], r[1], r[2], universo) for r in rows]


def _cmd_duplicados(args: argparse.Namespace) -> int:
    """Reporta los sujetos con mas de una cita. ``--strict`` sale 1 si hay."""
    filas = duplicate_citations(args.store)
    universo = filas[0][3] if filas else 0
    if not universo:
        conn = sqlite3.connect(f"file:{pathlib.Path(args.store)}?mode=ro", uri=True)
        universo = conn.execute(
            "SELECT COUNT(DISTINCT subject) FROM tasks "
            " WHERE citation_id IS NOT NULL AND citation_id != ''").fetchone()[0]
        conn.close()
    print(f"task_ids duplicados: {len(filas)} sujeto(s) con mas de una cita "
          f"(alcance medido: {universo} sujeto(s) con cita en el store)")
    for subject, n, ids, _ in filas[: args.limite]:
        print(f"  {n}x  {ids}")
        print(f"      {subject[:96]}")
    if len(filas) > args.limite:
        print(f"  … y {len(filas) - args.limite} mas")
    return 1 if (args.strict and filas) else 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--store", default=None)
    sub = parser.add_subparsers(dest="comando", required=True)

    p_lookup = sub.add_parser("cita", help="el TASK-<CAPA>-NNNN de una tarea")
    p_lookup.add_argument("sesion")
    p_lookup.add_argument("tarea")
    p_lookup.add_argument("--board", default=None,
                          help="directorio de tarjetas (default: el de la sesion)")
    p_lookup.set_defaults(func=_cmd_lookup)

    p_censo = sub.add_parser("censo", help="conteo por capa, con su total")
    p_censo.set_defaults(func=_cmd_censo)

    p_dup = sub.add_parser("duplicados",
                           help="sujetos con mas de un citation_id (TASK-DB-0002)")
    p_dup.add_argument("--strict", action="store_true",
                       help="exit 1 si hay algun sujeto con mas de una cita")
    p_dup.add_argument("--limite", type=int, default=10,
                       help="cuantos sujetos listar (default 10)")
    p_dup.set_defaults(func=_cmd_duplicados)

    p_board = sub.add_parser(
        "ingerir-board",
        help="trae al store el sujeto de una tarjeta del board y acuña su cita")
    p_board.add_argument("sesion")
    p_board.add_argument("ordinal", nargs="+",
                         help="ordinal(es) del board a ingerir")
    p_board.add_argument("--capa", default=None, choices=list(LAYERS) + [UNKNOWN_LAYER],
                         help="capa declarada; sin ella la fila nace en «gen»")
    p_board.add_argument("--board", default=None,
                         help="directorio de tarjetas (default: el de la sesion)")
    p_board.set_defaults(func=_cmd_ingerir_board)

    p_capa = sub.add_parser(
        "corregir-capa",
        help="corrige la CAPA de una tarea sin mover su cita")
    p_capa.add_argument("cita", help="el TASK-<CAPA>-NNNN de la tarea")
    p_capa.add_argument("--capa", required=True,
                        help=f"la capa correcta: {', '.join(LAYERS)} o "
                             f"'{UNKNOWN_LAYER}' (cruza repos)")
    p_capa.add_argument("--razon", required=True,
                        help="por que la anterior era incorrecta; queda en "
                             "submodule_source")
    p_capa.set_defaults(func=_cmd_corregir_capa)

    p_acunar = sub.add_parser("acunar", help="acuña el id que falte, desde el store")
    p_acunar.add_argument("--dry-run", action="store_true")
    p_acunar.set_defaults(func=_cmd_acunar)

    args = parser.parse_args(argv)
    args.store = str(resolve_store(args.store))
    if getattr(args, "board", "sentinel") is None:
        args.board = str(board_dir(args.sesion))
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
