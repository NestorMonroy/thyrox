#!/usr/bin/env python3
"""agent_store.py — SQLite embebido local para el manejo de tareas de agentes.

Implementa DEC-03..DEC-10 de la iniciativa ``implementar-base-datos-agentes``
(``source/gestion/pm/docs/iniciativas/implementar-base-datos-agentes/``):
dos piezas, **un solo** archivo SQLite local por repo — ni ``kaupamex_core``
(esa base es de la aplicacion, no de tooling) ni dos archivos separados.

DEC-10 (corrige DEC-04/DEC-05): piece (a) y pieza (b) comparten el MISMO
archivo — ``<repo>/.claude/agent-results/agent_store.sqlite3`` — con dos
tablas. Dos archivos ``.sqlite3`` distintos son dos silos de informacion sin
forma de cruzarlos: ``findings_history.session_id`` referencia
conceptualmente a ``agent_sessions.agent_id``/``session_id``, y esa relacion
solo es consultable (JOIN, FK) si ambas tablas viven en la misma conexion.
Directiva del ejecutor: *"porque creaste diferentes .sqlite3 y no solo una?
si creas varias tienes silos de informacion, y eso esta mal"*.

- Pieza (a) — coordinacion en vivo: roster de sesiones de agente dentro
  del contenedor actual. Tabla ``agent_sessions``.
- Pieza (b) — historial cross-sesion: hallazgos/tareas correlacionables
  entre sesiones, consumidos por la iniciativa KNN. Tabla
  ``findings_history``.

DEC-07 — este SQLite es un INDICE reconstruible, NO la fuente de verdad.
Mismo patron que ``src/core/record/l1-writer.ts:8-9`` de TencentDB Agent
Memory: *"JSONL is the append-only persistent store (source of truth);
VectorStore (SQLite) is the primary retrieval engine"*. Aqui el rol de
JSONL lo cumplen los ``hallazgo-*.rst`` ya versionados en
``source/gestion/pm/**/hallazgos/`` (``hallazgos-documentacion-obligatoria.md``)
— la tabla ``findings_history`` es una copia de conveniencia para
busqueda rapida (y, mas adelante, para KNN), no un lugar donde escribir
contenido que no exista ya en el RST correspondiente. El schema retoma
la forma del ``MemoryRecord`` real de TencentDB (``type``, ``priority``,
``source_message_ids``, ``metadata``, ``sessionKey``) adaptada al
vocabulario ya vigente en este proyecto (``finding_type``,
``severity`` en el vocabulario CRITICA/ALTA/MEDIA/BAJA de
``hallazgos-documentacion-obligatoria.md``, ``source_ref`` para la cita
PROVEN ``file:line``/``repo@hash``).

DEC-04: el MECANISMO (este script) vive fuera de ``.claude/`` de
cualquier repo, en ``kaupamex-docs/scripts/`` — docs es de donde salen
las tareas (``pm_root`` de ``.claude/CLAUDE.md``) y de donde se despachan
los agentes cross-repo. El DATO (el ``.sqlite3`` unico) sigue viviendo
dentro de ``.claude/agent-results/`` de cada repo, pero — a diferencia
del log raw de markdown de ``agent-results-to-docs.md`` — SI se
versiona (DEC-05): solo tiene tareas/hallazgos, sin informacion
sensible que no este ya en ``docs``. El ``.gitignore`` de cada repo
excluye el resto de ``agent-results/`` pero excepciona
``agent_store.sqlite3``.

DEC-06 (identificadores): tablas y columnas SQL en ingles — el codigo
va en ingles, el comentario/docstring va en espanol
(``redaccion-tecnica-es.md``).

El repo objetivo se resuelve por ``--repo {api,db,docs,server,ui}``
(ruta relativa, hermanos de ``kaupamex-docs`` bajo el mismo padre) o por
``--claude-dir <ruta>`` (absoluta, cuando los repos no viven en el layout
estandar de hermanos). Solo stdlib (``sqlite3``): cero dependencias
externas, mismo criterio que D-05 de la iniciativa KNN.
"""

import argparse
import base64
import collections
import hashlib
import json
import os
import re
import sqlite3
import statistics
import subprocess
import sys

# El catálogo de modelos del paquete, leído desde Python (H-DOCS-1008): el USD
# sale de ahí, nunca de un peso fijo. Hermano en este mismo directorio.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import model_catalog  # noqa: E402
except ImportError:  # copiado a otro directorio (así lo cargan varias suites)
    model_catalog = None
import textwrap
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

# `.claude/scripts/` no es un paquete, y tres suites cargan este archivo con
# `spec_from_file_location`: por esa via el directorio NO queda en `sys.path` y
# el import de al lado revienta con ModuleNotFoundError. Es la trampa que
# `convention-naming.md` ya documento —"nacio como ejecutable de una via y a la
# semana tenia test"— asi que el modulo declara su propio directorio antes de
# importar a su vecino. Es un statement a nivel de modulo, no un lazy import.
# El arranque: un módulo siempre sabe su propio directorio, y desde ahí
# `agents_paths` asciende al marcador. Sustituye la aritmética `parents[N]`,
# que contaba niveles del árbol de ORIGEN y quedó rota en la mudanza.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import agents_paths  # noqa: E402  — statement a nivel de módulo tras fijar sys.path
sys.path.insert(0, str(agents_paths.CORPUS_DIR))

from tipos_documentales import (  # noqa: E402  — vocabulario proyectado del canon
    DOCUMENT_TYPES,
    DOCUMENT_TYPE_UNKNOWN,
    document_type as _document_type_projected,
)

SCRIPT_PATH = Path(__file__).resolve()

# El alcance a un repo hermano NO se deriva aqui: lo resuelve ``reach_roots``,
# que es el stub de reexportacion del duenno canonico (``thyrox: src/paths/reach.py``).
# Antes este modulo componia su propia raiz (``DOCS_ROOT.parent``) y su propio
# prefijo (``kaupamex-<repo>``) — dos copias de una verdad que ya vivia en otro
# sitio, y que ningun ``.env`` podia redirigir. Ver H-DOCS-1074.
sys.path.insert(0, str(agents_paths.PATHS_DIR))

import reach_roots  # noqa: E402  — statement a nivel de modulo tras fijar sys.path

VALID_REPOS = reach_roots.REACH_ROOTS

DB_FILENAME = "agent_store.sqlite3"

#: Tablas nucleo — SIEMPRE se crean, sin try/except. Si esto falla (disco
#: lleno, archivo corrupto) el CLI debe abortar con traceback visible: es
#: una herramienta de un solo comando, no un servicio de larga duracion, y
#: quien la invoca (los hooks via ``hook_error_log.run_and_log``) ya trata
#: el fallo del subproceso como no-fatal. No se porta el flag ``degraded``
#: de ``VectorStore`` completo — ese patron existe alla porque el store
#: vive embebido en un plugin que nunca debe tumbar el host; aqui el CLI
#: fallando ruidosamente es el comportamiento correcto.
CORE_SCHEMA = """
CREATE TABLE IF NOT EXISTS agent_sessions (
    agent_id      TEXT PRIMARY KEY,
    subagent_type TEXT NOT NULL,
    session_id    TEXT NOT NULL,
    status        TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
    output_key    TEXT,
    started_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    timeout_at    TEXT
);

CREATE TABLE IF NOT EXISTS findings_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    finding_id    TEXT NOT NULL UNIQUE,
    submodule     TEXT NOT NULL,
    initiative    TEXT NOT NULL,
    finding_type  TEXT NOT NULL DEFAULT 'finding'
                  CHECK(finding_type IN ('finding', 'task', 'decision', 'report')),
    severity      TEXT CHECK(severity IN ('CRITICA', 'ALTA', 'MEDIA', 'BAJA')),
    summary       TEXT NOT NULL,
    content       TEXT NOT NULL,
    source_ref    TEXT,
    metadata_json TEXT,
    session_id    TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

-- Indices sobre columnas que YA se filtran/ordenan en el codigo real (no
-- especulativos): cmd_list_sessions hace
--   "SELECT * FROM agent_sessions WHERE status = ? ORDER BY started_at"
-- sin indice. Adaptado de TencentDB Agent Memory:
-- src/core/store/sqlite.ts:579-588 (idx_l1_type / idx_l1_ts_start), sin
-- portar sus indices compuestos por session_id+updated_time: aqui
-- findings_history no se filtra hoy por submodule/initiative/session_id
-- en ningun cmd_ (solo FTS5 MATCH) — agregar esos indices seria
-- optimizar un acceso que no existe.
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_started_at ON agent_sessions(started_at);

-- Tareas del tablero. El cliente las guarda en
-- ``/root/.claude/tasks/<session_id>/<N>.json`` — efimero al contenedor Y por
-- sesion: cada sesion estrena directorio vacio. Medido 2026-08-18: 442 tareas
-- vivas ahi, y el unico registro versionado describia OTRA sesion con id
-- maximo 57. Es el mismo defecto que ``agent_sessions`` cerro para los
-- subagentes, y se cierra igual: el store es el instrumento durable.
--
-- Tabla propia y no columnas de otra, por lo mismo que
-- ``tdam: MemoryCore/src/metadata/store/sqlite-adapter.ts`` modela cada eje en
-- su tabla: una tarea no es una sesion de agente ni un hallazgo, y mezclarlas
-- obliga a que toda consulta sepa cual es cual.
--
-- ``task_id`` es TEXT, no INTEGER: es como el cliente lo emite ("447"), y
-- convertirlo aqui inventaria un tipo que el origen no tiene.
-- ``active_form`` y ``owner`` admiten NULL porque el cliente NO siempre los
-- emite — medido: activeForm en 327 de 442, owner en 1 de 442. Declararlos
-- NOT NULL habria roto contra el 26% del universo real.
-- La clave es COMPUESTA, y no es un refinamiento: el id de tarea NO es único
-- entre sesiones. Cada sesión estrena su espacio de ids en 1, así que `#5`
-- nombra cosas distintas en cada una — medido en H-DOCS-175 sobre dos stores
-- reales ("Portar los cuatro puentes de portal/signup" vs "Migrate CI workflow
-- from MariaDB to PostgreSQL"). Con `task_id` como PK sola, la segunda sesión
-- BORRA la primera, que es lo contrario de lo que este tablero existe para
-- hacer. Por eso `session_id` es NOT NULL: una fila sin sesión no se puede
-- desambiguar de ninguna otra.
CREATE TABLE IF NOT EXISTS tasks (
    task_id       TEXT NOT NULL,
    subject       TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL,
    active_form   TEXT,
    owner         TEXT,
    blocks_json   TEXT,
    blocked_by_json TEXT,
    session_id    TEXT NOT NULL DEFAULT 'desconocida',
    source        TEXT,
    metadata_json TEXT,
    -- La CAPA de la tarea (api/db/docs/server/ui) y COMO se supo. Son dos
    -- columnas y no una porque el valor sin su procedencia no se puede
    -- auditar: una capa leida del store de hallazgos y otra adivinada por un
    -- token de ruta tienen fuerza distinta, y colapsarlas hace que el triaje
    -- posterior no sepa cual revisar. Mismo criterio con que `outcome_source`
    -- acompana a `retention_level` en agent_sessions.
    --
    -- Por que NO va en el id (`API-042`): eso es exactamente lo que
    -- `H-DOCS-317` prohibe — un dato sustantivo que vive solo en el nombre.
    -- El id sigue siendo un ordinal, y la capa un atributo.
    submodule        TEXT,
    submodule_source TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (session_id, task_id)
);

-- El acceso que existe: "que queda pendiente" y "que hay de esta sesion".
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);

-- El EJE TEMPORAL DEL DOCUMENTO — pieza 2 del factor tiempo (H-DOCS-411,
-- tarea #871). Es una tabla APARTE de `tasks` y no una columna suya porque
-- son dos ejes distintos, y colapsarlos fue el defecto que el ejecutor
-- corrigio: *"son diferentes cosas que requieren tiempo, una son las tareas,
-- otras son los documentos"*. Un plazo de conservacion corre sobre el
-- documento; el ciclo de vida de una tarea no lo fecha.
--
-- Indice reconstruible, no fuente de verdad (DEC-07): lo que manda son los
-- `.rst` versionados de `source/`. Esta tabla existe para que el plazo se
-- pueda CONSULTAR sin recorrer el arbol y el log de git en cada pregunta.
--
-- Las DOS cotas se guardan, no solo la ganadora. Sin ambas, la divergencia
-- entre lo declarado y lo real deja de ser medible en cuanto la fila se
-- escribe — y esa divergencia es exactamente lo que decidio el diseno:
-- medido sobre 664 pares, 623 (94 %) llevan la clave ATRASADA respecto de su
-- commit, con mediana de 56 dias.
CREATE TABLE IF NOT EXISTS documents (
    path              TEXT PRIMARY KEY,
    -- El disparador: la cota MAS TARDIA de las disponibles. Direccion opuesta
    -- a `tasks.opened_at`, que toma la mas temprana — y no por simetria rota
    -- sino porque lo decide el costo del error. Un disparador temprano arranca
    -- el reloj antes de tiempo y el documento se depura ANTES de que su plazo
    -- venza: perdida irreversible. Uno tardio solo cuesta almacenamiento.
    updated_at        TEXT,
    updated_at_source TEXT,
    -- Las dos cotas, siempre, gane la que gane.
    declared_at       TEXT,   -- :fecha_actualizacion: del bloque `.. meta::`
    commit_at         TEXT,   -- ultimo commit que toco el archivo
    -- La UNIDAD de conservacion, en dos niveles. Un catalogo de disposicion no
    -- clasifica archivos sueltos: clasifica SERIES, y ninguno de los cuatro
    -- ejes simples medidos particiona el fondo por si solo (evento
    -- `unidad-de-conservacion-*`). El compuesto si — es ademas la estructura
    -- de dos niveles que la norma ya usa: seccion (la funcion) -> serie (el
    -- tipo documental dentro de esa funcion).
    section           TEXT,   -- primer segmento bajo `source/`
    series            TEXT,   -- `<section>/<tipo>` — la unidad compuesta
    -- El PLAZO no se deriva ni se inventa: declararlo es autoridad archivistica
    -- y no la tiene este guion. Queda NULO hasta que #760 lo resuelva; un
    -- numero puesto aqui por completitud se leeria igual que uno decidido.
    retention_years   INTEGER,
    scanned_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at);
"""

#: Tabla + triggers FTS5 — se crean por separado y con try/except (ver
#: ``_create_fts_schema``). Adaptado de TencentDB Agent Memory:
#: src/core/store/sqlite.ts:743-836, cuyo propio comentario dice
#: "best-effort — gracefully degrade if fts5 is not compiled in": la
#: extension fts5 es una compile-time option de SQLite, no garantizada en
#: todo binario del sistema. Antes de este split, un ``executescript``
#: unico significaba que un SQLite sin fts5 rompia TAMBIEN el registro de
#: sesiones de agente — un fallo de busqueda tumbando coordinacion en vivo,
#: que es un acoplamiento que la propia referencia evita.
FTS_SCHEMA = """
-- Sucesor de DEC-07 (sin DEC nuevo): indice invertido de texto completo
-- sobre findings_history.summary/content, para reemplazar el LIKE (substring,
-- sin ranking) de cmd_search_findings. Tabla de "contenido externo" (no
-- duplica summary/content, solo el indice) — patron documentado en
-- sqlite.org/fts5.html#external_content_tables, adaptado de
-- TencentDB Agent Memory: src/core/store/sqlite.ts:757-825 (FTS5+BM25),
-- sin su tokenizador jieba (corpus aqui es espanol/ingles, no chino).
CREATE VIRTUAL TABLE IF NOT EXISTS findings_fts USING fts5(
    summary,
    content,
    content='findings_history',
    content_rowid='id'
);

-- Los tres triggers mantienen findings_fts sincronizada con cada escritura
-- en findings_history (incluido el UPSERT de cmd_add_finding, que dispara
-- el trigger de UPDATE cuando finding_id ya existe).
CREATE TRIGGER IF NOT EXISTS findings_history_ai AFTER INSERT ON findings_history BEGIN
    INSERT INTO findings_fts(rowid, summary, content) VALUES (new.id, new.summary, new.content);
END;

CREATE TRIGGER IF NOT EXISTS findings_history_ad AFTER DELETE ON findings_history BEGIN
    INSERT INTO findings_fts(findings_fts, rowid, summary, content)
        VALUES('delete', old.id, old.summary, old.content);
END;

CREATE TRIGGER IF NOT EXISTS findings_history_au AFTER UPDATE ON findings_history BEGIN
    INSERT INTO findings_fts(findings_fts, rowid, summary, content)
        VALUES('delete', old.id, old.summary, old.content);
    INSERT INTO findings_fts(rowid, summary, content) VALUES (new.id, new.summary, new.content);
END;
"""

#: Extrae tokens alfanumericos unicode — misma familia de caracteres que el
#: tokenizador ``unicode61`` de FTS5 usa como separador, para que la consulta
#: construida aqui coincida con lo que FTS5 indexo.
_FTS_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def resolve_store_dir(args: argparse.Namespace) -> Path:
    """Resuelve .claude/agent-results/ del repo objetivo.

    --claude-dir manda si se da (ruta absoluta explicita). Si no,
    --repo se resuelve como ../kaupamex-<repo>/.claude/agent-results/
    relativo a este script (layout de hermanos bajo el mismo padre).
    """
    if args.claude_dir:
        store_dir = Path(args.claude_dir).expanduser().resolve()
        if store_dir.name != "agent-results":
            store_dir = store_dir / "agent-results"
        return store_dir

    if args.repo not in VALID_REPOS:
        raise ValueError(f"repo invalido: {args.repo!r} (validos: {VALID_REPOS})")

    repo_root = reach_roots.root(args.repo)
    if not repo_root.is_dir():
        raise FileNotFoundError(
            f"{repo_root} no existe — alcance resuelto por reach_roots.root({args.repo!r})"
        )
    return repo_root / ".claude" / "agent-results"


