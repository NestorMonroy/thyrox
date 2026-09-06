#!/usr/bin/env python3
"""reconciliar_store.py — rellena ``agent_sessions`` con lo que el hook no vio.

El registro automático de subagentes depende de los hooks
``SubagentStart``/``SubagentStop`` (``register_agent_session.py``). Ese camino
es correcto y está probado, pero **es frágil por una razón que no está en el
guion**: el watcher de Claude Code sólo lee ``settings.json`` al arranque de la
sesión, así que un hook cableado después queda inerte hasta la sesión
siguiente. Cuando eso pasa, el trabajo no se pierde —el transcript queda en
disco— pero el store no se entera, y nadie lo nota.

Este guion cierra ese hueco por el otro extremo: en vez de confiar en que el
evento dispare, **lee lo que quedó en disco** y registra lo que falte. Es
idempotente y barato, así que puede correr en cada arranque de sesión.

No duplica la aritmética de costo: importa ``_extract_usage`` y
``_extract_meta`` de ``register_agent_session.py``, que a su vez portan la
fórmula ya probada de ``save-agent-result.mjs`` (dedup por ``message.id``;
input 1x / cache_creation 1.25x / cache_read 0.1x / output 5x). Una segunda
copia de esa fórmula sería una segunda fuente de verdad que nadie sincroniza
— justo lo que ``calibration-verified-numbers.md`` prohíbe.

**Distingue completado de cortado por evidencia, no por suposición.** El hook
marca ``completed`` siempre, y su docstring lo declara como limitación abierta.
Aquí sí se puede decidir: un subagente que terminó normalmente cierra su
transcript con un mensaje ``assistant``; uno cortado por límite de turnos
termina en ``user``, a media frase. Esa firma está medida y documentada en
``bash-background-tasks.md`` (83 de 84 cerraban en ``assistant``, uno en
``user``).

Uso::

    python3 .claude/scripts/agents/reconciliar_store.py            # registra lo que falte
    python3 .claude/scripts/agents/reconciliar_store.py --dry-run  # sólo reporta
"""
import argparse
import json
import os
import subprocess
import sqlite3
import sys
import time
from pathlib import Path

# El arranque: un módulo siempre sabe su propio directorio, y desde ahí
# `agents_paths` asciende al marcador. Sustituye la aritmética `parents[N]`,
# que contaba niveles del árbol de ORIGEN y quedó rota en la mudanza.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import agents_paths  # noqa: E402  — statement a nivel de módulo tras fijar sys.path

HERE = Path(__file__).resolve().parent
HOOKS = agents_paths.hooks_dir()
AGENT_STORE = HERE / "agent_store.py"
_PROJECTS_POR_DEFECTO = Path("/root/.claude/projects")

# Los DOS acoplamientos externos del guion: de dónde LEE y en qué ESCRIBE.
# `None` en ambos = el caso normal (transcripts del cliente, store de `docs`).
# Redirigir sólo uno no sirve para probar: con el store desviado y las
# transcripts reales, el pase intentaría dar de alta el corpus entero en un
# store vacío — más caro que tocar el real, que es lo contrario de lo que se
# buscaba. Ver :ref:`h-docs-239`.
_CLAUDE_DIR: "str | None" = None
_PROJECTS_DIR: "str | None" = None


def projects_dir() -> Path:
    """Raíz de transcripts. Se resuelve en cada llamada, no al importar.

    Misma pareja de vías que `_claude_dir`: la bandera para quien invoca
    directamente, la variable para quien invoca **a través de un hook**.
    """
    destino = _PROJECTS_DIR or os.environ.get("AGENT_STORE_PROJECTS_DIR")
    return Path(destino).expanduser().resolve() if destino else _PROJECTS_POR_DEFECTO


def _claude_dir() -> "str | None":
    """El directorio de store al que apuntar, o ``None`` para el de ``docs``.

    Dos vías, y la diferencia importa: la bandera ``--claude-dir`` sirve a
    quien invoca este guion directamente; la variable ``AGENT_STORE_CLAUDE_DIR``
    sirve a quien lo invoca **a través de un hook**, que arma su propia línea
    de comandos y no admite banderas de fuera.

    Sin la variable, la única forma de probar de punta a punta el hook que
    llama aquí sería dejarlo escribir en el store real — y una prueba que
    contamina el artefacto que audita no es una prueba. Es el mismo patrón, y
    la misma variable, que `register_agent_session.py::_destino`.

    La bandera gana sobre la variable: lo explícito por encima de lo ambiental.
    """
    return _CLAUDE_DIR or os.environ.get("AGENT_STORE_CLAUDE_DIR")