#: Columnas de costo/uso de ``agent_sessions`` — agregadas via ALTER TABLE
#: (no en CORE_SCHEMA/CREATE TABLE) porque el archivo ya existia en produccion
#: cuando se anadieron: ``CREATE TABLE IF NOT EXISTS`` no altera una tabla
#: ya creada. Ver H-DOCS-168 — el ejecutor senalo que el costo real de un
#: subagente (visible en el bloque ``<usage>`` del harness, p. ej. 301 172
#: tokens de un solo agente de prueba) no se guardaba en ningun lado
#: consultable, solo en la prosa del log crudo que ``save-agent-result.mjs``
#: ya escribe (H-DOCS-135/H-DOCS-136 fijaron ahi la formula: dedup por
#: ``message.id``, ponderado input 1x / cache_creation 1.25x / cache_read
#: 0.1x / output 5x). Este migrado le da esa misma cifra una columna SQL
#: consultable por workflow, en vez de solo texto para humanos.
_SESSION_USAGE_COLUMNS: dict[str, str] = {
    "model": "TEXT",
    #: El ALIAS con que se despachó (``sonnet``), que NO es el modelo. Columna
    #: aparte porque el registro del cliente declara que un alias resuelve a un
    #: identificador distinto por proveedor: ``sonnet`` es ``claude-sonnet-5``
    #: por defecto y ``claude-sonnet-4-5`` en cuatro proveedores
    #: (:ref:`h-docs-220`). Guardar el alias en ``model`` afirmaba una versión
    #: que nadie midió. Los dos son dato: ``model_alias`` dice qué se PIDIÓ,
    #: ``model`` qué SIRVIÓ el turno, y pueden diferir.
    "model_alias": "TEXT",
    "description": "TEXT",
    "turns": "INTEGER",
    "input_tokens": "INTEGER",
    "cache_creation_tokens": "INTEGER",
    "cache_read_tokens": "INTEGER",
    "output_tokens": "INTEGER",
    "equiv_cost": "INTEGER",
    #: QUÉ instrumento midió el bloque de uso de arriba — y su ausencia NO es
    #: un cero. Las cuatro columnas de token nacen NULL, y un consumidor que
    #: sume NULL como 0 no distingue «este agente no gastó» de «nadie midió a
    #: este agente». Medido al declararla (:ref:`h-docs-427`): 356 de 669
    #: filas llevaban las cuatro en NULL y **ninguna** de esas 356 conservaba
    #: su transcript en disco — su costo es irrecuperable, no pendiente.
    #: Misma forma que ``outcome_source`` para el desenlace: la columna guarda
    #: la PROCEDENCIA, no el dato, y por eso puede declarar que no hay dato.
    #: Vocabulario: ``transcript`` (se leyó el JSONL del agente y se sumó su
    #: bloque ``usage``), ``no_medido`` (terminal, sin tokens y sin transcript:
    #: ya no se puede medir), NULL (todavía sin clasificar — el agente puede
    #: seguir vivo, o su transcript seguir en disco). Las dos últimas se
    #: separan a propósito: colapsarlas repite un nivel más abajo el mismo
    #: defecto que esta columna existe para cerrar.
    "usage_source": "TEXT",
    #: Procedencia del TIPO del subagente — hermana de ``usage_source`` y de
    #: ``outcome_source``. Cierra la misma clase de defecto un nivel más
    #: abajo: ``subagent_type`` cae a la cadena ``desconocido`` por dos causas
    #: distintas, y sin esta columna las dos filas quedan idénticas.
    #: Vocabulario: ``payload`` (el payload del hook trajo el tipo),
    #: ``sidecar`` (lo aportó ``agentType`` del ``agent-<id>.meta.json``),
    #: ``vacio_en_origen`` (la clave vino con cadena vacía — es la forma que
    #: el ejecutable construye en ``SubagentStop``: ``agent_type: a ?? ""``),
    #: ``ausente`` (la clave no venía en el payload), NULL (sin clasificar).
    #: Las dos causas del vacío se separan a propósito: el veredicto sobre a
    #: quién corresponde el defecto depende de cuál sea (:ref:`h-docs-481`).
    "type_source": "TEXT",
    #: Profundidad de anidamiento del subagente — viene de ``spawnDepth`` del
    #: sidecar ``agent-<id>.meta.json``. Se guarda porque es la unica senal del
    #: sidecar que describe la POSICION del agente en el arbol de despacho, y
    #: sin ella no se puede preguntar si un agente anidado falla mas que uno
    #: lanzado desde el orquestador. La pregunta queda abierta hasta que haya
    #: profundidades > 1 que medir.
    "spawn_depth": "INTEGER",
    #: --- PROCEDENCIA. Las tres siguientes existen porque el store, no el
    #: filesystem, es el instrumento durable: si la fila no registra CÓMO
    #: llegó el agente, la pregunta deja de ser respondible en cuanto el
    #: directorio de la corrida se recicla, y eso ya pasó (H-DOCS-127).
    #: Adaptado de ``TencentDB Agent Memory:
    #: MemoryCore/src/metadata/store/sqlite-adapter.ts:219`` —
    #: ``meta_participation_logs`` registra la participación como FILA, con
    #: ``source TEXT NOT NULL DEFAULT 'unknown'`` y un ``metadata_json`` de
    #: extensión. Aquí no se declara NOT NULL porque el migrado es aditivo
    #: sobre filas ya escritas; el valor por defecto lo pone quien inserta.
    #: Por qué se registra la vía de captura y no sólo el agente: un agente
    #: que el hook nunca vio y uno que el hook vio y falló son indistinguibles
    #: sin esta columna, y esa indistinción es la que dejó #444 sin cerrar.
    "source": "TEXT",
    #: Enlace a la llamada de herramienta que lo lanzó — ``toolUseId`` del
    #: sidecar. Es la única señal que ata la fila a su origen en el
    #: transcript del padre; sin ella no se puede correlacionar un subagente
    #: con el `Agent` (o el canal) que lo despachó.
    "tool_use_id": "TEXT",
    #: Ranura abierta, en JSON. Evita que cada señal nueva del sidecar
    #: exija una columna: lo que todavía no tiene consumidor se guarda aquí
    #: y se promueve a columna cuando alguien lo consulte.
    "metadata_json": "TEXT",
    #: --- LO QUE EL TITULAR DEL HARNESS MUESTRA Y EL STORE NO GUARDABA.
    #: Directiva del ejecutor 2026-08-19: el harness rotula cada subagente en
    #: vuelo con «24 min · 540k tokens · 90 usos de la herramienta bash», y de
    #: esas tres cifras el store sólo tenía la de tokens. Las otras dos se
    #: derivan del transcript —que ya se lee para el costo— así que no
    #: guardarlas era una pérdida, no una imposibilidad.
    #:
    #: Duración en segundos entre el primer y el último `timestamp` del
    #: transcript. NO se deriva de `updated_at - started_at`: esas dos son
    #: cuándo el STORE vio al agente, no cuánto trabajó — y en una fila que el
    #: hook no cerró son idénticas (H-DOCS-208).
    "duration_s": "INTEGER",
    #: Total de bloques `tool_use` del transcript, y su desglose por nombre de
    #: herramienta en JSON (`{"Bash": 128, "Write": 20, ...}`). El desglose es
    #: lo que permite preguntar qué CLASE de trabajo hizo un agente sin releer
    #: su transcript: 128 Bash y 1 Read es un agente que mide; 20 Write y 1
    #: Bash es uno que escribe.
    "tool_uses_total": "INTEGER",
    "tool_uses_json": "TEXT",
    #: El prompt con el que se lanzó — el primer mensaje de usuario del
    #: transcript. Es la única señal que dice QUÉ SE LE PIDIÓ, y sin ella un
    #: agente caro es un costo sin causa: no se puede preguntar si el gasto lo
    #: explica el encargo o la deriva. Se guarda completo; el transcript que lo
    #: contiene es efímero y la fila no.
    "prompt": "TEXT",
    #: Nivel de retención del trabajo del agente (1-4). Ver
    #: `.claude/rules/niveles-de-retencion.md` — es el eje que distingue
    #: «el resumen suena completo» de «lo persistido se verificó contra el
    #: repo». Lo escribe el reconciliador en 3 o 4 según lo que puede medir;
    #: la promoción a 2 la hace quien verifica, nunca el propio agente.
    "retention_level": "INTEGER",
    #: --- SENALES DE EJECUCION (:ref:`h-docs-222`, 2026-08-20). Las declara el
    #: transcript en cada linea y el recorrido las descartaba sin verlas: el
    #: extractor filtraba por ``type == assistant`` ANTES de mirarlas, y todas
    #: viven en el nivel superior. No son columnas "por si acaso" — cada una
    #: responde una pregunta que hoy esta abierta.
    #:
    #: Los tres ejes que hacen COMPARABLES dos filas. Sin ellos, dos agentes
    #: con el mismo modelo y distinto esfuerzo, build o tier de facturacion se
    #: leen como equivalentes, y #286 pondera dinero sobre esa lectura.
    #: Medido: 29 153 turnos en ``high`` y 6 en ``low``; seis builds del
    #: cliente conviven en el corpus; ``service_tier`` hoy es ``standard`` en
    #: el 100 %, pero es un multiplicador de precio y su constancia describe
    #: este corpus, no el contrato.
    "effort": "TEXT",
    "client_version": "TEXT",
    "service_tier": "TEXT",
    #: --- LA CAUSA DE MUERTE (#600). Un agente que murio por cuota y uno que
    #: murio por contexto se ven identicos en el store — el hueco que
    #: H-DOCS-208 dejo abierto. Medido sobre los 277 transcripts en disco: 16
    #: declaran error de API, y los dos discriminadores posibles
    #: (``apiErrorStatus`` e ``isApiErrorMessage``) dan EXACTAMENTE los mismos
    #: 16, sin exclusivos por ninguno de los dos lados.
    #:
    #: Estas tres NO entran en la lista de ``_ids_incompletos`` del
    #: reconciliador: su ``NULL`` es ausencia LEGITIMA —386 de 402 filas no
    #: murieron por API— y tratarla como deuda haria que el barrido reintente
    #: las filas sanas en cada pase, para siempre.
    #: 429 en 9 agentes (``rate_limit``) y 400 en 7 (``invalid_request``).
    "api_error_status": "INTEGER",
    #: El mensaje literal, ej. "prompt is too long: 204010 tokens > 200000
    #: maximum". Lleva pegado el ``quotaLimits`` completo cuando lo hay: su
    #: ``resetsAt`` es forense del momento, no agregable, y no gana columna.
    "api_error_detail": "TEXT",
    #: El tipo de limite que lo rechazo. Medido: 4 transcripts, todos
    #: ``five_hour``, y los 4 son SUBCONJUNTO de los 16 — no separan agentes
    #: nuevos, refinan el porque de 4 de los 9 que murieron por 429.
    "rate_limit_type": "TEXT",
    #: --- EL CIERRE DEL TURNO (#601). El ULTIMO ``message.stop_reason`` del
    #: transcript: como cerro el agente su ultimo turno. Medido sobre los 277
    #: transcripts: ``tool_use`` 210 · (ninguno) 42 · ``stop_sequence`` 16 ·
    #: ``end_turn`` 9.
    #:
    #: Su valor como discriminador esta medido, y es fuerte: los 16
    #: ``stop_sequence`` son EXACTAMENTE los 16 con ``api_error_status``, sin
    #: exclusivos por ninguno de los dos lados. Son dos instrumentos
    #: independientes —uno dentro de ``message``, otro en el nivel superior—
    #: que coinciden; eso es el control cruzado que
    #: ``metrica-decide-la-conclusion.md`` pide, no una redundancia que sobre.
    #:
    #: SI entra en ``_ids_incompletos``: su ``NULL`` es deuda, no ausencia
    #: legitima. Todo turno cerro de alguna forma; que el transcript no lo
    #: declare (42 de 277) es el instrumento callando, no el hecho faltando.
    "stop_reason": "TEXT",
    #: --- LA COMPACTACION (#601). ``compactMetadata`` vive en el nivel
    #: superior de la linea —medido: 3 eventos alli, 0 dentro de ``message``—,
    #: asi que un recorrido que filtre por ``type == 'assistant'`` primero no
    #: lo ve nunca.
    #:
    #: Las dos van juntas y por eso el conteo NO sobra: ``dropped_tokens`` es
    #: acumulado por el propio cliente, asi que sin saber sobre cuantos eventos
    #: se acumulo, la cifra no se puede leer. Medido: 3 transcripts, 1 evento
    #: cada uno, los tres con ``trigger: auto``.
    #:
    #: NINGUNA de las dos entra en ``_ids_incompletos``: su ``NULL`` es
    #: ausencia legitima —274 de 277 nunca se compactaron—. No hace falta un
    #: canal propio para repararlas porque viajan en el mismo pase que
    #: ``stop_reason``, que si esta en la lista: si una falta, faltan las tres.
    "compactions": "INTEGER",
    "dropped_tokens": "INTEGER",
    #: --- DE DONDE SALIO EL VEREDICTO (#653). Que instrumento decidio el
    #: `status`, y con el, el `retention_level`. Tres valores:
    #:
    #: - ``transcript`` — la firma del rol final, valida SOLO con sidecar
    #:   (canal `Agent`, donde el texto final ES el canal de retorno).
    #: - ``journal``    — el `journal.jsonl` del workflow declaro `result`
    #:   (entrego) o se quedo en `started` (murio sin entregar).
    #: - ``api_error``  — el transcript declara un error de API; gana sobre
    #:   los otros dos porque es evidencia directa, no una firma calibrada.
    #:
    #: Por que gana una columna en vez de vivir en `metadata_json`: sin ella,
    #: `retention_level = 4` no distingue «murio» de «no se pudo saber», y esa
    #: es exactamente la confusion que #653 midio. Con ella, la pregunta
    #: «¿cuantos niveles 4 los decidio un instrumento ciego?» se agrupa.
    "outcome_source": "TEXT",
}


def _migrate_agent_sessions_usage_columns(conn: sqlite3.Connection) -> None:
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(agent_sessions)")}
    for columna, tipo in _SESSION_USAGE_COLUMNS.items():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE agent_sessions ADD COLUMN {columna} {tipo}")
    # Relleno de `usage_source` para las filas escritas ANTES de que la columna
    # existiera. No es una suposición: las cuatro columnas de token sólo las
    # puebla `_extract_usage`, que suma el bloque `usage` del transcript del
    # agente — el hook y el reconciliador la comparten. Una fila con tokens
    # tuvo, necesariamente, un transcript que alguien leyó.
    #
    # Sólo rellena hacia arriba (fila CON tokens -> 'transcript'). La marca
    # inversa —'no_medido'— NO se pone aquí a propósito: exige saber si el
    # transcript sigue en disco, que es lo que separa «todavía no» de «ya no»,
    # y este módulo no mira el filesystem. La pone `reconciliar_store.py`, que
    # sí lo mira. Ver :ref:`h-docs-427`.
    if "usage_source" in {row[1] for row in
                          conn.execute("PRAGMA table_info(agent_sessions)")}:
        con_tokens = " OR ".join(f"{c} IS NOT NULL" for c in
                                 ("input_tokens", "cache_creation_tokens",
                                  "cache_read_tokens", "output_tokens"))
        conn.execute("UPDATE agent_sessions SET usage_source = 'transcript' "
                     f"WHERE usage_source IS NULL AND ({con_tokens})")
    conn.commit()


#: Columnas de capa de ``tasks`` — agregadas via ALTER TABLE por la misma
#: razon que las de costo de ``agent_sessions``: el store ya existia con 851
#: filas cuando se anadieron, y ``CREATE TABLE IF NOT EXISTS`` no altera una
#: tabla existente. Ver ``_migrate_tasks_layer_columns``.
_TASK_LAYER_COLUMNS = {
    "submodule": "TEXT",
    "submodule_source": "TEXT",
}

#: Las cinco capas del multi-repo. Es la misma enumeracion que
#: ``findings_history.submodule`` y que el segmento ``<submodulo>`` de la ruta
#: de un hallazgo, y por eso el cruce entre las dos tablas es directo.
SUBMODULES = ("api", "db", "docs", "server", "ui")

#: Columna del ID DE CITA de ``tasks`` — el ``KX-<CAPA>-NNNN`` estable y
#: global que un ``.rst`` puede citar. Se anade por ALTER TABLE por la misma
#: razon que las de capa y las del eje temporal: el store ya existia poblado.
#:
#: Por que vive AQUI y no en un archivo aparte: la llave natural del mapa ya es
#: el ``PRIMARY KEY (session_id, task_id)`` de esta misma tabla, asi que un
#: JSON propio seria una segunda fuente de verdad —una diria que tareas hay y
#: otra que id tienen— y divergirian en cuanto alguien volcara sin acuñar. Ver
#: :ref:`err-026`, que registra ese diseño y su correccion.
_TASK_CITATION_COLUMNS = {
    "citation_id": "TEXT",
}

#: Columnas del EJE TEMPORAL de ``tasks`` — el "factor tiempo" de la gestion
#: documental (H-DOCS-327, tarea #774). Se anaden por ALTER TABLE por la misma
#: razon que las de capa: el store ya existia poblado cuando se decidieron.
#:
#: ``opened_at`` es una **cota superior**, no la apertura exacta: la tarea
#: existia a mas tardar en ese instante. Solo es exacta cuando
#: ``opened_at_source`` vale ``hook``. Por eso la columna de procedencia no es
#: adorno — sin ella, una cota grosera y una fecha sellada se leen igual.
_TASK_OPENING_COLUMNS = {
    "opened_at": "TEXT",
    "opened_at_source": "TEXT",
}

#: Fuentes de la cota de apertura, de mejor a peor. El orden NO decide cual
#: gana —gana la mas temprana, que es la cota mas ajustada— pero si desempata
#: y documenta que ``hook`` es la unica exacta.
OPENING_SOURCES = ("hook", "ficha-mtime", "git-tablero", "ingestion")

#: Fuentes del disparador documental. `ambas` no es una tercera fuente: es que
#: las dos cotas caen el MISMO DIA, y se distingue porque una coincidencia y
#: una cota unica no son la misma evidencia. Medido: 41 de 664 coinciden.
DOCUMENT_TRIGGER_SOURCES = ("meta-declarada", "ambas", "git-commit")

#: La clave del bloque `.. meta::` que fecha la ultima actualizacion. Admite
#: las dos formas que el arbol usa —`YYYY-MM-DD` y ISO completa— porque las
#: dos existen: quien declara solo el dia no esta afirmando una hora, y por eso
#: la comparacion entre cotas se hace por DIA y no por instante.
_CLAVE_ACTUALIZACION = re.compile(r"^\s*:fecha_actualizacion:\s*(\S+)", re.M)

#: El vocabulario de tipos NO se declara aqui: se importa de
#: `tipos_documentales`, donde cada fila cita la fila del canon de la que se
#: proyecta. Declararlo aqui era vocabulario canonico viviendo en mecanismo,
#: que es el defecto que H-DOCS-414 registro contra DEC-DOC-015.

#: La cita de un hallazgo dentro del texto de una tarea. El prefijo ES la capa
#: — pero solo como respaldo: cuando el hallazgo esta en ``findings_history``,
#: manda su columna ``submodule``, que es lo que el archivo declara. Medido:
#: de 278 tareas cuyo hallazgo citado esta en el store, **5 discrepan** del
#: prefijo (`H-SERVER-16` con submodulo `api`, `H-API-556/557` con `docs`) —
#: la misma incoherencia interna que la tarea #633 tria. Un derivador que
#: leyera solo el prefijo publicaria esas cinco al reves y nada lo delataria.
_CITA_HALLAZGO = re.compile(r"\bH-(API|DOCS|UI|DB|SERVER)-\d+", re.IGNORECASE)

#: Segunda via, mas debil: un token de ruta o de repo que solo una capa usa.
#: Se aplica UNICAMENTE cuando ninguna otra capa aparece en el mismo texto —
#: si hay dos, el texto es ambiguo y la fila se queda sin capa. Preferir el
#: hueco declarado sobre el relleno plausible es lo que hace auditable el
#: resultado: `submodule_source = 'ruta'` marca justo lo que hay que revisar.
_SENALES_DE_RUTA = {
    "api":    (r"\bsrc/", r"\baddons/", r"\borm/", r"\bodoo19c\b", r"\bodoo18[ce]\b",
               r"kaupamex-api", r"\bapi[:@]", r"\bpytest\b", r"\bDRF\b", r"_inherit"),
    "docs":   (r"\bsource/", r"\.rst\b", r"kaupamex-docs", r"\bdocs[:@]",
               r"\.claude/", r"\bhallazgo"),
    "ui":     (r"\bui/", r"kaupamex-ui", r"\bui[:@]", r"\bjest\b", r"\breact\b"),
    "db":     (r"kaupamex-db", r"\bdb[:@]", r"postgres"),
    "server": (r"kaupamex-server", r"\bserver[:@]", r"apache", r"gunicorn"),
}
_SENALES_DE_RUTA = {
    capa: tuple(re.compile(p, re.IGNORECASE) for p in patrones)
    for capa, patrones in _SENALES_DE_RUTA.items()
}


def derive_submodule(subject: str, description: str,
                     findings: dict) -> tuple:
    """La capa de una tarea y la PROCEDENCIA de ese veredicto.

    Devuelve ``(submodule, submodule_source)`` con una de estas cuatro formas,
    en orden de fuerza decreciente:

    ``('api', 'hallazgo_store')``
        La tarea cita un hallazgo que ``findings_history`` conoce; la capa es
        la que ese hallazgo **declara**, no la que su prefijo sugiere.
    ``('api', 'hallazgo_prefijo')``
        Cita un hallazgo ausente del store. El prefijo es lo unico que hay.
    ``('api', 'ruta')``
        No cita hallazgo, pero su texto lleva tokens de **una sola** capa.
        Es la via debil, y por eso se marca distinto.
    ``(None, None)``
        Ni cita ni senal univoca. **El hueco se declara**; no se rellena.

    ``findings`` mapea ``finding_id`` en mayusculas a su ``submodule`` — se
    pasa por parametro, y no se consulta aqui, para que la funcion sea pura y
    un test pueda ejercitarla con un mapa fabricado y con uno vacio.
    """
    texto = f"{subject or ''} {description or ''}"

    cita = _CITA_HALLAZGO.search(texto)
    if cita:
        declarada = findings.get(cita.group(0).upper())
        if declarada:
            return declarada.lower(), "hallazgo_store"
        return cita.group(1).lower(), "hallazgo_prefijo"

    candidatas = {
        capa for capa, patrones in _SENALES_DE_RUTA.items()
        if any(p.search(texto) for p in patrones)
    }
    if len(candidatas) == 1:
        return candidatas.pop(), "ruta"
    return None, None


def _migrate_tasks_layer_columns(conn: sqlite3.Connection) -> None:
    """Anade ``submodule``/``submodule_source`` a un ``tasks`` ya existente.

    Corre DESPUES de ``_migrate_tasks_composite_pk``, que recrea la tabla con
    el esquema viejo: al reves, la recreacion borraria las columnas recien
    puestas y el migrado quedaria en un no-op silencioso.
    """
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
    if not existentes:
        return                      # la tabla aun no existe; CORE_SCHEMA la crea bien
    for columna, tipo in _TASK_LAYER_COLUMNS.items():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE tasks ADD COLUMN {columna} {tipo}")
    conn.commit()


def _migrate_tasks_citation_columns(conn: sqlite3.Connection) -> None:
    """Anade ``citation_id`` a un ``tasks`` ya existente.

    Mismo orden y misma razon que ``_migrate_tasks_layer_columns``: DESPUES de
    la recreacion de la tabla, que si no borraria la columna recien puesta.

    NO declara ``UNIQUE`` en el ALTER: SQLite no admite anadir una restriccion
    de unicidad por ``ALTER TABLE ADD COLUMN``. La unicidad la sostiene el
    indice de abajo, que es la forma que SI se puede anadir a una tabla viva.
    """
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
    if not existentes:
        return                      # la tabla aun no existe; CORE_SCHEMA la crea bien
    for columna, tipo in _TASK_CITATION_COLUMNS.items():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE tasks ADD COLUMN {columna} {tipo}")
    # Parcial: los NULL quedan fuera, asi que la unicidad solo obliga a las
    # filas ya acuñadas. Sin el `WHERE`, N filas sin acuñar chocarian entre si.
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_citation "
                 "ON tasks(citation_id) WHERE citation_id IS NOT NULL")
    conn.commit()


def _migrate_tasks_opening_columns(conn: sqlite3.Connection) -> None:
    """Anade ``opened_at``/``opened_at_source`` a un ``tasks`` ya existente.

    Aditiva y despues de ``_migrate_tasks_composite_pk``, por el mismo motivo
    que ``_migrate_tasks_layer_columns``: la recreacion de la tabla borraria
    las columnas recien puestas y el migrado quedaria en un no-op silencioso.
    """
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(tasks)")}
    if not existentes:
        return
    for columna, tipo in _TASK_OPENING_COLUMNS.items():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE tasks ADD COLUMN {columna} {tipo}")
    conn.commit()


#: Columnas de la UNIDAD de conservacion, aditivas sobre un ``documents`` que
#: ya existe poblado: la pieza 2 (el disparador) se cableo antes que la 3 (la
#: unidad), asi que hay stores en produccion sin ellas.
_DOCUMENT_SERIES_COLUMNS = {
    "section": "TEXT",
    "series": "TEXT",
    "retention_years": "INTEGER",
}


def _migrate_documents_series_columns(conn: sqlite3.Connection) -> None:
    """Anade ``section``/``series``/``retention_years`` a ``documents``.

    Aditiva y sin recreacion: ``documents`` no cambia de clave, asi que aqui no
    aplica la precedencia que ``_migrate_tasks_layer_columns`` tiene que
    respetar. ``retention_years`` se crea vacia y NINGUN comando la escribe —
    ver el comentario del esquema.
    """
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(documents)")}
    if not existentes:
        return                      # la tabla aun no existe; CORE_SCHEMA la crea bien
    for columna, tipo in _DOCUMENT_SERIES_COLUMNS.items():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE documents ADD COLUMN {columna} {tipo}")
    conn.commit()


def _migrate_tasks_composite_pk(conn: sqlite3.Connection) -> None:
    """Lleva ``tasks`` de PK ``task_id`` a PK ``(session_id, task_id)``.

    SQLite no admite ``ALTER TABLE`` para cambiar una clave primaria, así que
    la única vía es recrear y copiar. Se hace aquí y no a mano porque el store
    ya existe en producción con la PK vieja: dejarlo migrar solo es lo que
    ``_migrate_agent_sessions_usage_columns`` ya establece para las columnas.

    Idempotente por la condición de entrada: si ``session_id`` ya forma parte
    de la clave, no hace nada.

    ``COALESCE`` sobre ``session_id`` porque la columna admitía NULL en el
    esquema viejo y la nueva clave no puede tenerlo. Una fila sin sesión se
    agrupa bajo ``'desconocida'`` en vez de abortar el migrado — y queda
    visible como tal, que es lo que ``'desconocido'`` ya hace en
    ``subagent_type``.
    """
    cols = list(conn.execute("PRAGMA table_info(tasks)"))
    if not cols:
        return                      # la tabla aún no existe; CORE_SCHEMA la crea bien
    en_pk = {row[1] for row in cols if row[5]}
    if "session_id" in en_pk:
        return                      # ya migrada

    conn.executescript("""
        CREATE TABLE tasks_migrada (
            task_id       TEXT NOT NULL,
            subject       TEXT NOT NULL,
            description   TEXT,
            status        TEXT NOT NULL,
            active_form   TEXT,
            owner         TEXT,
            blocks_json   TEXT,
            blocked_by_json TEXT,
            session_id    TEXT NOT NULL DEFAULT 'desconocida',
            source        TEXT,
            metadata_json TEXT,
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL,
            PRIMARY KEY (session_id, task_id)
        );
        INSERT INTO tasks_migrada
        SELECT task_id, subject, description, status, active_form, owner,
               blocks_json, blocked_by_json,
               COALESCE(session_id, 'desconocida'),
               source, metadata_json, created_at, updated_at
        FROM tasks;
        DROP TABLE tasks;
        ALTER TABLE tasks_migrada RENAME TO tasks;
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
    """)
    conn.commit()


def connect(store_dir: Path) -> sqlite3.Connection:
    """Abre el store, listo para escribir desde procesos concurrentes.

    ``busy_timeout`` + ``journal_mode=WAL`` — adaptado de
    ``TencentDB Agent Memory: src/core/store/sqlite.ts:416-419``. Real aqui:
    el hook DEC-08 (``register_agent_session.py``) llama a este CLI desde
    sesiones/subagentes concurrentes contra el MISMO archivo; sin
    ``busy_timeout`` un segundo escritor recibe ``database is locked`` en vez
    de esperar unos milisegundos. ``cache_size``/``mmap_size`` de la
    referencia NO se portan: estan calibrados para su store vectorial de
    varios GB, y aqui serian ajuste prematuro sobre un indice local del
    orden de kilobytes.
    """
    store_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(store_dir / DB_FILENAME)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.executescript(CORE_SCHEMA)
    _create_fts_schema(conn)
    _migrate_agent_sessions_usage_columns(conn)
    _migrate_tasks_composite_pk(conn)
    _migrate_tasks_layer_columns(conn)
    _migrate_tasks_opening_columns(conn)
    _migrate_tasks_citation_columns(conn)
    _migrate_documents_series_columns(conn)
    _resync_fts(conn)
    return conn


def _create_fts_schema(conn: sqlite3.Connection) -> None:
    """Crea findings_fts + sus triggers, degradando sin romper el resto.

    Adaptado de TencentDB Agent Memory: src/core/store/sqlite.ts:743-836
    (bloque try/except que aisla la creacion FTS5 del resto del schema,
    seteando ``this.ftsAvailable = false`` en vez de propagar la excepcion).
    fts5 es una opcion de compilacion de SQLite — no garantizada en todo
    binario del sistema. Antes de este aislamiento, un SQLite sin fts5
    tumbaba TAMBIEN ``registrar-sesion``/``actualizar-sesion`` (corrian el
    mismo ``executescript`` que la tabla virtual), acoplando coordinacion
    en vivo a una capacidad opcional de busqueda.
    """
    try:
        conn.executescript(FTS_SCHEMA)
    except sqlite3.OperationalError as error:
        print(
            f"AVISO: FTS5 no disponible en este SQLite ({error}) — "
            "buscar-hallazgos/auto-recall quedan deshabilitados; "
            "registrar-sesion/agregar-hallazgo no se ven afectados.",
            file=sys.stderr,
        )


def fts_available(conn: sqlite3.Connection) -> bool:
    """True si findings_fts existe en ESTA conexion (chequeo en vivo, sin flag).

    Sin estado de instancia que mantener sincronizado (a diferencia del
    ``ftsAvailable`` booleano de la referencia) porque ``connect()`` no
    envuelve la conexion en una clase propia — cada llamador que necesita
    saber si puede buscar consulta ``sqlite_master`` directamente.
    """
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='findings_fts'"
    ).fetchone()
    return row is not None


def _resync_fts(conn: sqlite3.Connection) -> None:
    """Reconstruye findings_fts si quedo desincronizada de findings_history.

    Los triggers AFTER INSERT/UPDATE/DELETE de FTS_SCHEMA mantienen la tabla
    FTS5 al dia en el camino normal (cmd_add_finding, incluido su UPSERT).
    Este chequeo cubre solo el caso residual de un archivo .sqlite3 tocado
    por fuera de este script (p. ej. un INSERT manual via el CLI de
    sqlite3) — dos COUNT(*) por conexion, barato para el tamano de este
    indice local. No-op si fts5 no esta disponible en este binario.
    """
    if not fts_available(conn):
        return
    history_count = conn.execute("SELECT COUNT(*) FROM findings_history").fetchone()[0]
    fts_count = conn.execute("SELECT COUNT(*) FROM findings_fts").fetchone()[0]
    if history_count != fts_count:
        conn.execute("INSERT INTO findings_fts(findings_fts) VALUES('rebuild')")
        conn.commit()


def _fts5_match_query(raw: str) -> str:
    """Traduce texto libre a una consulta FTS5 segura: AND de prefijos.

    Se tokeniza con el mismo criterio que ``unicode61`` (alfanumerico
    unicode) para que la consulta hable el mismo idioma que el indice, y
    cada termino se busca por prefijo (``termino*``) para conservar algo
    de la tolerancia del LIKE que esta funcion reemplaza — sin admitir
    sintaxis FTS5 arbitraria del usuario (comillas sin cerrar, operadores).
    """
    terms = _FTS_TOKEN.findall(raw.lower())
    if not terms:
        raise ValueError("la consulta no tiene ningun termino alfanumerico")
    return " AND ".join(f"{term}*" for term in terms)


#: Stopwords es/en de alta frecuencia — filtradas de la consulta OR de
#: auto-recall (ver ``_fts5_match_query_any``) porque diluyen la consulta:
#: un termino como "que"/"the" matchea casi cualquier hallazgo y arrastra
#: falsos positivos al top del ranking BM25. No aplica a ``_fts5_match_query``
#: (AND): ahi un stopword de mas en la consulta explicita del usuario es
#: intencional y AND ya lo neutraliza.
_STOPWORDS_ES_EN = frozenset(
    "que con para por una uno del las los como pero mas este esta esto eso "
    "the and for with from that this these those was were been being have "
    "has had does did not can will would could should".split()
)


def _fts5_match_query_any(raw: str, max_terms: int = 8) -> str:
    """Traduce texto libre a una consulta FTS5 'floja': OR de prefijos.

    Adaptacion de ``TencentDB Agent Memory: src/core/hooks/auto-recall.ts``
    (busqueda keyword del auto-recall) a nuestro FTS5+BM25 propio. A
    diferencia de ``_fts5_match_query`` (AND, para busqueda intencional del
    operador via ``buscar-hallazgos``), esta es para texto **arbitrario**
    (el prompt completo de un usuario) — un AND de todos los terminos de una
    oracion casi siempre da 0 resultados, porque ningun hallazgo contiene
    las diez palabras exactas de una pregunta en lenguaje natural.

    Cap a ``max_terms`` (los primeros N, en orden de aparicion) para que un
    prompt largo no explote el costo de la consulta OR; descarta terminos
    de 1-2 caracteres (ruido) y stopwords de alta frecuencia.
    """
    seen: list[str] = []
    for term in _FTS_TOKEN.findall(raw.lower()):
        if len(term) < 3 or term in _STOPWORDS_ES_EN or term in seen:
            continue
        seen.append(term)
        if len(seen) >= max_terms:
            break
    if not seen:
        raise ValueError("la consulta no tiene ningun termino util (>=3 chars, no-stopword)")
    return " OR ".join(f"{term}*" for term in seen)


def cmd_init(args: argparse.Namespace) -> None:
    store_dir = resolve_store_dir(args)
    with connect(store_dir):
        pass
    print(f"OK: {store_dir / DB_FILENAME} listo (agent_sessions + findings_history)")


def cmd_register_session(args: argparse.Namespace) -> None:
    """Registra/re-registra una sesion (hook SubagentStart).

    ``status``/``output_key`` en el ``DO UPDATE`` estan protegidos con un
    ``CASE``: si la fila ya esta en un estado terminal (``completed``/
    ``failed``), un ``registrar-sesion`` posterior — p. ej. un
    ``SubagentStart`` que vuelve a disparar al reanudar un agente ya
    terminado via ``SendMessage({to: agentId})``, verificado como capacidad
    real en ``bash-background-tasks.md`` — NO lo regresa a ``running``.
    Sin esta guarda, un segundo registro silenciaria que el agente ya habia
    terminado una vez.

    Es el mismo principio que ``TencentDB Agent Memory:
    src/utils/checkpoint.ts`` resuelve con namespaces separados
    (``runner_states``/``pipeline_states``, ningun escritor toca los campos
    del otro) — aqui NO aplica su mecanismo literal (ese existe porque
    ``checkpoint.json`` es un blob unico que exige leer-modificar-escribir
    el objeto entero; un ``UPDATE ... SET columna = ?`` de SQL ya es
    atomico por columna y nunca toca las que no nombra), pero el principio
    de "un escritor no pisa un campo cuyo dueno semantico es otro evento
    del ciclo de vida" si aplica, y esta fila era la unica donde no se
    cumplia. Ver H-DOCS-163.
    """
    store_dir = resolve_store_dir(args)
    ts = now_iso()
    with connect(store_dir) as conn:
        conn.execute(
            """
            INSERT INTO agent_sessions
                (agent_id, subagent_type, session_id, status,
                 output_key, started_at, updated_at, timeout_at, type_source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(agent_id) DO UPDATE SET
                subagent_type = excluded.subagent_type,
                type_source   = COALESCE(excluded.type_source, agent_sessions.type_source),
                session_id    = excluded.session_id,
                status        = CASE
                                    WHEN agent_sessions.status IN ('completed', 'failed')
                                    THEN agent_sessions.status
                                    ELSE excluded.status
                                END,
                output_key    = CASE
                                    WHEN agent_sessions.status IN ('completed', 'failed')
                                    THEN agent_sessions.output_key
                                    ELSE excluded.output_key
                                END,
                updated_at    = excluded.updated_at,
                timeout_at    = excluded.timeout_at
            """,
            (
                args.agent_id,
                args.subagent_type,
                args.session_id,
                args.status,
                args.output_key,
                ts,
                ts,
                args.timeout_at,
                getattr(args, "type_source", None),
            ),
        )
    print(f"OK: sesion {args.agent_id} registrada ({args.status}) en {store_dir / DB_FILENAME}")