def store_db() -> Path:
    """Ruta del sqlite. Se resuelve en cada llamada, no al importar.

    El sufijo ``agent-results`` se añade salvo que el directorio ya se llame
    así — misma regla que `agent_store.resolve_store_dir`, para que la misma
    ruta valga en los dos guiones. Divergir aquí produciría dos stores donde
    el llamador cree que hay uno.

    El ancla es ``HERE.parents[1]`` (``.claude``), no ``HERE.parent``. Era
    ``HERE.parent`` cuando el guion vivía en ``.claude/scripts/``; la mudanza
    a ``agents/`` (``docs@d566c180``) lo dejó apuntando a
    ``.claude/scripts/agent-results/``, que no existe — y el guard
    ``if not db.exists()`` de ``_ids_en_store`` devolvía el conjunto vacío en
    vez de rehusar. Ver :ref:`h-docs-498`.
    """
    destino = _claude_dir()
    if not destino:
        return agents_paths.agent_results_dir() / "agent_store.sqlite3"
    raiz = Path(destino).expanduser().resolve()
    if raiz.name != "agent-results":
        raiz = raiz / "agent-results"
    return raiz / "agent_store.sqlite3"


def _destino() -> list:
    """Los argumentos con que se nombra el store al invocar `agent_store.py`."""
    destino = _claude_dir()
    return ["--claude-dir", destino] if destino else ["--repo", "docs"]

# Silencio por encima del cual un transcript deja de considerarse en curso.
# Derivado de medir el gap máximo entre líneas consecutivas sobre el corpus
# entero, no de una intuición: mediana 68 s, p95 181 s, y el mayor silencio de
# un agente que después entregó fue de 590 s. El único valor por encima
# (8296 s) es una reanudación por mensaje, no un silencio. Se toma con holgura
# porque los dos errores no cuestan igual: esperar de más retrasa una
# reconciliación que corre en cada sesión; esperar de menos inventa el
# desenlace de un agente que sigue trabajando.
SILENCIO_MAXIMO_S = 900

def _cargar_hook():
    """Importa ``register_agent_session.py`` — su nombre lleva guiones.

    Un nombre con guiones no es un identificador válido de Python, así que
    ``import`` no lo resuelve; se carga por ruta. Es la forma de reusar la
    fórmula de costo en vez de copiarla.
    """
    import importlib.util
    ruta = HOOKS / "register_agent_session.py"
    spec = importlib.util.spec_from_file_location("_register_agent_session", ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


_hook = _cargar_hook()
_extract_usage = _hook._extract_usage
_extract_meta = _hook._extract_meta
# Mudada al hook con #587, por la misma razon que `api_error` con #600: sus
# dos consumidores son el hook al cerrar la sesion —que es cuando el
# transcript existe con certeza— y este barrido, que es la red. La
# direccion de la dependencia ya era reconciliador -> hook; invertirla
# habria hecho que el camino principal dependiera de su red.
_telemetria = _hook._telemetria
_normalize_model = _hook.normalize_model
_normalize_model_alias = _hook.normalize_model_alias
# Mudada al hook con #600: sus dos consumidores (el hook al cerrar la sesion,
# este barrido al reparar) la necesitan, y el hook es el modulo base — copiarla
# habria duplicado el mecanismo (:ref:`h-docs-222`).
_api_error = _hook.api_error


def _sigue_escribiendo(transcript: Path) -> bool:
    """¿El transcript creció hace poco? Entonces su agente sigue vivo.

    Un agente en vuelo tiene un transcript **a medias**: su última línea es el
    ``tool_result`` que acaba de recibir, con rol ``user``. Esa es exactamente
    la firma que ``_final_role`` lee como «cortado sin entregar» — así que sin
    este guard, la reparación le fabrica un desenlace a un agente que está
    trabajando, y lo hace con la misma confianza con que cierra a un muerto.

    Es la ceguera de ``metrica-decide-la-conclusion.md`` en su forma más
    directa: **la firma del rol no distingue «terminó así» de «va por aquí»**,
    porque mide la forma del archivo y no el tiempo. El tiempo es el eje que
    falta, y `mtime` lo aporta gratis.

    Origen: al ampliar el pase de reparación para cubrir el desenlace erróneo
    (H-DOCS-208), los cuatro agentes de la tanda en vuelo quedaron cerrados en
    el store —dos ``failed``, dos ``completed``— mientras sus transcripts
    seguían creciendo, con `mtime` de hacía 2 a 21 segundos.
    """
    try:
        edad = time.time() - transcript.stat().st_mtime
    except OSError:
        return False
    return edad < SILENCIO_MAXIMO_S


_JOURNAL_CACHE = None


def _journal_index() -> dict:
    """``agentId`` → ``'result'`` | ``'started'``, leído de los journals.

    Es el instrumento que le faltaba al canal ``Workflow``. El transcript de un
    agente de workflow **no lleva su desenlace**: su valor de retorno viaja por
    el journal de la corrida, así que su última línea es el ``tool_result`` de
    ``StructuredOutput`` y su rol final es ``user`` — la misma firma que
    ``_final_role`` lee como «cortado sin entregar».

    Por eso ``_status`` dejaba esos transcripts en ``running``, y
    ``_nivel_de_retencion`` traducía ese ``running`` a **4**, que la regla
    define como *«murió sin entregar»*. Dos cosas distintas —murió y no se
    supo— colapsadas en un número: el sub-patrón **D** de
    ``metrica-decide-la-conclusion.md``, con el agravante de que el 4 se lee
    como un hecho y era una ausencia de medición.

    Medido al escribir esto sobre las 113 filas en nivel 4: **18** declaraban
    ``failed`` y las 18 traían su causa —ahí no faltaba nada—; **94** estaban
    en ``running``, y de ésas **83 tienen ``result`` en el journal** (o sea:
    entregaron) y **11 sólo ``started``** (ésas sí murieron). El journal cubre
    las 94: ninguna quedó fuera de todo journal.

    El índice se construye una vez por proceso — el barrido corre en cada
    ``Stop`` y releer los journals por agente los abriría N veces.
    """
    global _JOURNAL_CACHE
    if _JOURNAL_CACHE is not None:
        return _JOURNAL_CACHE
    indice = {}
    raiz = projects_dir()
    if raiz.exists():
        for j in raiz.rglob("subagents/workflows/*/journal.jsonl"):
            try:
                lineas = j.read_text(encoding="utf-8", errors="ignore").splitlines()
            except OSError:
                continue
            for linea in lineas:
                linea = linea.strip()
                if not linea:
                    continue
                try:
                    obj = json.loads(linea)
                except Exception:
                    continue
                agente, tipo = obj.get("agentId"), obj.get("type")
                if not agente:
                    continue
                # `result` gana sobre `started` sin importar el orden de
                # lectura: un agente que entregó tiene las dos líneas.
                if tipo == "result":
                    indice[agente] = "result"
                elif agente not in indice:
                    indice[agente] = "started"
    _JOURNAL_CACHE = indice
    return indice


def _final_role(transcript: Path) -> str:
    """Rol del último mensaje del transcript — la firma del corte.

    Devuelve ``assistant`` (cierre normal), ``user`` (cortado sin entregar) o
    ``desconocido`` si el archivo no se puede leer.
    """
    ultimo = "desconocido"
    try:
        with open(transcript, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                tipo = obj.get("type")
                if tipo in ("assistant", "user"):
                    ultimo = tipo
    except Exception:
        return "desconocido"
    return ultimo


def _ids_en_store() -> set:
    """Los ``agent_id`` que el store ya tiene.

    El conjunto vacío tiene DOS causas que no se parecen en nada: un store
    legítimamente vacío —o redirigido con ``--claude-dir`` a un directorio de
    prueba— y un store al que este guion apunta mal. La segunda degrada el
    pase entero sin fallar: todo transcript parece ausente y se vuelve a dar
    de alta cada vez. Medido con el ancla rota: **54.6 s y 278 altas** por
    pase, contra **11.6 s y 0** con la correcta (:ref:`h-docs-498`).

    Por eso el aviso se emite SÓLO en la rama derivada de ``__file__``: ahí un
    archivo ausente es un defecto de código, mientras que con ``--claude-dir``
    es el montaje normal de un test. Es el sub-patrón D de
    ``metrica-decide-la-conclusion.md`` — un control que no puede fallar no
    informa.
    """
    db = store_db()
    if not db.exists():
        if not _claude_dir():
            print(f"reconciliar-store: AVISO — el store derivado de __file__ no "
                  f"existe: {db}. Todo transcript se leerá como ausente.",
                  file=sys.stderr)
        return set()
    conn = sqlite3.connect(db)
    try:
        return {r[0] for r in conn.execute("SELECT agent_id FROM agent_sessions")}
    finally:
        conn.close()


def _ids_incompletos() -> set:
    """Filas ya presentes a las que les falta lo que el sidecar sí trae.

    Existen porque el alta pone ``'desconocido'`` cuando no puede leer el tipo,
    y porque las columnas del sidecar se añaden por migrado aditivo: una fila
    escrita antes de que la columna existiera queda en ``NULL`` para siempre si
    nadie vuelve a pasar. Reconciliar sólo lo ausente dejaría esa deuda
    congelada — el store tendría todas las filas y ninguna respondería «¿qué
    tipo de agente fue?».
    """
    db = store_db()
    if not db.exists():
        return set()
    conn = sqlite3.connect(db)
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(agent_sessions)")}
        # Se pregunta por cada columna sólo si el migrado ya la creó: contra un
        # store viejo, un SELECT sobre una columna ausente aborta el arranque de
        # la sesión entera — el hook corre en SessionStart.
        faltantes = ["subagent_type = 'desconocido'"]
        faltantes += [f"{c} IS NULL"
                      for c in ("spawn_depth", "source", "tool_use_id",
                                # Las cinco de 2026-08-19 — duración, actividad
                                # y encargo. Entran en la MISMA lista y no en un
                                # barrido aparte: una columna nueva sobre 366
                                # filas ya escritas es exactamente la deuda que
                                # esta función existe para pagar, y darle su
                                # propio pase sería una segunda forma de hacer
                                # lo mismo.
                                "duration_s", "tool_uses_total",
                                "tool_uses_json", "prompt", "retention_level",
                                # 2026-08-20: el modelo. Entra por la misma
                                # puerta que las demás — es deuda ya escrita,
                                # no una columna nueva. La mitad de las filas
                                # lo tienen en NULL porque el sidecar del que
                                # salía falta en un tercio de los casos
                                # (:ref:`h-docs-219`); ahora se deriva del
                                # transcript, que sigue en disco.
                                "model",
                                # 2026-08-20, #599: los tres ejes de
                                # comparabilidad (:ref:`h-docs-222`). Misma
                                # puerta, misma razón — sin ellos la fila
                                # existe y no responde «¿con qué esfuerzo y
                                # qué build corrió?», que es lo que #286
                                # necesita antes de ponderar dinero.
                                "effort", "client_version", "service_tier",
                                # 2026-08-20, #601: cómo cerró el turno. Su
                                # NULL es deuda, no ausencia legítima — todo
                                # turno cerró de alguna forma, y que el
                                # transcript no lo declare (42 de 277) es el
                                # instrumento callando, no el hecho faltando.
                                #
                                # `compactions`/`dropped_tokens` NO entran, y
                                # es deliberado: su NULL es la ausencia real
                                # —274 de 277 nunca se compactaron— y
                                # listarlas haría que el barrido reintentara
                                # filas sanas para siempre. Viajan igual, en
                                # el mismo pase que `stop_reason`: si una
                                # falta, faltan las tres.
                                "stop_reason")
                      if c in cols]
        # Y las que NO traen el identificador canonico del registro: una fila
        # que dice ``opus`` a secas —o ``opus 5``, la forma derivada que este
        # guion escribia antes— no nombra un registro, y la version decide el
        # tier de precio (:ref:`h-docs-218`). El discriminador es el prefijo
        # ``claude-``, que es como el cliente nombra cada modelo.
        if "model" in cols:
            faltantes.append("(model IS NOT NULL AND model NOT LIKE 'claude-%')")
        # La procedencia del veredicto (#653) sólo se reclama donde HAY
        # veredicto. Pedirla en `running` reintentaría filas sanas para
        # siempre: un agente en vuelo no tiene desenlace, así que tampoco
        # tiene instrumento que lo haya decidido. Es el mismo criterio con que
        # `compactions` se queda fuera de esta lista.
        if "outcome_source" in cols:
            faltantes.append("(status IN ('completed','failed') "
                             "AND outcome_source IS NULL)")
        return {r[0] for r in conn.execute(
            "SELECT agent_id FROM agent_sessions WHERE " + " OR ".join(faltantes))}
    finally:
        conn.close()


def _desenlace_erroneo(transcripts: list) -> set:
    """Filas cuyo transcript declara un error de API y el store no lo refleja.

    Es el hueco que ``_ids_incompletos`` no ve: aquélla pregunta por columnas
    en ``NULL``, y estas filas las tienen llenas — sólo que con el desenlace
    equivocado. Medido al escribir esto: de 16 transcripts con error de API,
    **12 figuraban como ``completed``** y 4 como ``running``.

    El falso ``completed`` es el peor de los dos, y su causa está en la firma
    de rol: el mensaje de error que el cliente fabrica **tiene rol
    ``assistant``** (con ``model: '<synthetic>'``), así que
    ``_final_role`` lo lee como el texto de entrega del agente. El
    instrumento no puede distinguir un cierre real de un fallo fabricado
    porque ambos son del mismo rol — la ceguera que
    ``metrica-decide-la-conclusion.md`` describe.

    Por eso ``_status`` consulta ``_api_error`` ANTES que la firma: no es una
    heurística mejor, es evidencia declarada que la firma no tiene.
    """
    db = store_db()
    if not db.exists():
        return set()
    conn = sqlite3.connect(db)
    try:
        filas = {r[0]: (r[1], r[2]) for r in conn.execute(
            "SELECT agent_id, status, api_error_status FROM agent_sessions")}
    finally:
        conn.close()
    malas = set()
    for t in transcripts:
        aid = t.name[len("agent-"):-len(".jsonl")]
        fila = filas.get(aid)
        if not fila:
            continue                      # lo cubre el pase de altas
        if not _api_error(t):
            continue
        # La causa vive en COLUMNA desde #600. Antes se preguntaba por
        # '"reason"' dentro de metadata_json; al promoverla, ese check habria
        # dado siempre negativo y remarcado mala cada fila ya reparada.
        if fila[0] != "failed" or fila[1] is None:
            malas.add(aid)
    return malas


def _desenlace_contra_journal(transcripts: list) -> set:
    """Filas cuyo ``status`` en el store discrepa del que el journal declara.

    Hermana de ``_desenlace_erroneo``, y por la misma razón: ``_ids_incompletos``
    pregunta por columnas en ``NULL`` y estas filas las tienen llenas — con el
    desenlace equivocado. Sin este pase, las 83 filas que el journal declara
    entregadas se quedarían en ``running``/nivel 4 para siempre, porque nada
    volvería a mirarlas.

    Es deuda que se paga sola: el barrido corre en cada ``Stop`` y los journals
    siguen en disco mientras el contenedor viva.
    """
    db = store_db()
    if not db.exists():
        return set()
    conn = sqlite3.connect(db)
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(agent_sessions)")}
        tiene_procedencia = "outcome_source" in cols
        campos = "agent_id, status" + (", outcome_source" if tiene_procedencia else "")
        filas = {r[0]: r[1:] for r in conn.execute(f"SELECT {campos} FROM agent_sessions")}
    finally:
        conn.close()
    diverge = set()
    indice = _journal_index()
    for t in transcripts:
        aid = _agent_id(t)
        fila = filas.get(aid)
        if not fila or aid not in indice:
            continue
        esperado = "completed" if indice[aid] == "result" else "failed"
        # Dos motivos para re-pasar: el estado no coincide, o coincide pero la
        # procedencia nunca se escribió (toda fila anterior a #653).
        if fila[0] != esperado or (tiene_procedencia and fila[1] is None):
            diverge.add(aid)
    return diverge


def _transcripts() -> list:
    """Todos los transcripts de subagente bajo los proyectos de este usuario.

    ``rglob`` y no ``glob`` con profundidad fija: la ruta real es
    ``projects/<slug-del-arbol>/<id-de-sesion>/subagents/`` — dos niveles, no
    uno. Un patrón de un solo nivel devuelve 0 y ese 0 se lee como «no hay
    nada que reconciliar», que es la ceguera de instrumento de
    ``metrica-decide-la-conclusion.md``. Se midió: con el patrón fijo, 0; con
    ``rglob``, 190.
    """
    raiz = projects_dir()
    if not raiz.exists():
        return []
    return sorted(raiz.rglob("subagents/agent-*.jsonl"))


def _nivel_de_retencion(transcript: Path, status: str) -> int:
    """El nivel que el reconciliador PUEDE medir — nunca el 2.

    Ver ``.claude/rules/niveles-de-retencion.md``. Aquí sólo se distingue 3 de
    4, que es lo que un barrido de disco alcanza a saber:

    - **3** — el agente terminó entregando y su transcript existe: hay algo
      recuperable, y su afirmación de haber persistido está sin verificar.
    - **4** — murió sin entregar: el resumen no existe o quedó a medias, así
      que no hay ni afirmación que verificar.

    El **2** no se escribe nunca desde aquí, y ésa es la mitad importante de
    la regla: promover exige verificación independiente contra el repo, y un
    guion que lee el transcript del propio agente no es independiente de él —
    mediría al agente con su propio testimonio.
    """
    return 3 if status == "completed" else 4


#: Las cuatro columnas que forman el bloque de uso. Se nombran una sola vez
#: porque el criterio «no medido» es sobre las CUATRO a la vez: una fila con
#: tres pobladas y una en NULL no es una fila sin medir, es una medición con
#: un cero legítimo — y medido al declarar la columna, ese caso existe (12
#: filas con ``cache_read_tokens = 0`` y el resto poblado).
_COLUMNAS_DE_USO = ("input_tokens", "cache_creation_tokens",
                    "cache_read_tokens", "output_tokens")


def _declarar_no_medido(en_disco: list) -> int:
    """Marca ``usage_source='no_medido'`` lo que ya no se puede medir.

    Tres condiciones, y las tres importan (:ref:`h-docs-427`):

    1. **Terminal** (``completed``/``failed``). Un agente vivo todavía puede
       ser medido; declararlo no medido sería cerrar lo que sigue abierto.
    2. **Las CUATRO columnas de uso en NULL.** Ver ``_COLUMNAS_DE_USO``: un
       cero medido no es una ausencia de medición, y colapsarlos es justo el
       defecto que esta marca existe para cerrar.
    3. **Sin transcript en disco.** Es lo que convierte «todavía no» en «ya
       no»: mientras el JSONL exista, el pase siguiente puede medirlo, y la
       fila debe quedarse en NULL —que aquí significa *sin clasificar*— en
       vez de mentir declarando irrecuperable algo recuperable.

    NULL sigue siendo un valor válido de la columna, y no es el mismo que
    ``no_medido``: separa «nadie ha pasado todavía» de «nadie podrá ya».
    Colapsarlos repetiría un nivel más abajo el defecto del que nace.
    """
    db = store_db()
    if not db.exists():
        return 0
    con_transcript = {t.name[len("agent-"):-len(".jsonl")] for t in en_disco}
    conn = sqlite3.connect(db)
    try:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(agent_sessions)")}
        if "usage_source" not in cols:
            return 0
        sin_medir = " AND ".join(f"{c} IS NULL" for c in _COLUMNAS_DE_USO)
        candidatos = [
            r[0] for r in conn.execute(
                "SELECT agent_id FROM agent_sessions "
                "WHERE status IN ('completed','failed') "
                f"AND usage_source IS NULL AND {sin_medir}")
        ]
        irrecuperables = [a for a in candidatos if a not in con_transcript]
        if not irrecuperables:
            return 0
        conn.executemany(
            "UPDATE agent_sessions SET usage_source='no_medido' WHERE agent_id=?",
            [(a,) for a in irrecuperables])
        conn.commit()
        return len(irrecuperables)
    finally:
        conn.close()


def _cierre(transcript: Path, agent_id: str, status: str) -> list:
    """Argumentos del ``actualizar-sesion`` para este transcript."""
    meta = _extract_meta(str(transcript))
    uso = _extract_usage(str(transcript))
    tele = _telemetria(transcript)

    cmd = [
        sys.executable, str(AGENT_STORE), "actualizar-sesion",
        *_destino(),
        "--agent-id", agent_id,
        "--status", status,
    ]
    for flag, key in (
        ("--turns", "turns"),
        ("--input-tokens", "input_tokens"),
        ("--cache-creation-tokens", "cache_creation_tokens"),
        ("--cache-read-tokens", "cache_read_tokens"),
        ("--output-tokens", "output_tokens"),
        ("--equiv-cost", "equiv_cost"),
    ):
        if key in uso:
            cmd += [flag, str(uso[key])]
    # QUÉ midió los tokens de arriba. Va pegado al bloque de uso y con su
    # misma condición porque es su procedencia: si se escribió alguna de las
    # cuatro columnas, el instrumento fue el transcript. Sin esta línea, la
    # fila medida y la nunca medida quedan indistinguibles en cuanto una de
    # las cuatro valga 0 (:ref:`h-docs-427`).
    if any(k in uso for k in ("input_tokens", "cache_creation_tokens",
                              "cache_read_tokens", "output_tokens")):
        cmd += ["--usage-source", "transcript"]
    # Los tres ejes de comparabilidad (:ref:`h-docs-222`, #599). Opcionales:
    # un transcript viejo puede no declarar `effort`, y su ausencia es
    # legitima — por eso `is not None` y no `in`.
    for flag, key in (
        ("--effort", "effort"),
        ("--client-version", "client_version"),
        ("--service-tier", "service_tier"),
        # El cierre y la compactacion (#601). Mismo bloque porque comparten el
        # criterio `is not None`: los tres pueden faltar legitimamente.
        ("--stop-reason", "stop_reason"),
        ("--compactions", "compactions"),
        ("--dropped-tokens", "dropped_tokens"),
    ):
        if uso.get(key) is not None:
            cmd += [flag, str(uso[key])]
    # Mismo criterio que el hook: manda el transcript, que declara lo que
    # SIRVIO el turno; el sidecar declara lo que se PIDIO, y lo declara como
    # alias — que ni siquiera fija la version (:ref:`h-docs-220`). El alias no
    # se pierde: va a su propia columna. Este pase corre en cada Stop, asi que
    # la deuda de las filas ya escritas se paga sola mientras el transcript
    # siga en disco (:ref:`h-docs-219`).
    modelo = uso.get("derived_model") or _normalize_model(meta.get("model"))
    if modelo:
        cmd += ["--model", modelo]
    alias = _normalize_model_alias(meta.get("model"))
    if alias:
        cmd += ["--model-alias", alias]
    if meta.get("description"):
        cmd += ["--description", meta["description"]]
    if meta.get("spawn_depth") is not None:
        cmd += ["--spawn-depth", str(meta["spawn_depth"])]
    if meta.get("subagent_type"):
        cmd += ["--subagent-type", meta["subagent_type"]]
    if meta.get("tool_use_id"):
        cmd += ["--tool-use-id", meta["tool_use_id"]]
    for flag, key in (
        ("--duration-s", "duration_s"),
        ("--tool-uses-total", "tool_uses_total"),
        ("--tool-uses-json", "tool_uses_json"),
        ("--prompt", "prompt"),
    ):
        if tele.get(key) is not None:
            cmd += [flag, str(tele[key])]
    cmd += ["--retention-level", str(_nivel_de_retencion(transcript, status))]
    # Qué instrumento decidió ese nivel (#653). Va SIEMPRE que haya veredicto:
    # el nivel sin su procedencia no se puede auditar, y auditarlo es el único
    # modo de saber cuántos «murió sin entregar» eran en realidad «no se supo».
    procedencia = _veredicto(transcript)[1]
    if procedencia:
        cmd += ["--outcome-source", procedencia]
    extra = dict(meta.get("extra") or {})
    # La causa de muerte va a COLUMNA desde #600, no a `metadata_json`. Antes
    # vivía en el JSON, que responde «¿por qué murió ESTE?» pero no «¿cuántos
    # murieron por cuota?» — no se agrupa. Y dejarla en los dos sitios sería la
    # segunda fuente de verdad que `calibration-verified-numbers.md` prohíbe.
    fallo = _api_error(transcript) or {}
    for flag, key in (
        ("--api-error-status", "api_error_status"),
        ("--api-error-detail", "api_error_detail"),
        ("--rate-limit-type", "rate_limit_type"),
    ):
        if fallo.get(key) is not None:
            cmd += [flag, str(fallo[key])]
    if extra:
        cmd += ["--metadata-json", json.dumps(extra, ensure_ascii=False)]
    # La procedencia es un hecho de ESTA ejecución: la fila la vio el barrido
    # de disco, no el evento. Distinguirlo es lo que permite preguntar después
    # si el canal de lanzamiento explica el fallo — con `hook` y
    # `reconciliacion` mezclados en una sola columna, la pregunta no existe.
    cmd += ["--source", "reconciliacion"]
    return cmd


def _registrar(transcript: Path, agent_id: str, session_id: str) -> bool:
    meta = _extract_meta(str(transcript))
    status = _status(transcript)

    alta = [
        sys.executable, str(AGENT_STORE), "registrar-sesion",
        *_destino(),
        "--agent-id", agent_id,
        "--subagent-type", meta.get("subagent_type") or "desconocido",
        "--session-id", session_id,
        "--status", "running",
    ]
    if subprocess.run(alta, capture_output=True, timeout=30).returncode != 0:
        return False
    cmd = _cierre(transcript, agent_id, status)
    return subprocess.run(cmd, capture_output=True, timeout=30).returncode == 0


def _completar(transcript: Path, agent_id: str) -> str:
    """Rellena una fila ya presente con lo que su sidecar trae y a ella falta.

    Devuelve **cuál de los tres desenlaces** ocurrió, no un booleano: desde que
    ``agent_store.py`` compara antes de escribir, un pase puede terminar bien y
    no cambiar nada. Contar los dos casos bajo «completados» era el sub-patrón
    D de ``metrica-decide-la-conclusion.md`` — el resumen decía 113 reparadas
    cada arranque y ninguna lo estaba: son las filas cuyo transcript no tiene
    el dato que les falta, y el pase las reintenta para siempre.

    El desenlace viaja por **stdout**, no por código de salida: el 0 lo leen ya
    ``_registrar`` y los hooks como «no falló», y reservar un código nuevo para
    «sin cambios» convertiría un pase sano en fallo para todo llamador que no
    conozca la convención.
    """
    cmd = _cierre(transcript, agent_id, _status(transcript))
    pase = subprocess.run(cmd, capture_output=True, timeout=30, text=True)
    if pase.returncode != 0:
        return "fallo"
    return "sin-cambios" if "(sin cambios)" in pase.stdout else "actualizada"


def _tiene_sidecar(transcript: Path) -> bool:
    """¿El transcript trae su ``.meta.json``?

    Es el discriminador del CANAL DE LANZAMIENTO, medido en H-DOCS-181: la
    herramienta ``Agent`` escribe sidecar; el canal ``Workflow`` no escribe
    ninguno. La separación es limpia — de 102 transcripts sin sidecar, 96 están
    citados en el journal de algún workflow; de 88 con sidecar, 0 lo están.
    """
    return transcript.with_suffix("").with_suffix(".meta.json").exists()


def _status(transcript: Path) -> str:
    """Estado derivado de la firma del último mensaje — SÓLO donde esa firma
    significa algo.

    La heurística ``rol final == user → cortado`` está calibrada sobre la forma
    de la herramienta ``Agent``, donde el texto final del asistente ES el canal
    de retorno: si falta, el agente no entregó.

    En el canal ``Workflow`` esa premisa es falsa. El valor de retorno viaja por
    el journal de la corrida, no por el texto final, así que la ausencia de
    texto es su forma NORMAL. Aplicarle la heurística leía esa forma como
    muerte: medido en H-DOCS-181, 91 de 102 agentes sin sidecar terminaban en
    rol ``user``, y **70 de esos 91** pertenecían a workflows que completaron
    con ``result`` no vacío. No fallaron.

    Por eso la firma se aplica sólo al transcript con sidecar. Sin él se deja
    ``running``, el único valor del vocabulario que NO afirma un desenlace —
    mismo criterio que ya regía para el transcript ilegible. Inventar
    ``completed`` sería el error simétrico: 15 de esos 91 sí venían de
    workflows caídos.

    **Desde #653 el journal SÍ se consulta** (era la tarea #448): el desenlace
    del agente de workflow está en ``workflows/*/journal.jsonl``, indexado por
    ``agentId``. Ver ``_journal_index``. Dejarlo en ``running`` era lo correcto
    mientras ese instrumento no existía; ahora existe, y seguir dejándolo sería
    declarar desconocido lo que está declarado.
    """
    return _veredicto(transcript)[0]


def _veredicto(transcript: Path) -> tuple:
    """``(status, outcome_source)`` — el desenlace y QUÉ lo decidió.

    Los dos viajan juntos a propósito. Sin la procedencia, un
    ``retention_level = 4`` no distingue «el agente murió» de «ningún
    instrumento supo verlo», y esa confusión es la que #653 midió: de 113
    filas en nivel 4, sólo 18 declaraban muerte real.

    El orden de consulta es un orden de **autoridad**, no de conveniencia:

    1. ``api_error`` — evidencia directa que el propio cliente escribió.
    2. ``journal``   — el desenlace declarado por el motor de workflow.
    3. ``transcript``— la firma del rol final, **sólo con sidecar**.

    Un transcript que sigue creciendo no tiene desenlace todavía y no se
    cierra; queda ``running`` sin procedencia, que es lo honesto.
    """
    # El error de API declarado gana sobre todo lo demás: es evidencia
    # directa, no una firma calibrada, así que vale incluso sin sidecar y
    # aunque el transcript acabe de escribirse — un agente que ya recibió su
    # error no va a seguir.
    if _api_error(transcript):
        return ("failed", "api_error")
    # Antes de leer ninguna firma: un transcript que sigue creciendo no tiene
    # desenlace todavía. Cerrarlo es inventarlo.
    if _sigue_escribiendo(transcript):
        return ("running", None)
    if not _tiene_sidecar(transcript):
        # Canal Workflow: su desenlace lo declara el journal, no el transcript.
        # `started` sin `result` es muerte REAL —el motor lo arrancó y nunca
        # recogió su valor—, y por eso `failed` aquí no es una firma calibrada
        # sino la ausencia de un registro que el motor sí escribe cuando hay.
        segun_journal = _journal_index().get(_agent_id(transcript))
        if segun_journal == "result":
            return ("completed", "journal")
        if segun_journal == "started":
            return ("failed", "journal")
        return ("running", None)
    rol = _final_role(transcript)
    estado = {"assistant": "completed", "user": "failed"}.get(rol)
    return (estado, "transcript") if estado else ("running", None)


def _agent_id(transcript: Path) -> str:
    return transcript.name[len("agent-"):-len(".jsonl")]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true",
                        help="reporta el hueco sin escribir en el store")
    parser.add_argument("--quiet", action="store_true",
                        help="sólo la línea de resumen")
    parser.add_argument("--claude-dir",
                        help="directorio del store al que apuntar; por defecto "
                             "el de `docs`. Misma semántica que la bandera "
                             "homónima de `agent_store.py`.")
    parser.add_argument("--projects-dir",
                        help="raíz de transcripts de la que leer; por defecto "
                             "la del cliente. Va en pareja con --claude-dir: "
                             "redirigir sólo el store deja al pase leyendo el "
                             "corpus real contra un store vacío.")
    args = parser.parse_args()

    global _CLAUDE_DIR, _PROJECTS_DIR
    if args.claude_dir:
        _CLAUDE_DIR = args.claude_dir
    if args.projects_dir:
        _PROJECTS_DIR = args.projects_dir

    presentes = _ids_en_store()
    incompletos = _ids_incompletos()
    en_disco = _transcripts()

    def _id(t: Path) -> str:
        return t.name[len("agent-"):-len(".jsonl")]

    faltan = [t for t in en_disco if _id(t) not in presentes]
    # NO se exige sidecar para re-pasar una fila incompleta. La versión
    # anterior sí lo hacía —"sin él no hay nada nuevo que escribir"— y esa
    # premisa dejó de ser cierta cuando ``_extract_usage`` empezó a derivar el
    # modelo del propio transcript (:ref:`h-docs-219`). Medido tras el primer
    # relleno: de 189 filas sin modelo, **102 tenían su transcript en disco** y
    # el guard las excluía a todas — justo las que el hook nunca pudo llenar,
    # porque el canal sin sidecar es el mismo que el canal sin modelo.
    # Una fila con el desenlace equivocado tampoco necesita sidecar: se corrige
    # leyendo el transcript.
    erroneas = _desenlace_erroneo(en_disco) | _desenlace_contra_journal(en_disco)
    # Un transcript que sigue creciendo no se repara: su fila `running` es
    # correcta, y el pase sólo podría empeorarla escribiendo un conteo parcial.
    vivos = [t for t in en_disco if _sigue_escribiendo(t)]
    en_vuelo = {_id(t) for t in vivos}
    reparables = [t for t in en_disco
                  if _id(t) not in en_vuelo
                  and (_id(t) in incompletos or _id(t) in erroneas)]

    if args.dry_run:
        print(f"transcripts en disco: {len(en_disco)} · "
              f"ya en el store: {len(en_disco) - len(faltan)} · "
              f"faltan: {len(faltan)} · "
              f"a reparar: {len(reparables)} "
              f"(de ellos {len(erroneas - en_vuelo)} con desenlace erróneo por "
              f"error de API) · en vuelo, sin tocar: {len(vivos)}")
        return 0

    ok = fallo = 0
    for t in faltan:
        if _registrar(t, _id(t), t.parent.parent.name):
            ok += 1
            if not args.quiet:
                print(f"  + {_id(t)}")
        else:
            fallo += 1

    reparados = intactos = 0
    for t in reparables:
        match _completar(t, _id(t)):
            case "actualizada":
                reparados += 1
                if not args.quiet:
                    print(f"  ~ {_id(t)}")
            case "sin-cambios":
                intactos += 1
            case _:
                fallo += 1

    # Después de reparar, no antes: una fila que este mismo pase acaba de
    # medir no debe marcarse como no medida.
    no_medidos = _declarar_no_medido(en_disco)

    print(f"reconciliar-store: {ok} registrados, {reparados} completados, "
          f"{intactos} sin cambios, {fallo} fallidos, "
          f"{len(en_disco) - len(faltan)} ya presentes, "
          f"{no_medidos} declarados no medidos "
          f"(alcance medido: {len(en_disco)} transcripts en disco)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