def _asignacion_metadata(args: argparse.Namespace) -> tuple:
    """La fila ``(columna, expresión, valor)`` de ``metadata_json``.

    Dos banderas escriben la misma columna con semánticas opuestas, y en el SET
    sólo cabe una fila por columna: ``--metadata-json`` REEMPLAZA —la forma
    histórica, que la reconciliación usa para el worktree— y
    ``--metadata-merge-json`` FUNDE por clave con ``json_patch``.

    Cuando vienen **las dos**, la fusión se aplica ENCIMA del reemplazo, no en
    lugar de él: el reemplazo fija la base y la fusión añade sus claves. Es la
    única lectura que respeta las dos semánticas a la vez, y la combinación se
    hace aquí en Python porque la fila del SET admite un solo marcador.

    Regresión que lo motiva (:ref:`h-docs-481`): con la fusión ganando, el
    reemplazo se descartaba entero y el sidecar perdía sus claves
    desconocidas. Lo delató `test-agent-store-usage-columns.sh`, que ya cubría
    ese caso — 31 ok antes, 29 ok y 2 fallos después.

    Ante NULL ``json_patch`` devuelve NULL, así que el ``COALESCE`` externo deja
    el valor en su sitio — omitir la bandera no toca la columna.
    """
    reemplazo = args.metadata_json
    fundir = getattr(args, "metadata_merge_json", None)
    if fundir and reemplazo:
        try:
            base = json.loads(reemplazo)
            base.update(json.loads(fundir))
            reemplazo = json.dumps(base)
        except (TypeError, ValueError):
            pass
        else:
            fundir = None
    if fundir:
        return ("metadata_json",
                "COALESCE(json_patch(COALESCE(metadata_json, '{}'), ?), metadata_json)",
                fundir)
    return ("metadata_json", "COALESCE(?, metadata_json)", reemplazo)


def cmd_update_session(args: argparse.Namespace) -> None:
    store_dir = resolve_store_dir(args)
    with connect(store_dir) as conn:
        # --crear-si-falta: el alta puede no haber ocurrido nunca. En este
        # entorno `SubagentStart` no dispara (H-DOCS-167), así que exigir que
        # la fila exista convierte el cierre en un no-op silencioso: el UPDATE
        # da rowcount 0, el hook sale 1, y el agente no queda registrado.
        #
        # Es el patrón que el binario usa al cerrar (`bgDaemon.ts:839-846`):
        # al apagarse fuerza el asentamiento del registro de cada worker con
        # `writeWorkerRecord({...r, status:'killed'})` — escribe el estado
        # final aunque el ciclo de vida no haya pasado por donde debía, y lo
        # hace best-effort. Aquí la fila mínima cumple el NOT NULL del esquema
        # y el UPDATE de abajo la completa con lo que el payload traiga.
        if getattr(args, "crear_si_falta", False):
            ts = now_iso()
            conn.execute(
                "INSERT OR IGNORE INTO agent_sessions "
                "(agent_id, subagent_type, session_id, status, started_at, updated_at) "
                "VALUES (?, ?, ?, 'running', ?, ?)",
                (
                    args.agent_id,
                    args.subagent_type or "desconocido",
                    getattr(args, "session_id", None) or "desconocida",
                    ts,
                    ts,
                ),
            )
        # UNA tabla `(columna, expresión, valor)` alimenta el SET **y** el
        # guard de diferencia. Escribirlos por separado los dejaría driftar:
        # una columna añadida al SET y olvidada en la comparación reintroduce
        # la escritura ciega para ese campo, y nada lo delataría.
        asignaciones = [
            ("status", "?", args.status),
            ("output_key", "COALESCE(?, output_key)", args.output_key),
            ("model", "COALESCE(?, model)", args.model),
            ("model_alias", "COALESCE(?, model_alias)", args.model_alias),
            ("description", "COALESCE(?, description)", args.description),
            ("turns", "COALESCE(?, turns)", args.turns),
            ("input_tokens", "COALESCE(?, input_tokens)", args.input_tokens),
            ("cache_creation_tokens", "COALESCE(?, cache_creation_tokens)",
             args.cache_creation_tokens),
            ("cache_read_tokens", "COALESCE(?, cache_read_tokens)",
             args.cache_read_tokens),
            ("output_tokens", "COALESCE(?, output_tokens)", args.output_tokens),
            ("equiv_cost", "COALESCE(?, equiv_cost)", args.equiv_cost),
            ("usage_source", "COALESCE(?, usage_source)", args.usage_source),
            ("type_source", "COALESCE(?, type_source)", args.type_source),
            ("spawn_depth", "COALESCE(?, spawn_depth)", args.spawn_depth),
            ("source", "COALESCE(?, source)", args.source),
            ("tool_use_id", "COALESCE(?, tool_use_id)", args.tool_use_id),
            # `metadata_json` es la ranura abierta, y por tanto la comparten dos
            # escritores: la reconciliación (worktree) y el hook (la ruta de
            # transcript que el cliente declara, :ref:`h-docs-481`).
            # Reemplazarla entera haría que el segundo borrara al primero sin
            # aviso, así que la fila la decide un ayudante que sabe fundir.
            _asignacion_metadata(args),
            ("duration_s", "COALESCE(?, duration_s)", args.duration_s),
            ("tool_uses_total", "COALESCE(?, tool_uses_total)",
             args.tool_uses_total),
            ("tool_uses_json", "COALESCE(?, tool_uses_json)",
             args.tool_uses_json),
            ("prompt", "COALESCE(?, prompt)", args.prompt),
            ("retention_level", "COALESCE(?, retention_level)",
             args.retention_level),
            ("effort", "COALESCE(?, effort)", args.effort),
            ("client_version", "COALESCE(?, client_version)",
             args.client_version),
            ("service_tier", "COALESCE(?, service_tier)", args.service_tier),
            ("api_error_status", "COALESCE(?, api_error_status)",
             args.api_error_status),
            ("api_error_detail", "COALESCE(?, api_error_detail)",
             args.api_error_detail),
            ("rate_limit_type", "COALESCE(?, rate_limit_type)",
             args.rate_limit_type),
            ("stop_reason", "COALESCE(?, stop_reason)", args.stop_reason),
            ("compactions", "COALESCE(?, compactions)", args.compactions),
            ("dropped_tokens", "COALESCE(?, dropped_tokens)",
             args.dropped_tokens),
            ("outcome_source", "COALESCE(?, outcome_source)",
             args.outcome_source),
            # NULLIF: 'desconocido' es el relleno que pone el alta cuando el
            # sidecar no se pudo leer. Tratarlo como ausente deja que un pase
            # posterior lo rellene sin pisar un tipo ya correcto.
            #
            # El ORDEN de los argumentos es el mecanismo, no un detalle de
            # estilo: COALESCE devuelve el PRIMER no-nulo, así que poner el
            # parámetro delante hace que NULLIF nunca se evalúe y la columna se
            # pise siempre. Medido contra sqlite 3.45.1, las cuatro celdas:
            #
            #   COALESCE(?, NULLIF(t,'desconocido'), t)   'Explore' + 'gp' -> 'gp'      ← pisa
            #   COALESCE(NULLIF(t,'desconocido'), ?, t)   'Explore' + 'gp' -> 'Explore' ← preserva
            #   COALESCE(NULLIF(t,'desconocido'), ?, t)   'desconocido' + 'gp' -> 'gp'  ← rellena
            #   COALESCE(NULLIF(t,'desconocido'), ?, t)   'desconocido' + NULL -> 'desconocido'
            ("subagent_type",
             "COALESCE(NULLIF(subagent_type, 'desconocido'), ?, subagent_type)",
             args.subagent_type),
        ]
        set_sql = ", ".join(f"{col} = {expr}" for col, expr, _ in asignaciones)
        # **Compara antes de escribir.** Sin este `AND (…)` el UPDATE reescribe
        # la fila aunque el resultado sea idéntico, y con ella `updated_at`. El
        # store es un binario versionado: cada arranque dejaba un diff de
        # megabytes que sólo movía un timestamp — medido, 113 filas por sesión,
        # que son las que `reconciliar_store.py` reintenta porque su transcript
        # no tiene el dato que les falta y nunca lo tendrá.
        #
        # `IS NOT` y no `<>` porque la mitad de estas columnas admite NULL y
        # `NULL <> NULL` es NULL, no verdadero: con `<>` una fila con un NULL
        # no compararía ni igual ni distinta, y se saltaría siempre. Es la
        # misma forma que `cmd_snapshot_tasks` ya usa sobre `tasks`.
        dif_sql = " OR ".join(f"{col} IS NOT {expr}"
                              for col, expr, _ in asignaciones)
        valores = [valor for _, _, valor in asignaciones]
        cur = conn.execute(
            f"UPDATE agent_sessions SET {set_sql}, updated_at = ? "
            f"WHERE agent_id = ? AND ({dif_sql})",
            (*valores, now_iso(), args.agent_id, *valores),
        )
        # Y los TRES desenlaces se separan. Con el guard puesto, `rowcount 0`
        # dejó de significar una sola cosa: es «la fila no existe» (error, que
        # es lo que este bloque ya detectaba) o «la fila existe y nada cambió»
        # (correcto, y lo normal). Colapsarlos en un exit 1 haría fallar el
        # camino sano; colapsarlos en un OK escondería la fila ausente. Es el
        # sub-patrón D de `metrica-decide-la-conclusion.md`: un contador para
        # dos desenlaces con conductas opuestas.
        if cur.rowcount:
            print(f"OK: sesion {args.agent_id} -> {args.status} (actualizada)")
        elif conn.execute("SELECT 1 FROM agent_sessions WHERE agent_id = ?",
                          (args.agent_id,)).fetchone():
            print(f"OK: sesion {args.agent_id} -> {args.status} (sin cambios)")
        else:
            print(f"ERROR: agent_id {args.agent_id} no existe en {store_dir / DB_FILENAME}", file=sys.stderr)
            sys.exit(1)


#: Claves del JSON de tarea que tienen columna propia. Lo que NO esté aquí va
#: a ``metadata_json`` — la misma ranura abierta que ``agent_sessions`` ganó en
#: H-DOCS-178, por la misma razón medida: el cliente introdujo ``owner`` en 1 de
#: 442 archivos sin avisar, y la clave siguiente tampoco vendrá anunciada.
_TASK_CONOCIDAS = frozenset(
    ("id", "subject", "description", "status", "activeForm", "owner",
     "blocks", "blockedBy")
)


def citation_reassignments(conn, session: str, tasks_dir: Path) -> list:
    """Las citas que un volcado de ``tasks_dir`` movería a OTRO sujeto.

    Devuelve ``(task_id, citation_id, sujeto_acuñado, sujeto_vivo)`` por cada id
    que acabaría nombrando algo distinto de aquello para lo que se acuñó. Lista
    vacía = volcar es seguro.

    **Vive fuera de las dos que la usan a propósito.** El guard de
    ``snapshot-tareas`` la consulta para REHUSAR y ``render-tablero`` para
    DECLARAR la degradación; si cada una midiera por su cuenta, un tablero podría
    decir «al día» sobre un volcado que el guard acababa de rechazar. Dos
    instrumentos para un mismo fenómeno es cómo se publica un verde que no
    discrimina (sub-patrón D de ``metrica-decide-la-conclusion.md``).

    **Qué mide, corregido en #104.** Medía *«el sujeto vivo en el ordinal N
    difiere del guardado»*, y eso dejó de ser la pregunta cuando el volcado pasó
    a RE-ANCLAR cada cita a la fila que lleva su sujeto: el ordinal cambia en
    cada volcado por construcción, así que esa comparación reportaba 110
    movimientos donde no había ninguno y el tablero llevaba días congelado por un
    falso positivo.

    Hoy simula el desenlace con **el mismo criterio** que
    :func:`_reanclar_citas_por_sujeto` ejecutará después — no con una regla
    paralela. Una cita se mueve cuando su sujeto acuñado NO aparece en
    exactamente una fila viva (sin destino al que seguir) **y** el ordinal donde
    hoy vive pasó a tener otro sujeto. Las dos condiciones a la vez: con destino
    único la cita viaja, y sin cambio de sujeto en su ordinal se queda quieta sin
    perjuicio.

    El sujeto acuñado se lee ANTES de cualquier escritura: una vez empezado el
    upsert, el subject viejo ya no está y la comparación mediría contra sí misma.
    """
    minted = {
        r[0]: (r[1], r[2] or "") for r in conn.execute(
            "SELECT task_id, citation_id, subject FROM tasks "
            " WHERE session_id = ? AND citation_id IS NOT NULL", (session,)
        )
    }
    if not minted:
        return []

    vivos: dict = {}
    for ruta in sorted(tasks_dir.glob("*.json"), key=_numeric_stem):
        try:
            payload = json.loads(ruta.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            continue            # un archivo a medio escribir lo cuenta el volcado
        vivos[str(payload.get("id") or ruta.stem)] = payload.get("subject") or ""

    # El índice por sujeto del árbol VIVO: a dónde puede viajar cada cita.
    destinos: dict = {}
    for tid, subject in vivos.items():
        destinos.setdefault(" ".join(subject.split()), []).append(tid)

    movidas = []
    for tid, (citation, sujeto_acunado) in minted.items():
        clave = " ".join(sujeto_acunado.split())
        if len(destinos.get(clave, [])) == 1:
            continue                    # tiene destino único: se re-ancla, no se mueve
        vivo = vivos.get(tid)
        if vivo is None:
            continue                    # su ordinal ya no existe: la fila no se toca
        if " ".join(vivo.split()) != clave:
            movidas.append((tid, citation, sujeto_acunado, vivo))
    return movidas


def _numeric_stem(ruta: Path):
    """Orden numérico del nombre de archivo, con el texto como desempate.

    El acuñado es sensible al orden —reparte ordinales según llegan— así que la
    simulación del guard tiene que recorrer el directorio en el MISMO orden que
    el volcado. Ordenar por el nombre en texto pone ``#10`` antes que ``#2``.
    """
    try:
        return (0, int(ruta.stem), "")
    except ValueError:
        return (1, 0, ruta.stem)


def _reanchor_citations_by_subject(conn, session: str, citas_antes: dict) -> int:
    """Mueve cada ``citation_id`` a la fila que hoy lleva SU sujeto (#104).

    El upsert de ``snapshot-tareas`` escribe por ``(session_id, task_id)``, y el
    cliente renumera: sin este paso, la fila del ordinal 1 recibe el sujeto de
    otra tarea y **conserva** el ``citation_id`` que se acuñó para el anterior.
    Ésa es la reasignación de H-DOCS-1042, y ocurre en la fila aunque el acuñado
    ya ancle por sujeto — porque el ancla del acuñado vive en el mapa y el mapa
    LEE la fila.

    Sólo mueve lo que puede decidir: un sujeto que hoy aparece en **exactamente
    una** fila de la sesión. Con cero (la tarea se borró del cliente) la cita se
    queda donde está, que es la ceguera ya declarada del contrato —una cita a
    una tarea borrada sigue resolviendo a la fila que la describió—; con dos o
    más el sujeto no desambigua y elegir sería inventar, que es el caso que el
    check de #82 mide.

    Devuelve cuántas se movieron. Cero es el estado normal.
    """
    if not citas_antes:
        return 0
    by_subject: dict = {}
    for task_id, subject in conn.execute(
        "SELECT task_id, subject FROM tasks WHERE session_id = ?", (session,)
    ):
        by_subject.setdefault(" ".join((subject or "").split()), []).append(task_id)

    movidas = 0
    for citation, sujeto_acunado in citas_antes.items():
        destinos = by_subject.get(" ".join(sujeto_acunado.split()), [])
        if len(destinos) != 1:
            continue
        destino = destinos[0]
        actual = conn.execute(
            "SELECT task_id FROM tasks WHERE session_id = ? AND citation_id = ?",
            (session, citation)).fetchone()
        if actual and actual[0] == destino:
            continue                    # ya está donde debe: nada que mover
        # Se libera antes de asignar: la columna es única por sesión de hecho, y
        # dos filas con la misma cita es peor que ninguna.
        conn.execute("UPDATE tasks SET citation_id = NULL "
                     " WHERE session_id = ? AND citation_id = ?", (session, citation))
        conn.execute("UPDATE tasks SET citation_id = ? "
                     " WHERE session_id = ? AND task_id = ?", (citation, session, destino))
        movidas += 1
    return movidas


def cmd_snapshot_tasks(args: argparse.Namespace) -> None:
    """Vuelca un directorio de tareas del cliente a la tabla ``tasks``.

    Idempotente por ``UPSERT``: re-correrlo no duplica, y un cambio de estado sí
    se refleja. ``created_at`` se preserva en el conflicto — de otro modo cada
    snapshot reescribiría la fecha de alta y la columna mediría «último
    snapshot», no «cuándo apareció la tarea».

    **Compara antes de escribir.** El ``DO UPDATE`` lleva un ``WHERE`` que exige
    que alguna columna mutable difiera de verdad; sin él, ``updated_at`` se movía
    en las 702 filas en cada ejecución aunque ninguna hubiera cambiado, y el
    store es un binario versionado: cada Stop dejaba un diff de megabytes que
    sólo movía un timestamp. Es el mismo defecto que ``reconciliar_store.py``
    tiene sobre ``agent_sessions`` (:ref:`h-docs-277`, tarea #705).

    **Y el resumen separa los tres desenlaces.** Decir «702 tareas» tanto si se
    dieron de alta como si sólo se tocaron es el sub-patrón D de
    ``metrica-decide-la-conclusion.md``: un contador para dos sucesos con
    conductas opuestas, que es precisamente lo que hizo invisible el churn
    durante un día entero.

    Un directorio ausente NO es un error: sale 0 informando 0 tareas. El guion
    puede correr en una sesión que aún no creó ninguna, y hacerlo fallar ahí
    convertiría un estado normal en ruido.
    """
    tasks_dir = Path(args.tasks_dir).expanduser()
    store_dir = resolve_store_dir(args)
    if not tasks_dir.is_dir():
        print(f"snapshot-tareas: 0 tareas (no existe {tasks_dir})")
        return

    # El directorio ES la sesión: el cliente lo nombra con el session_id. Si
    # nadie lo pasa, derivarlo del nombre es más fiel que un relleno, y la
    # columna no admite NULL desde que la clave es compuesta.
    sesion = args.session_id or tasks_dir.name or "desconocida"
    ahora = now_iso()
    #: Sólo el hook PostToolUse vuelca a segundos del TaskCreate. Ver la
    #: nota junto a las dos columnas en el INSERT.
    sella_apertura = (args.source or "").startswith("hook-post-tool")
    nuevas = 0
    actualizadas = 0
    sin_cambio = 0
    ilegibles = 0
    with connect(store_dir) as conn:
        # Una sola consulta para saber qué es alta y qué es actualización. La
        # alternativa —un SELECT por ficha— multiplicaría por 702 el costo del
        # hook de cierre para responder algo que cabe en un set.
        existentes = {
            r[0] for r in conn.execute(
                "SELECT task_id FROM tasks WHERE session_id = ?", (sesion,)
            )
        }
        # ------------------------------------------------------------------
        # Guard de reasignación de cita (H-DOCS-1042).
        #
        # El `citation_id` cuelga de (session_id, task_id) y el `subject` es
        # MUTABLE bajo él: el upsert de abajo lo reescribe sin tocar la cita.
        # Volcar un directorio vivo sobre una sesión que ya tiene otras filas
        # con los mismos ordinales no mueve el id — mueve el SUJETO debajo, y
        # `TASK-API-0001` pasa a nombrar otra cosa sin que nada falle.
        #
        # Medido el 2026-09-05: 92 de 93 tareas vivas cargaban un sujeto
        # distinto del que el store tenía bajo el mismo ordinal.
        #
        # Se mide ANTES de escribir nada y se rehúsa el volcado ENTERO: un
        # volcado a medias deja unas citas movidas y otras no, que es peor que
        # ninguno porque no se sabe cuáles.
        # La foto de qué sujeto nombraba cada cita ANTES de tocar nada. Es lo
        # único que permite re-anclarla después: el upsert sobreescribe el
        # `subject` de la fila, así que una vez escrito ya no se puede saber
        # para qué se acuñó el id (el mapa no guarda copia — lo lee de la fila).
        citas_antes = {
            r[0]: (r[1] or "") for r in conn.execute(
                "SELECT citation_id, subject FROM tasks "
                " WHERE session_id = ? AND citation_id IS NOT NULL", (sesion,))
        }
        reassignments = citation_reassignments(conn, sesion, tasks_dir)

        if reassignments and not getattr(args, "allow_reassignment", False):
            print(
                f"snapshot-tareas: REHÚSA — {len(reassignments)} id(s) de cita "
                f"cambiarían de sujeto en la sesión {sesion}",
                file=sys.stderr)
            for tid, citation, old_subject, new_subject in reassignments[:5]:
                print(f"  tarea {tid}: {citation}\n"
                      f"      store: {old_subject[:60]}\n"
                      f"      vivo : {new_subject[:60]}", file=sys.stderr)
            if len(reassignments) > 5:
                print(f"  … y {len(reassignments) - 5} más", file=sys.stderr)
            print(
                "  NO se escribe nada. El id cuelga del ordinal, no del sujeto "
                "(H-DOCS-1042). El re-anclaje al sujeto lo lleva TASK-API-0056, "
                "que sigue abierta; TASK-API-0050 entregó la DETECCIÓN y su "
                "mitad de re-anclaje quedó absorbida ahí.\n"
                "  Para volcar a sabiendas: --permitir-reasignacion",
                file=sys.stderr)
            raise SystemExit(4)
        # ------------------------------------------------------------------
        for ruta in sorted(tasks_dir.glob("*.json")):
            try:
                d = json.loads(ruta.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError, UnicodeDecodeError):
                # Un archivo a medio escribir no debe abortar el snapshot de los
                # otros 441. Se cuenta y se reporta; callarlo publicaría un
                # conteo que se lee como completo.
                #
                # El `except` nombra sus tres errores y NO es `Exception`: la
                # primera versión sí lo era, y al faltar `import json` capturó el
                # `NameError` y lo publicó como «1 ilegibles» sobre un archivo
                # perfectamente válido. Un except ancho no protege el flujo:
                # convierte un defecto del guion en un dato del reporte.
                ilegibles += 1
                continue
            task_id = str(d.get("id") or ruta.stem)
            extra = {k: v for k, v in d.items() if k not in _TASK_CONOCIDAS}
            antes = conn.total_changes
            conn.execute(
                "INSERT INTO tasks (task_id, subject, description, status, "
                "active_form, owner, blocks_json, blocked_by_json, session_id, "
                "source, metadata_json, created_at, updated_at, "
                "opened_at, opened_at_source) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) "
                # El conflicto es sobre la clave COMPUESTA: dos sesiones con la
                # misma tarea "447" son dos filas, no una que se pisa (H-DOCS-175).
                "ON CONFLICT(session_id, task_id) DO UPDATE SET "
                "  subject = excluded.subject, "
                "  description = excluded.description, "
                "  status = excluded.status, "
                "  active_form = excluded.active_form, "
                "  owner = excluded.owner, "
                "  blocks_json = excluded.blocks_json, "
                "  blocked_by_json = excluded.blocked_by_json, "
                "  source = excluded.source, "
                "  metadata_json = excluded.metadata_json, "
                "  updated_at = excluded.updated_at "
                # Sin este WHERE la fila se reescribe aunque sea idéntica, y con
                # ella `updated_at`. `IS NOT` y no `<>` porque la mitad de estas
                # columnas admite NULL y `NULL <> NULL` es NULL, no verdadero:
                # con `<>` una fila con description nula nunca compararía como
                # cambiada ni como igual — se saltaría siempre.
                "WHERE tasks.subject          IS NOT excluded.subject "
                "   OR tasks.description      IS NOT excluded.description "
                "   OR tasks.status           IS NOT excluded.status "
                "   OR tasks.active_form      IS NOT excluded.active_form "
                "   OR tasks.owner            IS NOT excluded.owner "
                "   OR tasks.blocks_json      IS NOT excluded.blocks_json "
                "   OR tasks.blocked_by_json  IS NOT excluded.blocked_by_json "
                # `source` NO entra en la comparación, y es deliberado
                # (:ref:`h-docs-279`): describe QUIÉN escribió la fila, no QUÉ
                # dice la tarea. Con él dentro, dos llamadores legítimos con
                # procedencias distintas se pisan y reescriben la tabla entera
                # en cada turno — medido: 702 filas por un turno que editó dos
                # tareas. Sigue actualizándose arriba cuando el contenido SÍ
                # cambia, así que no queda caduco; lo que deja de hacer es
                # provocar una escritura por sí solo.
                "   OR tasks.metadata_json    IS NOT excluded.metadata_json",
                (
                    task_id,
                    d.get("subject") or "",
                    d.get("description"),
                    d.get("status") or "pending",
                    d.get("activeForm"),
                    d.get("owner"),
                    json.dumps(d.get("blocks", []), ensure_ascii=False),
                    json.dumps(d.get("blockedBy", []), ensure_ascii=False),
                    sesion,
                    args.source,
                    json.dumps(extra, ensure_ascii=False) if extra else None,
                    ahora, ahora,
                    # El sellado de la apertura EXACTA (H-DOCS-327, #774). Sólo
                    # cuando el volcado viene del hook PostToolUse: entonces
                    # `ahora` está a segundos del TaskCreate y ES la apertura.
                    #
                    # Un volcado de reconciliación corre el mismo INSERT sobre
                    # fichas viejas —medido: 525 en un solo día del 2026-08-18—
                    # y ahí `ahora` es la INGESTIÓN, que es exactamente el
                    # defecto que `created_at` ya tiene. Por eso discrimina el
                    # `--source` y no la novedad de la fila.
                    ahora if sella_apertura else None,
                    "hook" if sella_apertura else None,
                ),
            )
            if task_id not in existentes:
                nuevas += 1
            elif conn.total_changes > antes:
                actualizadas += 1
            else:
                sin_cambio += 1
        reancladas = _reanchor_citations_by_subject(conn, sesion, citas_antes)
        conn.commit()
    aviso = f", {ilegibles} ilegibles" if ilegibles else ""
    if reancladas:
        aviso += f", {reancladas} cita(s) re-ancladas a su sujeto"
    print(
        f"snapshot-tareas: {nuevas} nuevas · {actualizadas} actualizadas · "
        f"{sin_cambio} sin cambio (origen: {tasks_dir}{aviso})"
    )


def cota_ficha(tasks_dir: Path) -> dict:
    """``mtime`` de la ficha viva del cliente — la cota que gana en el 82 %.

    ``~/.claude/tasks/<sesion>/<N>.json`` es efimero al contenedor, pero
    mientras vive lleva un ``mtime`` que precede a la ingestion del store en
    quince dias (medido: minimo 2026-08-03 contra 2026-08-18).

    *Metrica:* ``st_mtime`` del archivo.
    *Ciega a:* la apertura de una tarea que se toco despues — ``mtime`` es
    ULTIMA MODIFICACION. Medido: las ``pending`` invierten el orden del id un
    8 % y las ``completed`` un 30 %, que es la firma de un toque posterior.
    Por eso es cota superior y no fecha, y por eso compite con las otras dos
    en vez de mandar.
    """
    cotas = {}
    if not tasks_dir or not tasks_dir.is_dir():
        return cotas
    for ficha in tasks_dir.glob("*.json"):
        try:
            marca = datetime.fromtimestamp(ficha.stat().st_mtime)
        except OSError:
            continue
        cotas[ficha.stem] = marca.strftime("%Y-%m-%dT%H:%M:%S")
    return cotas


#: La fila de una tarea en el tablero versionado. Anclada al inicio de linea y
#: al final: sin el ancla, ``* - 1`` matchea dentro de ``* - 100`` y las 864
#: tareas colapsan al primer commit — medido al construir esta pieza.
_FILA_TABLERO = re.compile(r"^   \* - (\d+)\s*$", re.M)

#: Ruta del tablero DENTRO del repo. Es dato del proyecto, no del mecanismo;
#: vive aqui porque el comando la necesita para preguntarle a git.
RUTA_TABLERO = "source/gestion/pm/reportes/tablero-de-tareas.rst"


def cota_tablero(repo: Path, ruta: str = RUTA_TABLERO) -> dict:
    """Primer commit del tablero donde aparece la fila de la tarea.

    Recorre los commits del archivo en orden y se queda con la fecha del
    primero que lista cada id. Es la unica cota **verificable por un tercero**:
    el commit esta firmado y fechado, y su contenido es auditable.

    *Metrica:* ``git log --reverse`` sobre el tablero, leyendo cada version.
    *Ciega a:* toda tarea anterior al primer commit del tablero — les asigna
    esa fecha, que es una cota grosera, no su apertura. Y ciega a un tablero
    que nunca se commiteo.
    """
    cotas = {}
    if not repo or not (repo / ".git").exists():
        return cotas
    log = subprocess.run(
        ["git", "-C", str(repo), "log", "--reverse", "--format=%H %ad",
         "--date=format:%Y-%m-%dT%H:%M:%S", "--", ruta],
        capture_output=True, text=True,
    ).stdout
    for linea in log.splitlines():
        if not linea.strip():
            continue
        commit, _, fecha = linea.partition(" ")
        version = subprocess.run(
            ["git", "-C", str(repo), "show", f"{commit}:{ruta}"],
            capture_output=True, text=True,
        ).stdout
        for identificador in _FILA_TABLERO.findall(version):
            cotas.setdefault(identificador, fecha)
    return cotas


def cmd_date_opening(args: argparse.Namespace) -> None:
    """Puebla ``opened_at`` con la cota superior mas temprana disponible.

    **No inventa la apertura: la acota.** H-DOCS-327 midio que la fecha no
    existe en ninguna columna y declaro ciega una fuente plausible sin medir.
    Medidas las tres, la cota correcta es su MINIMO — la mas temprana es la
    mas ajustada, y tomar cualquier otra afloja el limite sin ganar nada.

    La fuente ``hook`` no se pisa NUNCA: sella el instante real de creacion y
    una cota jamas mejora una fecha exacta.

    Una tarea sin ninguna fuente queda en NULL. Rellenarla con algo la haria
    indistinguible de una fechada, que es el sub-patron D de
    ``metrica-decide-la-conclusion.md`` aplicado a una columna.
    """
    store_dir = resolve_store_dir(args)
    tasks_dir = Path(args.tasks_dir).expanduser() if args.tasks_dir else None
    repo = Path(args.repo_tablero).expanduser() if args.repo_tablero else None
    por_ficha = cota_ficha(tasks_dir) if tasks_dir else {}
    por_tablero = cota_tablero(repo, args.ruta_tablero) if repo else {}
    puestas = collections.Counter()
    intactas = conservadas = sin_fuente = 0
    with connect(store_dir) as conn:
        filas = conn.execute(
            "SELECT session_id, task_id, created_at, opened_at, opened_at_source "
            "FROM tasks"
        ).fetchall()
        universo = len(filas)
        for fila in filas:
            identificador = fila["task_id"]
            if fila["opened_at_source"] == "hook":
                conservadas += 1
                continue
            if fila["opened_at"] and not args.reescribir:
                intactas += 1
                continue
            candidatas = {
                "ficha-mtime": por_ficha.get(identificador),
                "git-tablero": por_tablero.get(identificador),
                "ingestion": fila["created_at"] or None,
            }
            candidatas = {k: v for k, v in candidatas.items() if v}
            if not candidatas:
                sin_fuente += 1
                continue
            fuente = min(candidatas, key=lambda k: (candidatas[k],
                                                    OPENING_SOURCES.index(k)))
            puestas[fuente] += 1
            if not args.dry_run:
                # La PK es (session_id, task_id): un mismo id vive en varias
                # sesiones. Resolver la sesion con un subselect actualiza UNA de
                # las filas y deja la otra en NULL — medido en el store real, 6
                # filas huerfanas junto a un "0 sin ninguna fuente" que las
                # contradecia. La fila ya trae su session_id; se usa esa.
                conn.execute(
                    "UPDATE tasks SET opened_at = ?, opened_at_source = ? "
                    "WHERE session_id = ? AND task_id = ?",
                    (candidatas[fuente], fuente, fila["session_id"], identificador),
                )
        if not args.dry_run:
            conn.commit()
    seco = " (dry-run: NO se escribio)" if args.dry_run else ""
    desglose = " · ".join(f"{f}: {n}" for f, n in sorted(puestas.items())) or "ninguna"
    print(
        f"fechar-apertura: {sum(puestas.values())} fechada(s) [{desglose}] · "
        f"{intactas} ya tenian · {conservadas} selladas por hook · "
        f"{sin_fuente} sin ninguna fuente"
        f" (alcance medido: {universo} tarea(s) en {store_dir / DB_FILENAME}){seco}"
    )


def _parse_declared_date(texto: str):
    """La `:fecha_actualizacion:` declarada, o ``None`` si no la hay.

    Devuelve ``(crudo, dia)`` — el valor tal cual se escribio y su fecha
    normalizada a dia, que es la resolucion a la que se comparan las cotas.
    Una clave ilegible se trata como ausente y NO como fecha cero: inventar un
    valor donde el documento no declara ninguno es justo lo que la columna de
    procedencia existe para impedir.
    """
    encontrado = _CLAVE_ACTUALIZACION.search(texto)
    if not encontrado:
        return None, None
    crudo = encontrado.group(1).strip()
    for formato, largo in (("%Y-%m-%dT%H:%M:%S", 19), ("%Y-%m-%d", 10)):
        try:
            return crudo, datetime.strptime(crudo[:largo], formato).date()
        except ValueError:
            continue
    return None, None


def _last_commit_dates(repo: Path, subtree: str) -> dict:
    """Fecha del ultimo commit por archivo, en UNA pasada sobre el log.

    Un `git log` por archivo sobre miles de documentos es el mismo defecto de
    coste que el barrido de tareas ya tenia: aqui el log se recorre una vez y
    se indexa. ``setdefault`` conserva el PRIMER commit visto por archivo, que
    con el orden por omision de `git log` es el mas reciente.

    Ciega al renombrado: sin ``--follow`` la historia se corta en la mudanza,
    asi que un archivo movido declara su fecha desde entonces. Es la direccion
    segura — una fecha posterior conserva de mas, nunca de menos.
    """
    try:
        salida = subprocess.run(
            ["git", "-C", str(repo), "log", "--format=@%cI", "--name-only", "--", subtree],
            capture_output=True, text=True, check=True,
        ).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {}
    fechas, actual = {}, None
    for linea in salida.splitlines():
        if linea.startswith("@"):
            actual = linea[1:]
        elif linea.strip() and actual:
            fechas.setdefault(linea.strip(), actual)
    return fechas


def cmd_date_documents(args: argparse.Namespace) -> None:
    """Fecha cada documento con la cota MAS TARDIA de las disponibles.

    Pieza 2 del eje temporal (H-DOCS-411). El plazo de conservacion corre
    sobre el documento, no sobre la tarea, y su disparador es la ultima
    actualizacion — que tiene dos cotas y ninguna basta sola:

    - la clave `:fecha_actualizacion:` la declara el 14.5 % del arbol;
    - el ultimo commit existe para todo archivo versionado, pero no distingue
      un cambio de fondo de un arreglo de formato.

    Un documento sin NINGUNA de las dos queda con `updated_at` NULO y su fila
    escrita: el hueco declarado y el hueco rellenado se leen igual en una
    columna, y solo el primero es honesto.
    """
    repo = Path(args.repo_docs).resolve()
    raiz = repo / args.subtree
    if not raiz.is_dir():
        print(f"ERROR — no existe {raiz}", file=sys.stderr)
        raise SystemExit(2)

    commits = _last_commit_dates(repo, args.subtree)
    ahora = now_iso()
    conn = None if args.dry_run else connect(resolve_store_dir(args))

    universo = por_fuente = 0
    conteo = collections.Counter()
    sin_cota = 0

    for ruta in sorted(raiz.rglob("*.rst")):
        universo += 1
        rel = str(ruta.relative_to(repo))
        crudo, dia_declarado = _parse_declared_date(
            ruta.read_text(encoding="utf-8", errors="replace")
        )
        crudo_commit = commits.get(rel)
        dia_commit = (
            datetime.fromisoformat(crudo_commit).date() if crudo_commit else None
        )

        # La cota MAS TARDIA gana. `ambas` cuando caen el mismo dia — una
        # coincidencia y una cota unica no son la misma evidencia.
        if dia_declarado and dia_commit:
            if dia_declarado > dia_commit:
                fuente, valor = "meta-declarada", crudo
            elif dia_commit > dia_declarado:
                fuente, valor = "git-commit", crudo_commit
            else:
                fuente, valor = "ambas", crudo_commit
        elif dia_declarado:
            fuente, valor = "meta-declarada", crudo
        elif dia_commit:
            fuente, valor = "git-commit", crudo_commit
        else:
            fuente, valor = None, None
            sin_cota += 1

        if fuente:
            conteo[fuente] += 1
            por_fuente += 1
        if conn is not None:
            conn.execute(
                "INSERT INTO documents "
                "  (path, updated_at, updated_at_source, declared_at, commit_at, scanned_at) "
                "VALUES (?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(path) DO UPDATE SET "
                "  updated_at = excluded.updated_at, "
                "  updated_at_source = excluded.updated_at_source, "
                "  declared_at = excluded.declared_at, "
                "  commit_at = excluded.commit_at, "
                "  scanned_at = excluded.scanned_at",
                (rel, valor, fuente, crudo, crudo_commit, ahora),
            )

    if conn is not None:
        conn.commit()

    desglose = " · ".join(
        f"{f}: {conteo[f]}" for f in DOCUMENT_TRIGGER_SOURCES if conteo[f]
    )
    prefijo = "fechar-documentos (dry-run)" if args.dry_run else "fechar-documentos"
    print(f"{prefijo}: {por_fuente} fechado(s) [{desglose}] · "
          f"{sin_cota} sin ninguna cota")
    print(f"  (alcance medido: {universo} documento(s) .rst bajo {args.subtree}/ "
          f"en {repo})")


def _document_section(rel: str, subtree: str):
    """El primer segmento bajo el subarbol — la funcion documental.

    Devuelve ``None`` para un documento que vive en la RAIZ del subarbol: no
    pertenece a ninguna funcion, y eso es un hecho del arbol, no una medicion
    que falto. Medido: 1 de 4581 (``source/index.rst``, el indice del fondo).
    """
    partes = PurePosixPath(rel).parts
    # partes[0] es el subarbol; hace falta al menos un directorio mas.
    if len(partes) < 3 or partes[0] != subtree:
        return None
    return partes[1]


def _document_type(rel: str) -> str:
    """El tipo documental que declara el PREFIJO del nombre.

    Delega en `tipos_documentales`, que es donde el vocabulario cita su canon.
    El alias se conserva porque los llamadores de este modulo lo nombran asi.

    ``DOCUMENT_TYPE_UNKNOWN`` es un veredicto —"este nombre no declara tipo"—
    y no un hueco: por eso se escribe, en vez de dejar la columna en NULO.
    """
    return _document_type_projected(rel)


def cmd_classify_documents(args: argparse.Namespace) -> None:
    """Asigna a cada documento su SERIE — la unidad de conservacion.

    Pieza 3 del eje temporal (#872). Un catalogo de disposicion documental no
    clasifica archivos sueltos: clasifica series. La unidad es **compuesta**
    —``<seccion>/<tipo>``— porque ninguno de los cuatro ejes simples medidos
    particiona el fondo (evento `unidad-de-conservacion-*`): la iniciativa deja
    fuera al 42 %, el tipo concentra el 24 % en `otro`, la funcion el 69 % en
    `gestion`, y el submodulo solo alcanza a `pm/`. El compuesto reparte 4581
    documentos en 47 series con mediana 11.

    Y no es una invencion nuestra: es la estructura de dos niveles que la norma
    ya usa — seccion (la funcion) -> serie (el tipo documental dentro de ella).

    El PLAZO **no** se escribe aqui. Declararlo es autoridad archivistica y
    este guion no la tiene; queda bloqueado por #760.
    """
    repo = Path(args.repo_docs).resolve()
    raiz = repo / args.subtree
    if not raiz.is_dir():
        print(f"ERROR — no existe {raiz}", file=sys.stderr)
        raise SystemExit(2)

    ahora = now_iso()
    conn = None if args.dry_run else connect(resolve_store_dir(args))

    universo = sin_seccion = 0
    series = collections.Counter()
    tipos = collections.Counter()

    for ruta in sorted(raiz.rglob("*.rst")):
        universo += 1
        rel = str(ruta.relative_to(repo))
        seccion = _document_section(rel, args.subtree)
        tipo = _document_type(rel)
        tipos[tipo] += 1
        if seccion is None:
            sin_seccion += 1
            serie = None
        else:
            serie = f"{seccion}/{tipo}"
            series[serie] += 1

        if conn is not None:
            # Solo las columnas de la unidad. `updated_at` y sus cotas las
            # escribe `fechar-documentos`, y pisarlas aqui borraria el
            # disparador cada vez que se reclasifica.
            conn.execute(
                "INSERT INTO documents (path, section, series, scanned_at) "
                "VALUES (?, ?, ?, ?) "
                "ON CONFLICT(path) DO UPDATE SET "
                "  section = excluded.section, "
                "  series = excluded.series, "
                "  scanned_at = excluded.scanned_at",
                (rel, seccion, serie, ahora),
            )

    if conn is not None:
        conn.commit()

    prefijo = (
        "clasificar-documentos (dry-run)" if args.dry_run else "clasificar-documentos"
    )
    unitarias = sum(1 for n in series.values() if n == 1)
    print(f"{prefijo}: {len(series)} serie(s) · mediana {statistics.median(series.values()) if series else 0} "
          f"· {unitarias} unitaria(s) · {tipos[DOCUMENT_TYPE_UNKNOWN]} sin tipo declarado "
          f"({DOCUMENT_TYPE_UNKNOWN}) · {sin_seccion} en la raiz del subarbol")
    print(f"  (alcance medido: {universo} documento(s) .rst bajo {args.subtree}/ "
          f"en {repo})")


def cmd_search_tasks(args: argparse.Namespace) -> None:
    """Consulta la tabla ``tasks`` — el lado de tareas que faltaba.

    El store ya tenia dos superficies de consulta —``listar-sesiones`` para
    los agentes y ``buscar-hallazgos`` para ``findings_history``— y **ninguna
    para tareas**: lo unico que las leia era ``render-tablero``, que escribe
    el tablero entero en RST. Recuperar "¿que decia la #864?" desde otra
    sesion exigia SQL a mano contra el archivo.

    Por omision consulta **todas las sesiones**, que es el punto: la tabla
    esta versionada (DEC-05) y su fila sobrevive al contenedor donde se creo.
    ``--sesion`` acota cuando se quiere una sola.

    *Metrica:* filas de ``tasks`` cuyo ``subject`` o ``description`` contienen
    el texto (``LIKE``, sin distinguir mayusculas).
    *Ciega a:* sinonimia y flexion — busca la cadena, no el concepto; no hay
    indice FTS5 sobre ``tasks`` (si lo hay sobre ``findings_history``). Con el
    universo medido en cientos de filas el recorrido completo es inmediato, y
    un indice invertido añadiria triggers que mantener sin comprar nada hoy.
    """
    store_dir = resolve_store_dir(args)
    where: list = []
    params: list = []
    if args.query:
        where.append("(LOWER(subject) LIKE ? OR LOWER(IFNULL(description, '')) LIKE ?)")
        aguja = f"%{args.query.lower()}%"
        params += [aguja, aguja]
    if args.id:
        marcas = ",".join("?" for _ in args.id)
        where.append(f"task_id IN ({marcas})")
        params += [str(i).lstrip("#") for i in args.id]
    if args.status:
        where.append("status = ?")
        params.append(args.status)
    if args.sesion:
        where.append("session_id LIKE ?")
        params.append(f"{args.sesion}%")
    if args.submodulo:
        where.append("submodule = ?")
        params.append(args.submodulo)
    sql = "SELECT * FROM tasks"
    if where:
        sql += " WHERE " + " AND ".join(where)
    with connect(store_dir) as conn:
        filas = conn.execute(sql, params).fetchall()
        universo = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        sesiones = conn.execute(
            "SELECT COUNT(DISTINCT session_id) FROM tasks"
        ).fetchone()[0]
    filas = sorted(filas, key=lambda r: _orden_id(r["task_id"]))
    if args.limit:
        filas = filas[: args.limit]
    for row in filas:
        capa = row["submodule"] or "-"
        print(f"#{row['task_id']}  {row['status']:<11}  [{capa}]  {row['subject']}")
        if args.detalle:
            print(f"    sesion:      {row['session_id']}")
            print(f"    origen:      {row['source'] or '-'}")
            print(f"    creada:      {row['created_at']}  actualizada: {row['updated_at']}")
            if row["description"]:
                for linea in textwrap.wrap(row["description"], 76):
                    print(f"    {linea}")
            print()
    print(
        f"Total: {len(filas)} (alcance medido: {universo} tarea(s) de "
        f"{sesiones} sesion/es en {store_dir / DB_FILENAME})"
    )


def cmd_derive_submodule(args: argparse.Namespace) -> None:
    """Puebla ``tasks.submodule`` desde lo que el texto de cada tarea ya dice.

    **No inventa el dato: lo rescata.** El id de tarea es un ordinal global y
    nunca declaro su capa, pero el subject y la description sí la cargan —
    citando el hallazgo que la motiva, o nombrando la ruta que toca. Este
    comando lee esas dos senales, las cruza con ``findings_history`` cuando
    puede, y escribe el resultado **con su procedencia** (ver
    ``derive_submodule``).

    Idempotente y **no pisa el juicio humano**: una fila con
    ``submodule_source = 'manual'`` se salta siempre. ``--rehacer`` recalcula
    tambien las derivadas —util cuando el store gana hallazgos y una fila que
    solo tenia prefijo puede ascender a ``hallazgo_store``— pero nunca toca
    las manuales.

    El resumen separa las cuatro procedencias en vez de publicar un total. Un
    contador unico para «lo supe del registro de hallazgos» y «lo adivine por
    un token de ruta» es el sub-patron D de
    ``metrica-decide-la-conclusion.md``: el numero saldria igual con un
    derivador fiable y con uno ciego.
    """
    store_dir = resolve_store_dir(args)
    with connect(store_dir) as conn:
        findings = {
            r["finding_id"].upper(): r["submodule"]
            for r in conn.execute("SELECT finding_id, submodule FROM findings_history")
        }
        filas = list(conn.execute(
            "SELECT session_id, task_id, subject, description, "
            "       submodule, submodule_source FROM tasks"
        ))
        por_origen = {}
        sin_capa = 0
        respetadas = 0
        escritas = 0
        for fila in filas:
            if fila["submodule_source"] == "manual":
                respetadas += 1
                continue
            if fila["submodule"] and not args.rehacer:
                por_origen[fila["submodule_source"] or "?"] = \
                    por_origen.get(fila["submodule_source"] or "?", 0) + 1
                continue
            capa, origen = derive_submodule(
                fila["subject"], fila["description"], findings
            )
            if capa is None:
                sin_capa += 1
            else:
                por_origen[origen] = por_origen.get(origen, 0) + 1
            if args.dry_run:
                continue
            # `updated_at` NO se toca: esta columna describe cuando cambio la
            # TAREA, y derivar su capa no la cambia. Moverlo dejaria un diff de
            # 851 filas en un binario versionado por un dato que nadie edito —
            # el mismo churn que el `WHERE` de snapshot-tareas ya cerro.
            if (capa, origen) != (fila["submodule"], fila["submodule_source"]):
                conn.execute(
                    "UPDATE tasks SET submodule = ?, submodule_source = ? "
                    "WHERE session_id = ? AND task_id = ?",
                    (capa, origen, fila["session_id"], fila["task_id"]),
                )
                escritas += 1
        if not args.dry_run:
            conn.commit()

    total = len(filas)
    con_capa = sum(por_origen.values())
    detalle = " · ".join(
        f"{origen} {n}" for origen, n in sorted(por_origen.items())
    ) or "ninguna"
    modo = " (dry-run, sin escribir)" if args.dry_run else ""
    print(
        f"derivar-capa: {con_capa} de {total} con capa ({detalle}) · "
        f"{sin_capa} sin señal · {respetadas} manuales respetadas · "
        f"{escritas} filas escritas{modo}"
    )


def _row_value(fila, columna: str):
    """El valor de ``columna`` en una ``sqlite3.Row``, o ``None`` si no está.

    Una ``Row`` levanta ``IndexError`` ante una columna ausente, y la
    migración que añade ``citation_id`` corre al abrir la conexión — pero un
    lector que abra el archivo por otra vía (``mode=ro``, una copia vieja)
    no la tiene. Devolver ``None`` deja que quien llama decida qué imprimir;
    reventar dejaría el tablero sin generar por una columna opcional.
    """
    try:
        return fila[columna]
    except (IndexError, KeyError):
        return None


def _celda_rst(valor: object) -> str:
    """Sanea un valor para meterlo en una celda de ``list-table``.

    Portado del ``def celda`` en jq de ``snapshot-tasks.sh``, y el orden del
    escapado importa: la contrabarra va PRIMERO, o se re-escapan las que
    introducen los pasos siguientes.

    El guion bajo NO es opcional. Escapar solo ``*`` convierte ``authz_*`` en
    ``authz_\\*``, donde RST lee ``authz_`` como referencia con nombre y falla
    con «Unknown target name» — medido: 6 errores de esa forma exacta.
    """
    txt = "" if valor is None else str(valor)
    txt = re.sub(r"\s+", " ", txt).strip()
    for viejo, nuevo in (("\\", "\\\\"), ("`", "\\`"), ("*", "\\*"),
                         ("_", "\\_"), ("|", "\\|")):
        txt = txt.replace(viejo, nuevo)
    return txt or "—"


def _orden_id(texto: str) -> tuple:
    """Orden de ``sort -n``: los numéricos por valor, el resto detrás."""
    return (0, int(texto), "") if texto.isdigit() else (1, 0, texto)


def firma_estados(tasks_dir: Path) -> str:
    """sha256 de ``id:status:base64(subject + " " + description)`` del directorio VIVO.

    **El texto entra desde H-DOCS-183.** Hasta entonces la firma leía sólo
    ``status``, así que una tarea RE-DEFINIDA —mismo id, mismo estado, otro
    enunciado— daba hash idéntico: el hook no disparaba, el volcado al store no
    corría, y la re-definición se quedaba sólo en el directorio del cliente, que
    es efímero POR SESIÓN. Medido con control positivo y negativo.

    **Mide el directorio del cliente, NO el store**, y esa elección es el punto
    delicado de todo el render. ``stop-gate-tablero-desactualizado.sh`` compara
    esta firma —la declarada en el ``.rst``— contra la que calcula del
    directorio para decidir si dispara. Si se derivara del store, que el mismo
    disparo acaba de actualizar, la comparación sería el store contra sí mismo:
    tautológica, siempre igual, y el hook no volvería a disparar nunca.

    Tiene que dar el MISMO hash que ``firma_estados()`` de bash (una tercera
    implementación, ya hay dos): si difiriera, el hook vería drift eterno y
    reescribiría el registro en cada turno. Lo verifica el caso 4 de
    ``test-agent-store-render-tablero.sh``.
    """
    lineas = []
    for ruta in sorted(tasks_dir.glob("*.json"), key=lambda p: _orden_id(p.stem)):
        try:
            d = json.loads(ruta.read_text(encoding="utf-8"))
            estado = d.get("status") or "—"
            texto = f"{d.get('subject') or ''}\0{d.get('description') or ''}"
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            estado, texto = "—", "\0"
        # El separador es NUL, no espacio. Las dos copias en bash concatenan con
        # el separador NUL y ésta lo hacía con un espacio, así que las tres
        # implementaciones NUNCA coincidían: el hook veía drift eterno y reescribía el `.rst`
        # versionado en CADA Stop — exactamente el defecto que su propio
        # docstring anunciaba, vivo y sin que ningún caso lo midiera (#479).
        # NUL además es el separador correcto: con espacio, subject="a b" +
        # description="" y subject="a" + description="b" dan el mismo hash.
        #
        # base64 estándar con relleno — la MISMA forma que `@base64` de jq, que
        # es lo que usan las dos copias en bash. Cualquier variante (urlsafe,
        # sin relleno) rompe la paridad y el hook vería drift eterno.
        b64 = base64.b64encode(texto.encode("utf-8")).decode("ascii")
        lineas.append(f"{ruta.stem}:{estado}:{b64}\n")
    return hashlib.sha256("".join(lineas).encode("utf-8")).hexdigest()


def _celda_bloqueada(bruto) -> str:
    """La celda «Bloqueada por»: distingue «no la bloquea nadie» de «no se sabe».

    ``blocked_by_json`` guarda ``null`` cuando la procedencia de la fila no pudo
    leer las dependencias. Una transcripción del tablero da id, estado y subject
    — y nada más —, así que escribir ``[]`` ahí afirmaría «no la bloquea nadie»,
    que es una afirmación distinta de «no se sabe» y puede ser falsa. Es el
    sub-patrón D de ``metrica-decide-la-conclusion.md``: una celda vacía no
    discrimina entre el hecho y la ignorancia del instrumento.

    Un ``", ".join(None)`` levanta ``TypeError``, que el ``except
    json.JSONDecodeError`` de antes no atrapaba: representar el desconocido
    exigía este paso intermedio, no sólo escribir ``null`` en la columna.
    """
    try:
        valor = json.loads(bruto or "[]")
    except json.JSONDecodeError:
        return ""
    if valor is None:
        return "sin dato"
    return ", ".join(str(x) for x in valor)


def _tabla_de_sesion(filas: list) -> list:
    """Las líneas RST de una ``list-table`` con las tareas de una sesión."""
    salida = [
        ".. list-table::",
        "   :header-rows: 1",
        "   :widths: 14 5 8 10 45 18",
        "",
        "   * - ID",
        "     - Asa",
        "     - Estado",
        "     - Capa",
        "     - Subject",
        "     - Bloqueada por",
    ]
    for fila in filas:
        bloqueada = _celda_bloqueada(fila["blocked_by_json"])
        # La celda de capa lleva su PROCEDENCIA entre paréntesis cuando es
        # débil. Una capa derivada de un token de ruta y una leída del
        # registro de hallazgos se ven igual si sólo se imprime el valor, y
        # entonces el tablero deja de decir cuál hay que revisar.
        capa = fila["submodule"] or "—"
        if fila["submodule"] and fila["submodule_source"] == "ruta":
            capa += " (ruta)"
        # El ID que se CITA es el nuestro (KX-<CAPA>-NNNN, acuñado por
        # `.claude/scripts/task/task_ids.py`): es estable y global. El `#NNN`
        # del harness reinicia por sesión —332 de 337 colisionaban entre dos
        # sesiones (ERR-024)— así que baja a la columna «Asa», que junto al
        # encabezado de sesión forma el par (uuid_sesión, id_harness) con el
        # que se opera `TaskUpdate`. Una fila sin acuñar declara «sin acuñar»
        # en vez de dejar la celda vacía: un blanco no distingue «no tiene
        # id» de «el renderizador no lo leyó» (sub-patrón D).
        citation = _row_value(fila, "citation_id") or "sin acuñar"
        salida += [
            "   * - " + _celda_rst(citation),
            "     - " + _celda_rst(fila["task_id"]),
            "     - " + _celda_rst(fila["status"]),
            "     - " + _celda_rst(capa),
            "     - " + _celda_rst(fila["subject"]),
            "     - " + _celda_rst(bloqueada),
        ]
    return salida


def cmd_render_tablero(args: argparse.Namespace) -> None:
    """Genera ``pm/reportes/tablero-de-tareas.rst`` DESDE EL STORE (#435).

    El generador anterior leía el directorio efímero del cliente, que es **por
    sesión**: el registro versionado describía siempre la última y borraba a las
    anteriores. Medido: declaraba la sesión 2b81838e con id máximo 57 mientras
    corrían 447 en otra. Derivarlo del store lo vuelve un registro de todo el
    trabajo, no de la última ventana.

    Dos cosas siguen viniendo del directorio vivo porque el store no las tiene:
    la **firma de estados** (ver ``firma_estados``) y el ``.highwatermark``, que
    es lo único que delata a una tarea **borrada** — sin él, «nunca existió» y
    «existió y se borró» se leen igual. Eso ya costó trabajo: H-DOCS-122 fue
    limpiar 8 citas a #206, una tarea borrada.
    """
    store_dir = resolve_store_dir(args)
    tasks_dir = Path(args.tasks_dir).expanduser() if args.tasks_dir else None
    activa = args.session_id or (tasks_dir.name if tasks_dir else None)

    with connect(store_dir) as conn:
        filas = conn.execute(
            "SELECT * FROM tasks ORDER BY session_id, task_id"
        ).fetchall()
        # El orden de sesión sale de cuándo apareció su tarea más antigua; el
        # de las tareas, de `sort -n` sobre el id, que es lo que hacía el
        # generador viejo (los archivos son <id>.json, no <NNN>.json).
        orden_sesion = {
            r["session_id"]: r["primera"]
            for r in conn.execute(
                "SELECT session_id, MIN(created_at) AS primera "
                "FROM tasks GROUP BY session_id"
            )
        }
        # Estado 2 de los tres (tarea #94): si volcar movería citas, el volcado
        # NO ocurre y este render tiene que DECIRLO. Un tablero congelado y
        # mudo es peor que uno que declara lo que le falta: los dos se leen
        # igual, y sólo uno es honesto.
        sin_incorporar = (
            citation_reassignments(conn, activa, tasks_dir)
            if tasks_dir and tasks_dir.is_dir() and activa else []
        )

    por_sesion = {}
    for fila in filas:
        por_sesion.setdefault(fila["session_id"], []).append(fila)
    for sesion in por_sesion:
        por_sesion[sesion].sort(key=lambda f: _orden_id(str(f["task_id"])))

    # La activa primero — es la que el lector busca; el resto, la más reciente
    # antes que la más vieja.
    sesiones = sorted(
        por_sesion,
        key=lambda s: (s != activa, _invertir(orden_sesion.get(s, ""))),
    )

    ahora = now_iso()
    # La `:fuente:` va RELATIVA al repo cuando cae dentro: una ruta absoluta en
    # un artefacto versionado envejece mal — cambia con la máquina y con el
    # contenedor, así que declararía algo falso en cuanto alguien clone en otro
    # sitio. Fuera del repo (un store de prueba) se deja absoluta: ahí la ruta
    # completa es la información.
    fuente = store_dir / DB_FILENAME
    try:
        fuente = fuente.relative_to(agents_paths.consumer_root())
    except ValueError:
        pass

    out = []
    out += [
        ".. meta::",
        "   :artefacto: tablero-de-tareas",
        "   :tipo: Reporte de estado",
        "   :dominio: gestion",
        "   :estado: vigente",
        f"   :fecha_actualizacion: {ahora}",
        "   :autor: Equipo Kaupamex",
        "   :clasificacion: interno",
        "   :generado_por: .claude/scripts/agents/agent_store.py render-tablero",
        f"   :fuente: {fuente} (versionado, no efímero)",
        "",
        ".. _tablero-de-tareas:",
        "",
    ]
    titulo = "Tablero de tareas"
    out += [titulo, "=" * len(titulo), ""]
    out += [
        "Registro versionado de las tareas del proyecto, derivado de la tabla",
        "``tasks`` del store. Describe **todas** las sesiones, no sólo la última:",
        "el directorio del cliente (``~/.claude/tasks/<sesión>/``) es efímero al",
        "contenedor **y por sesión**, así que un tablero leído de ahí borraba el",
        "trabajo de las sesiones anteriores en cada refresco.",
        "",
        "Lo refresca el hook ``stop-gate-tablero-desactualizado.sh`` cuando la",
        "firma de estados de la sesión viva difiere de la declarada abajo.",
        "",
    ]
    if sin_incorporar:
        ejemplos = sin_incorporar[:3]
        out += [
            ".. warning::",
            "",
            f"   **Este tablero está incompleto: {len(sin_incorporar)} tarea(s) del",
            "   directorio vivo NO están incorporadas.**",
            "",
            "   El volcado no se hizo porque habría movido esas citas a otro",
            "   sujeto: el ``citation_id`` cuelga del ordinal del cliente, que",
            "   renumera desde 1 en cada tanda, y el ``subject`` es mutable bajo",
            "   esa clave (:ref:`h-docs-1042`). Anclarlo al sujeto es la tarea",
            "   **#104**.",
            "",
            "   Lo que se declara aquí es la DIFERENCIA, no un fallo: las filas de",
            "   abajo son ciertas y están al día respecto del store; lo que falta",
            "   es lo que el directorio vivo tiene y el store todavía no.",
            "",
            "   Ejemplos de la colisión:",
            "",
        ]
        for tid, cita, viejo_s, vivo_s in ejemplos:
            out += [
                f"   - ordinal ``{tid}`` — ``{cita}`` nombra hoy «{viejo_s[:60]}»,",
                f"     y el directorio vivo pone ahí «{vivo_s[:60]}».",
            ]
        if len(sin_incorporar) > len(ejemplos):
            out += [f"   - … y {len(sin_incorporar) - len(ejemplos)} más."]
        out += [""]

    for sesion in sesiones:
        rotulo = f"Sesión ``{sesion}``"
        if sesion == activa:
            rotulo += " — activa"
        out += [rotulo, "-" * len(rotulo), ""]
        out += _tabla_de_sesion(por_sesion[sesion])
        out += [""]

    out += ["Alcance del volcado", "-------------------", ""]
    out += [
        f"- **Tareas en el store:** {len(filas)} en {len(por_sesion)} sesión(es).",
    ]
    if activa:
        vivas = por_sesion.get(activa, [])
        out += [f"- **Tareas en la sesión activa:** {len(vivas)} (``{activa}``)."]
    if tasks_dir and tasks_dir.is_dir():
        ids = sorted(
            (p.stem for p in tasks_dir.glob("*.json")), key=_orden_id
        )
        numericos = [int(i) for i in ids if i.isdigit()]
        maximo = max(numericos) if numericos else None
        hwm_ruta = tasks_dir / ".highwatermark"
        try:
            hwm = hwm_ruta.read_text(encoding="utf-8").strip() or "—"
        except OSError:
            hwm = "—"
        huecos = [str(i) for i in range(1, (maximo or 0) + 1)
                  if i not in set(numericos)]
        out += [
            f"- **Mayor id presente (sesión activa):** {maximo if maximo else '—'}.",
            f"- **High water mark** (``.highwatermark``): {hwm}. Es el mayor id",
            "  **jamás** usado, no el mayor presente: el binario lo escribe al",
            "  **borrar**, para que un id borrado no se reutilice.",
            "- **Ids ausentes (borrados, sesión activa):** "
            + (" ".join(huecos) if huecos else "ninguno"),
            f"- **Firma de estados:** ``{firma_estados(tasks_dir)}``",
            "  (sha256 de ``id:status:base64(subject description)`` del directorio VIVO —",
            "  es la condición de disparo del hook; derivarla del store la volvería",
            "  tautológica. El texto entra desde H-DOCS-183: sin él, re-enunciar",
            "  una tarea sin moverle el estado no disparaba nada).",
        ]
    else:
        out += [
            "- **Firma de estados:** no calculada — este render corrió sin",
            "  ``--tasks-dir``, así que no había directorio vivo que medir. El",
            "  hook no puede usar este registro para detectar drift hasta que",
            "  vuelva a generarse con la sesión activa.",
        ]

    texto = "\n".join(out) + "\n"
    if args.out:
        destino = Path(args.out).expanduser()
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(texto, encoding="utf-8")
        print(
            f"render-tablero: escrito {destino} "
            f"({len(filas)} tareas, {len(por_sesion)} sesión/es)",
            file=sys.stderr,
        )
    else:
        sys.stdout.write(texto)


def _invertir(texto: str) -> str:
    """Clave de orden descendente para una cadena, sin `reverse=` global.

    Se necesita porque el orden de sesiones mezcla dos criterios con sentidos
    opuestos: la activa primero (ascendente sobre un booleano) y las demás de
    más reciente a más vieja (descendente sobre la fecha).
    """
    return "".join(chr(0x10FFFF - ord(c)) if ord(c) < 0x10FFFF else c
                   for c in texto)


#: Las cuatro columnas del bloque de uso. El criterio «no medido» es sobre las
#: CUATRO a la vez, nunca sobre una: una fila con tres pobladas y un cero es una
#: medición, no una ausencia (:ref:`h-docs-427`).
_COLUMNAS_DE_USO = ("input_tokens", "cache_creation_tokens",
                    "cache_read_tokens", "output_tokens")


def cmd_usage_census(args: argparse.Namespace) -> None:
    """Reparte las filas en sus cuatro estados de medición, con denominador.

    Es la única superficie sancionada para agregar el costo de los agentes.
    Existe porque una consulta directa —``SELECT SUM(cache_read_tokens)``—
    trata el NULL de una fila nunca medida como un cero, y con eso publica un
    promedio cuyo denominador incluye filas que no aportaron dato. Medido al
    escribirla: 356 de 669 filas estaban en ese caso, y dos artefactos ya
    habían publicado «medido sobre 288 agentes» y «sobre 216» sin declarar
    nunca el universo (:ref:`h-docs-427`).

    Por eso la salida **empieza** por el reparto y sólo después da el
    agregado, siempre acompañado del `n` sobre el que se calculó.
    """
    store_dir = resolve_store_dir(args)
    sin_medir = " AND ".join(f"{c} IS NULL" for c in _COLUMNAS_DE_USO)
    with connect(store_dir) as conn:
        total = conn.execute("SELECT COUNT(*) FROM agent_sessions").fetchone()[0]
        medidos = conn.execute(
            "SELECT COUNT(*) FROM agent_sessions "
            "WHERE usage_source = 'transcript'").fetchone()[0]
        cero = conn.execute(
            "SELECT COUNT(*) FROM agent_sessions "
            "WHERE usage_source = 'transcript' AND cache_read_tokens = 0"
        ).fetchone()[0]
        no_medidos = conn.execute(
            "SELECT COUNT(*) FROM agent_sessions "
            "WHERE usage_source = 'no_medido'").fetchone()[0]
        sin_clasificar = conn.execute(
            "SELECT COUNT(*) FROM agent_sessions "
            f"WHERE usage_source IS NULL AND {sin_medir}").fetchone()[0]
        # Un huérfano: tokens escritos sin declarar quién los midió. Sólo puede
        # venir de un escritor que no pasó por aquí, así que se reporta en vez
        # de sumarse en silencio a los medidos.
        huerfanos = conn.execute(
            "SELECT COUNT(*) FROM agent_sessions "
            f"WHERE usage_source IS NULL AND NOT ({sin_medir})").fetchone()[0]
        agregado = conn.execute(
            "SELECT COUNT(*), SUM(cache_read_tokens), SUM(cache_creation_tokens), "
            "SUM(output_tokens), SUM(input_tokens), SUM(equiv_cost) "
            "FROM agent_sessions WHERE usage_source = 'transcript'").fetchone()

    print(f"filas en agent_sessions: {total}")
    print(f"  medido, valor > 0 o = 0 (usage_source='transcript'): {medidos}"
          f"   — de ellos con cache_read = 0: {cero}")
    print(f"  NUNCA medido, irrecuperable (usage_source='no_medido'): {no_medidos}")
    print(f"  sin clasificar todavía (usage_source NULL, sin tokens): {sin_clasificar}")
    if huerfanos:
        print(f"  ATENCIÓN — con tokens y sin procedencia declarada: {huerfanos}")
    n = agregado[0]
    print()
    print(f"agregado sobre los MEDIDOS — n = {n} de {total} "
          f"({n * 100 // total if total else 0} % del universo)")
    if n:
        for etiqueta, valor in zip(
                ("cache_read", "cache_creation", "output", "input", "equiv_cost"),
                agregado[1:]):
            print(f"  {etiqueta:<16} {valor or 0:>16,}   media {(valor or 0) // n:>12,}")
    # USD por modelo, al precio del tier de cada uno (catálogo vendorizado del
    # paquete). `equiv_cost` de arriba pondera con los cocientes de UN tier y
    # Fable 5.1 los rompe (H-DOCS-1008); esta tabla no hereda ese sesgo.
    if model_catalog is None:
        catalogo, motivo = None, (f"model_catalog.py no está junto a agent_store.py "
                                  f"({os.path.dirname(os.path.abspath(__file__))}); sin catálogo no hay USD")
    else:
        catalogo, motivo = model_catalog.try_catalog()
    print()
    if catalogo is None:
        print(f"USD por modelo: SIN MEDIR — {motivo}")
    else:
        with connect(store_dir) as conn:
            por_modelo = conn.execute(
                "SELECT model, COUNT(*), SUM(turns), SUM(input_tokens), "
                "SUM(cache_creation_tokens), SUM(cache_read_tokens), SUM(output_tokens) "
                "FROM agent_sessions WHERE usage_source = 'transcript' "
                "AND model LIKE 'claude-%' GROUP BY model ORDER BY 2 DESC").fetchall()
        sin_modelo = n - sum(r[1] for r in por_modelo)
        print(f"USD por modelo — precio de lista del catálogo "
              f"({catalogo.get('fuente', '?')}), sobre los medidos con modelo declarado:")
        print(f"  {'modelo':<20} {'n':>5} {'turnos':>7} {'usd@5m':>10} {'usd@1h':>10}")
        for modelo, k, turnos, inp, cc, cr, out in por_modelo:
            uso = {"input_tokens": inp or 0, "cache_creation_tokens": cc or 0,
                   "cache_read_tokens": cr or 0, "output_tokens": out or 0}
            try:
                u5 = model_catalog.usage_cost_usd(catalogo, modelo, uso, "5m")
                u1 = model_catalog.usage_cost_usd(catalogo, modelo, uso, "1h")
                print(f"  {modelo:<20} {k:>5} {turnos or 0:>7} {u5:>10.2f} {u1:>10.2f}")
            except KeyError:
                print(f"  {modelo:<20} {k:>5} {turnos or 0:>7} {'sin tier':>10} {'—':>10}")
        print(f"  (alcance medido: {n - sin_modelo} de {n} medidos declaran modelo; "
              f"{sin_modelo} sin `claude-*` en `model` quedan fuera; 5m/1h = TTL de la "
              f"escritura de caché, que el store no registra)")
    print()
    print("Toda cifra derivada de aquí se cita CON su n. Las filas 'no_medido' "
          "quedan fuera del denominador: su costo existió y ya no se puede leer.")


def cmd_list_sessions(args: argparse.Namespace) -> None:
    store_dir = resolve_store_dir(args)
    with connect(store_dir) as conn:
        if args.status:
            rows = conn.execute(
                "SELECT * FROM agent_sessions WHERE status = ? ORDER BY started_at",
                (args.status,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM agent_sessions ORDER BY started_at"
            ).fetchall()
    for row in rows:
        linea = (
            f"{row['agent_id']}  {row['subagent_type']}  {row['status']}  "
            f"started={row['started_at']}  updated={row['updated_at']}"
        )
        if row["equiv_cost"] is not None:
            linea += (
                f"  equiv_cost={row['equiv_cost']}  turns={row['turns']}"
                f"  model={row['model']}"
            )
        print(linea)
    print(f"Total: {len(rows)} ({store_dir / DB_FILENAME})")


def cmd_add_finding(args: argparse.Namespace) -> None:
    """Indexa un hallazgo/tarea/decision/reporte YA escrito como RST.

    DEC-07: esta tabla es un indice reconstruible, no la fuente de
    verdad. ``--content`` es un resumen indexable (para LIKE / futuro
    KNN), no un lugar donde escribir el cuerpo completo que solo vive
    aqui — el RST en ``hallazgos-documentacion-obligatoria.md`` sigue
    siendo obligatorio y es lo que se cita en ``source_ref``.
    """
    store_dir = resolve_store_dir(args)
    ts = now_iso()
    created_at = args.date or ts
    with connect(store_dir) as conn:
        conn.execute(
            """
            INSERT INTO findings_history
                (finding_id, submodule, initiative, finding_type, severity,
                 summary, content, source_ref, metadata_json, session_id,
                 created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(finding_id) DO UPDATE SET
                submodule     = excluded.submodule,
                initiative    = excluded.initiative,
                finding_type  = excluded.finding_type,
                severity      = excluded.severity,
                summary       = excluded.summary,
                content       = excluded.content,
                source_ref    = excluded.source_ref,
                metadata_json = excluded.metadata_json,
                session_id    = excluded.session_id,
                updated_at    = excluded.updated_at
            """,
            (
                args.finding_id,
                args.submodule,
                args.initiative,
                args.finding_type,
                args.severity,
                args.summary,
                args.content,
                args.source_ref,
                args.metadata_json,
                args.session_id,
                created_at,
                ts,
            ),
        )
    print(f"OK: {args.finding_type} {args.finding_id} indexado en {store_dir / DB_FILENAME}")


def cmd_search_findings(args: argparse.Namespace) -> None:
    """Busca hallazgos por texto completo — FTS5 + BM25 (sucesor de DEC-07).

    Reemplaza el LIKE original (substring sobre summary/content, sin
    ranking) por un indice invertido: ``findings_fts`` es una tabla FTS5 de
    "contenido externo" sobre ``findings_history`` (no duplica summary ni
    content, solo el indice), mantenida por los triggers de FTS_SCHEMA. El
    resultado se ordena por relevancia BM25 (``sqlite.org/fts5.html#the_bm25_function``,
    mas negativo = mas relevante), no por fecha. Adaptacion del patron de
    ``TencentDB Agent Memory: src/core/store/sqlite.ts:757-825`` — FTS5+BM25
    sin su tokenizador jieba (aqui el corpus es espanol/ingles, no chino) y
    sin su capa vectorial (fuera del alcance de DEC-07: este SQLite indexa
    texto, no embeddings).
    """
    store_dir = resolve_store_dir(args)
    try:
        match_query = _fts5_match_query(args.query)
    except ValueError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
    with connect(store_dir) as conn:
        if not fts_available(conn):
            print(
                "ERROR: FTS5 no disponible en este SQLite — buscar-hallazgos "
                "requiere fts5 (ver _create_fts_schema)",
                file=sys.stderr,
            )
            sys.exit(1)
        try:
            rows = conn.execute(
                "SELECT fh.finding_id, fh.submodule, fh.initiative, fh.finding_type, "
                "fh.severity, fh.summary, fh.source_ref "
                "FROM findings_fts "
                "JOIN findings_history fh ON fh.id = findings_fts.rowid "
                "WHERE findings_fts MATCH ? "
                "ORDER BY bm25(findings_fts)",
                (match_query,),
            ).fetchall()
        except sqlite3.OperationalError as error:
            print(f"ERROR: consulta FTS5 invalida ({error})", file=sys.stderr)
            sys.exit(1)
    for row in rows:
        severity = row["severity"] or "-"
        source_ref = row["source_ref"] or "-"
        print(
            f"{row['finding_id']}  [{row['submodule']}/{row['initiative']}]  "
            f"{row['finding_type']}/{severity}  {row['summary']}  ({source_ref})"
        )
    print(f"Total: {len(rows)} ({store_dir / DB_FILENAME})")


def cmd_auto_recall(args: argparse.Namespace) -> None:
    """Recall automatico sobre texto libre — para el hook ``UserPromptSubmit``.

    Adaptacion de ``TencentDB Agent Memory:
    src/core/hooks/auto-recall.ts:1-11`` (estrategia ``keyword``: FTS5 BM25)
    a nuestro indice propio. Su proposito es identico al de
    ``performAutoRecall()`` ahi: buscar memoria relevante ANTES de que el
    agente empiece a trabajar el prompt, sin que dependa de recordar
    invocar la busqueda el mismo. Se separa de ``buscar-hallazgos``
    (subcomando para el operador, AND, sin limite) porque el consumidor es
    distinto: aqui es un hook que corre en cada prompt y debe (a) tolerar
    texto libre sin sintaxis de busqueda, via ``_fts5_match_query_any``
    (OR), y (b) devolver pocos resultados (``--limit``) para no inflar el
    contexto en cada turno — el equivalente a la verdad de
    ``RECALL_TRUNCATION_SUFFIX`` de la referencia.

    Salida tab-separated (para el hook, no para lectura humana — esa es
    ``buscar-hallazgos``): ``finding_id\\tsubmodule/initiative\\ttype/severity\\tsummary\\tsource_ref``.
    Consulta sin terminos utiles o sin hits: silencio, exit 0 — no es un
    error, es "nada que recall".

    ``--limit`` se acota a ``[1, 20]`` — no se confia en el rango declarado
    por argparse (``type=int`` valida el tipo, no el rango). Patron tomado
    de ``TencentDB Agent Memory: index.ts:381`` (``Math.min(Math.max(n, 1),
    20)`` sobre el mismo parametro de sus herramientas de busqueda). Aqui
    el motivo es mas concreto que alla: SQLite trata ``LIMIT`` negativo como
    "sin limite", no como error — verificado [PROVEN]::

        >>> sqlite3.connect(':memory:').execute(
        ...     'CREATE TABLE t(x); INSERT INTO t VALUES (1),(2)... '
        ...     'SELECT x FROM t LIMIT -5').fetchall()
        # devuelve TODAS las filas, no cero

    Sin la cota, un ``--limit`` negativo (bug de invocacion, no input de
    usuario — el hook siempre pasa un literal) volcaria el indice completo
    de hallazgos en cada prompt, exactamente lo que este subcomando existe
    para evitar. Ver H-DOCS-164.

    Si fts5 no esta disponible en este binario (ver ``_create_fts_schema``),
    el mismo criterio de "nada que recall" aplica: silencio, exit 0 — un
    hook de cada prompt no puede fallar el turno completo por una capacidad
    de busqueda ausente.
    """
    store_dir = resolve_store_dir(args)
    try:
        match_query = _fts5_match_query_any(args.query)
    except ValueError:
        return
    limit = min(max(args.limit, 1), 20)
    with connect(store_dir) as conn:
        if not fts_available(conn):
            return
        try:
            rows = conn.execute(
                "SELECT fh.finding_id, fh.submodule, fh.initiative, fh.finding_type, "
                "fh.severity, fh.summary, fh.source_ref "
                "FROM findings_fts "
                "JOIN findings_history fh ON fh.id = findings_fts.rowid "
                "WHERE findings_fts MATCH ? "
                "ORDER BY bm25(findings_fts) LIMIT ?",
                (match_query, limit),
            ).fetchall()
        except sqlite3.OperationalError:
            return
    for row in rows:
        severity = row["severity"] or "-"
        source_ref = row["source_ref"] or "-"
        print(
            f"{row['finding_id']}\t{row['submodule']}/{row['initiative']}\t"
            f"{row['finding_type']}/{severity}\t{row['summary']}\t{source_ref}"
        )


def add_target_args(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--repo",
        default="docs",
        choices=VALID_REPOS,
        help="repo hermano objetivo (default: docs — de donde salen las tareas)",
    )
    p.add_argument(
        "--claude-dir",
        default=None,
        help="ruta absoluta a .claude/ (o .claude/agent-results/) del repo objetivo; "
        "manda sobre --repo",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="comando", required=True)

    p = sub.add_parser("init", help="crear el archivo SQLite unico si no existe")
    add_target_args(p)
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("registrar-sesion", help="pieza (a): registrar/actualizar una sesion de agente")
    add_target_args(p)
    p.add_argument("--agent-id", required=True)
    p.add_argument("--subagent-type", required=True)
    p.add_argument("--session-id", required=True)
    p.add_argument("--status", required=True, choices=["running", "completed", "failed"])
    p.add_argument("--output-key", default=None)
    p.add_argument("--timeout-at", default=None)
    p.add_argument("--type-source", default=None,
                    choices=("payload", "sidecar", "vacio_en_origen", "ausente"),
                    help="de dónde salió el tipo (:ref:`h-docs-481`)")
    p.set_defaults(func=cmd_register_session)

    p = sub.add_parser("actualizar-sesion", help="pieza (a): cambiar el status de una sesion existente")
    add_target_args(p)
    p.add_argument("--agent-id", required=True)
    p.add_argument("--status", required=True, choices=["running", "completed", "failed"])
    p.add_argument("--crear-si-falta", action="store_true",
                    help="crear la fila si el alta nunca ocurrio (SubagentStart no dispara — H-DOCS-167)")
    p.add_argument("--session-id", default=None, help="solo se usa al crear con --crear-si-falta")
    p.add_argument("--output-key", default=None)
    p.add_argument("--model", default=None,
                    help="identificador del modelo que SIRVIÓ el turno, del transcript "
                         "(ej. claude-sonnet-5). Un alias no vale aquí — ver --model-alias")
    p.add_argument("--model-alias", default=None,
                    help="alias con que se despachó (opus|sonnet|haiku|fable), del sidecar")
    p.add_argument("--effort", default=None,
                    help="nivel de esfuerzo del transcript (low|medium|high|xhigh|max)")
    p.add_argument("--client-version", default=None,
                    help="build del cliente que sirvió el agente, ej. 2.1.235")
    p.add_argument("--service-tier", default=None,
                    help="tier de servicio de usage, ej. standard")
    p.add_argument("--api-error-status", type=int, default=None,
                    help="código HTTP con que murió el agente, ej. 429 o 400")
    p.add_argument("--api-error-detail", default=None,
                    help="mensaje literal del error, con quotaLimits si lo hay")
    p.add_argument("--rate-limit-type", default=None,
                    help="tipo de límite que lo rechazó, ej. five_hour")
    p.add_argument("--stop-reason", default=None,
                    help="ÚLTIMO message.stop_reason del transcript: cómo cerró "
                         "su turno final (tool_use|stop_sequence|end_turn)")
    p.add_argument("--compactions", type=int, default=None,
                    help="eventos compactMetadata vistos en el transcript")
    p.add_argument("--dropped-tokens", type=int, default=None,
                    help="máximo cumulativeDroppedTokens — el campo ya es "
                         "acumulado, sumarlo contaría dos veces")
    p.add_argument("--outcome-source", default=None,
                    choices=("transcript", "journal", "api_error"),
                    help="qué instrumento decidió el status y el nivel de "
                         "retención; sin él, un nivel 4 no distingue «murió» "
                         "de «no se pudo saber»")
    p.add_argument("--description", default=None, help="ej. 'sweep TencentDB offload/' — de meta.json")
    p.add_argument("--turns", type=int, default=None, help="mensajes assistant unicos (dedup por message.id)")
    p.add_argument("--input-tokens", type=int, default=None)
    p.add_argument("--cache-creation-tokens", type=int, default=None)
    p.add_argument("--cache-read-tokens", type=int, default=None)
    p.add_argument("--output-tokens", type=int, default=None)
    p.add_argument("--equiv-cost", type=int, default=None,
                    help="input + 1.25*cache_creation + 0.1*cache_read + 5*output — H-DOCS-135/136")
    p.add_argument("--usage-source", default=None,
                    choices=("transcript", "no_medido"),
                    help="qué instrumento midió los tokens. Sin él, NULL en "
                         "las cuatro columnas de uso no distingue «no gastó» "
                         "de «nadie lo midió» (:ref:`h-docs-427`)")
    p.add_argument("--type-source", default=None,
                    choices=("payload", "sidecar", "vacio_en_origen", "ausente"),
                    help="de dónde salió el tipo. Sin él, `desconocido` no "
                         "distingue «la fuente lo emitió vacío» de «la clave "
                         "no venía» (:ref:`h-docs-481`)")
    p.add_argument("--spawn-depth", type=int, default=None,
                    help="profundidad de anidamiento — de spawnDepth del sidecar")
    p.add_argument("--subagent-type", default=None,
                    help="tipo real del subagente — de agentType del sidecar; "
                         "sólo sobrescribe si la fila dice 'desconocido'")
    p.add_argument("--source", default=None,
                    help="vía por la que se capturó la fila: hook | reconciliacion")
    p.add_argument("--tool-use-id", default=None,
                    help="toolUseId del sidecar — ata la fila a la llamada que la lanzó")
    p.add_argument("--duration-s", type=int, default=None,
                   help="segundos entre el primer y el ultimo timestamp del transcript")
    p.add_argument("--tool-uses-total", type=int, default=None,
                   help="bloques tool_use del transcript")
    p.add_argument("--tool-uses-json", default=None,
                   help='desglose por herramienta, ej. {"Bash": 128, "Write": 20}')
    p.add_argument("--prompt", default=None,
                   help="primer mensaje de usuario del transcript — que se le pidio")
    p.add_argument("--retention-level", type=int, default=None, choices=[1, 2, 3, 4],
                   help="nivel de retencion; ver .claude/rules/niveles-de-retencion.md")
    p.add_argument("--metadata-json", default=None,
                    help="ranura abierta en JSON para señales sin columna propia")
    p.add_argument("--metadata-merge-json", default=None,
                   help="funde estas claves en metadata_json sin borrar las que ya\n"
                        "estén; la comparten el hook y la reconciliación (h-docs-481)")
    p.set_defaults(func=cmd_update_session)

    p = sub.add_parser("censo-medicion",
                       help="reparto de filas por procedencia de la medición de "
                            "tokens, y agregado con su denominador (h-docs-427)")
    add_target_args(p)
    p.set_defaults(func=cmd_usage_census)

    p = sub.add_parser("listar-sesiones", help="pieza (a): listar sesiones registradas")
    add_target_args(p)
    p.add_argument("--status", default=None, choices=["running", "completed", "failed"])
    p.set_defaults(func=cmd_list_sessions)

    p = sub.add_parser(
        "snapshot-tareas",
        help="volcar el directorio de TASK del cliente a la tabla durable",
    )
    add_target_args(p)
    p.add_argument("--tasks-dir", required=True,
                   help="directorio con los <N>.json del cliente")
    p.add_argument("--session-id", default=None,
                   help="sesión de la que provienen (el directorio es por sesión)")
    p.add_argument("--source", default="snapshot",
                   help="vía de captura de la fila; default 'snapshot'")
    p.add_argument("--permitir-reasignacion", dest="allow_reassignment",
                   action="store_true",
                   help="volcar aunque el upsert cambie el sujeto de un id ya "
                        "acuñado. Por omisión eso REHÚSA (H-DOCS-1042): el id "
                        "cuelga de (session_id, task_id) y el sujeto es mutable "
                        "bajo él, así que volcar un directorio vivo sobre una "
                        "sesión con otras filas reasigna la cita en silencio")
    p.set_defaults(func=cmd_snapshot_tasks)

    p = sub.add_parser(
        "render-tablero",
        help="generar el tablero versionado DESDE el store (todas las sesiones)",
    )
    add_target_args(p)
    p.add_argument("--tasks-dir", default=None,
                   help="directorio vivo de la sesión activa; de ahí salen la "
                        "firma de estados y el .highwatermark, que el store no "
                        "tiene. Sin él el registro no sirve para detectar drift")
    p.add_argument("--session-id", default=None,
                   help="cuál de las sesiones del store es la activa")
    p.add_argument("-o", "--out", default=None,
                   help="ruta del .rst; sin ella imprime a stdout")
    p.set_defaults(func=cmd_render_tablero)

    p = sub.add_parser(
        "derivar-capa",
        help="poblar tasks.submodule desde lo que el texto de cada tarea ya dice",
    )
    add_target_args(p)
    p.add_argument("--dry-run", action="store_true",
                   help="cuenta sin escribir; el reparto por procedencia sale igual")
    p.add_argument("--rehacer", action="store_true",
                   help="recalcula tambien las ya derivadas (nunca las manuales)")
    p.set_defaults(func=cmd_derive_submodule)

    p = sub.add_parser(
        "agregar-hallazgo",
        help="pieza (b): indexar un hallazgo/tarea/decision/reporte YA escrito como RST",
    )
    add_target_args(p)
    p.add_argument("--finding-id", required=True, help="ej. H-API-625, T-106, DEC-03")
    p.add_argument("--submodule", required=True)
    p.add_argument("--initiative", required=True)
    p.add_argument(
        "--finding-type",
        default="finding",
        choices=["finding", "task", "decision", "report"],
    )
    p.add_argument("--severity", default=None, choices=["CRITICA", "ALTA", "MEDIA", "BAJA"])
    p.add_argument("--summary", required=True)
    p.add_argument("--content", required=True, help="resumen indexable, no el cuerpo completo del RST")
    p.add_argument(
        "--source-ref",
        default=None,
        help="cita PROVEN: file:line, repo@hash, o ruta al .rst que es la fuente de verdad",
    )
    p.add_argument("--metadata-json", default=None)
    p.add_argument("--session-id", default=None)
    p.add_argument("--date", default=None, help="override de created_at (ISO 8601); default: ahora")
    p.set_defaults(func=cmd_add_finding)

    p = sub.add_parser(
        "fechar-apertura",
        help="poblar opened_at con la cota superior mas temprana (H-DOCS-327, #774)",
    )
    add_target_args(p)
    p.add_argument("--tasks-dir", default=None,
                   help="directorio vivo de fichas del cliente (fuente ficha-mtime)")
    p.add_argument("--repo-tablero", default=None,
                   help="raiz del repo git que versiona el tablero (fuente git-tablero)")
    p.add_argument("--ruta-tablero", default=RUTA_TABLERO,
                   help=f"ruta del tablero dentro del repo (default: {RUTA_TABLERO})")
    p.add_argument("--reescribir", action="store_true",
                   help="recalcular tambien las que ya tienen opened_at (nunca las de hook)")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_date_opening)

    p = sub.add_parser(
        "fechar-documentos",
        help="poblar documents.updated_at con la cota MAS TARDIA de las dos "
        "(H-DOCS-411, #871) — el disparador del plazo de conservacion",
    )
    add_target_args(p)
    # `--repo` ya lo toma `add_target_args` con OTRO sentido —el nombre del repo
    # hermano cuyo store se abre— asi que la raiz del arbol documental necesita
    # su propia bandera. Mismo motivo por el que `fechar-apertura` usa
    # `--repo-tablero` y no `--repo`.
    p.add_argument("--repo-docs", default=".",
                   help="raiz del repo git que contiene los documentos (default: .)")
    p.add_argument("--subtree", default="source",
                   help="subarbol a recorrer dentro del repo (default: source)")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_date_documents)

    p = sub.add_parser(
        "clasificar-documentos",
        help="asignar a cada documento su SERIE (seccion/tipo) — la unidad de "
        "conservacion del catalogo (#872). El plazo NO se escribe: #760",
    )
    add_target_args(p)
    # Misma razon que en `fechar-documentos`: `--repo` ya esta tomado por
    # `add_target_args` con otro sentido.
    p.add_argument("--repo-docs", default=".",
                   help="raiz del repo git que contiene los documentos (default: .)")
    p.add_argument("--subtree", default="source",
                   help="subarbol a recorrer dentro del repo (default: source)")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_classify_documents)

    p = sub.add_parser(
        "buscar-tareas",
        help="consultar la tabla tasks — cross-sesion por omision (la superficie "
        "que faltaba: listar-sesiones cubre agentes, buscar-hallazgos cubre hallazgos)",
    )
    add_target_args(p)
    p.add_argument("--query", default=None, help="texto en subject o description (LIKE)")
    p.add_argument("--id", nargs="+", default=None, help="uno o varios task_id (con o sin #)")
    p.add_argument(
        "--status",
        default=None,
        choices=["pending", "in_progress", "completed"],
    )
    p.add_argument("--sesion", default=None, help="prefijo del session_id")
    p.add_argument("--submodulo", default=None, choices=list(SUBMODULES))
    p.add_argument("--limit", type=int, default=None)
    p.add_argument(
        "--detalle",
        action="store_true",
        help="imprimir description, sesion, origen y fechas de cada tarea",
    )
    p.set_defaults(func=cmd_search_tasks)

    p = sub.add_parser(
        "buscar-hallazgos",
        help="pieza (b): buscar hallazgos por texto completo (FTS5 + BM25, sucesor de DEC-07)",
    )
    add_target_args(p)
    p.add_argument("--query", required=True)
    p.set_defaults(func=cmd_search_findings)

    p = sub.add_parser(
        "auto-recall",
        help="pieza (b): recall automatico sobre texto libre para el hook UserPromptSubmit "
        "(adaptado de TencentDB Agent Memory src/core/hooks/auto-recall.ts)",
    )
    add_target_args(p)
    p.add_argument("--query", required=True)
    p.add_argument("--limit", type=int, default=3)
    p.set_defaults(func=cmd_auto_recall)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
