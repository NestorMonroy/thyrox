#!/usr/bin/env python3
"""register_session — el registro de una sesión de subagente en el store.

Porte del mecanismo de ``kaupamex-docs: .claude/hooks/register_agent_session.py``
(875 líneas). Lo que viaja es el MECANISMO —normalizar el modelo, leer el uso
del transcript, distinguir la procedencia del tipo, componer la invocación del
store—; lo que se INYECTA es el destino, que es parámetro del consumidor
(DEC-04).

Qué corrige el porte, y no es cosmético
---------------------------------------
El original resolvía el destino ADENTRO: ``["--repo", "docs"]`` fijo, con un
override por variable de entorno para poder probarlo. O sea, el mecanismo
cargaba el nombre de UN consumidor, y un segundo no podía usarlo sin editarlo —
que es exactamente lo que DEC-04 separa. Aquí ``destination_args`` es una
función pura que **rehúsa** si no le dan ni repo ni directorio: inventar un
default sería volver a meter el nombre del consumidor en el proveedor.

Y componer se separa de ejecutar. ``build_command`` devuelve la lista de
argumentos sin lanzarla, así una prueba puede medir la FORMA del comando sin
escribir en ningún store. Antes las dos cosas vivían dentro de ``main()`` y la
única forma de medir la composición era dejarla escribir.

Lo que NO cambia
----------------
El nivel de retención lo escribe este mecanismo cuando el agente termina, no un
pase posterior: ``last_assistant_message`` sólo existe en el payload de
``SubagentStop`` y es el discriminador entre el **nivel 3** (persistencia
declarada) y el **4** (completitud percibida sin registro) de
``niveles-de-retencion.md``. Un pase de reconciliación ya no puede verlo.

El **nivel 2 no lo escribe este mecanismo, ni ninguno**: exige verificación
independiente del testimonio del agente, y este payload ES su testimonio.

Un fallo del subproceso NUNCA rompe el flujo del consumidor — pero se registra
vía ``hooks.error_log.run_and_log`` en vez de descartarse en silencio.
"""
import json
import os
import sys
from pathlib import Path

if __package__ in (None, ""):  # invocación directa como guion
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from hooks.error_log import run_and_log  # noqa: E402

#: El store es el hermano de este módulo — aritmética DENTRO de thyrox, que es
#: legítima: el archivo y su vecino se mudan juntos. Lo que no sería legítimo es
#: anclar al árbol del CONSUMIDOR por aritmética (H-DOCS-1126).
AGENT_STORE = Path(__file__).resolve().parent / "agent_store.py"



MODELO_SINTETICO = "<synthetic>"

# Razon de precio de ``cache_write`` frente a ``input``, por TTL. Identica en
# los seis tiers de precio del cliente — ver :ref:`h-docs-218`, que la midio
# normalizando cada tier por su propio ``input``.
RAZON_CACHE_WRITE = {"5m": 1.25, "1h": 2.00}

# Prefijo con que el registro del cliente nombra a TODOS sus modelos. Es la
# gramatica, no una lista: los 17 registros la cumplen, incluidos los de
# gramatica vieja donde la version va primero (``claude-3-5-sonnet``). Se usa
# como discriminador porque una lista escrita aqui envejeceria con la build.
#
#   B=$(readlink -f "$(command -v claude)"); strings -n 4 "$B" > cc.txt
#   grep -o '{id:"claude-[a-z0-9-]*"' cc.txt | sort -u
MODEL_ID_PREFIX = "claude-"

# Los alias que el cliente admite en ``model:``. Salen del bloque
# ``aliases:{…}`` del ejecutable, no de memoria; el mismo bloque declara que
# cada uno resuelve a un identificador DISTINTO por proveedor, que es por lo
# que un alias no puede ocupar la columna del modelo (:ref:`h-docs-220`).
#
#   python3 -c "t=open('cc.txt').read(); i=t.find('aliases:{'); print(t[i:i+600])"
MODEL_ALIASES = ("opus", "sonnet", "haiku", "fable")


def normalize_model(raw: str | None) -> str | None:
    """El identificador del modelo, o ``None`` si el valor no lo es.

    Directiva del ejecutor 2026-08-20: *"para que no existan problemas,
    guardala como en su referencia: ``claude-sonnet-5``, ``claude-opus-5``,
    ``claude-haiku-4-5`` …"*. La columna guarda el identificador **verbatim**,
    no una forma derivada: cualquier traduccion nuestra es una segunda fuente
    de verdad que hay que mantener sincronizada con el registro del cliente.

    **Lo que no es un identificador no se guarda.** Directiva del ejecutor
    2026-08-20, sobre la version anterior de esta funcion, que devolvia
    ``raro-x`` tal cual: *"no esta bien dejarlo como raro-x; se tiene que usar
    lo que sale del jsonl o el analisis a profundidad, ya sea con los binarios
    o con el claude_strings.txt"*. Devolver el valor crudo convertia la columna
    en «lo que alguien haya escrito», y una columna asi no se puede ponderar
    (#286) ni agrupar.

    Tres entradas caen a ``None``, cada una por una razon distinta:

    - ``<synthetic>`` — no es un modelo: es el mensaje que fabrica el cliente,
      con ``usage`` todo ceros.
    - un **alias** (``sonnet``) — nombra una familia, y el proveedor decide a
      que identificador resuelve. Se guarda aparte, en ``model_alias``.
    - cualquier otra cosa — no la produce ningun canal medido. El universo real
      de ``message.model`` en los 277 transcripts de subagente son **5**
      valores: cuatro identificadores y ``<synthetic>``.

    Por que importa la version y no basta la familia: dos versiones de una
    misma familia pueden estar en tiers de precio distintos — opus 4.0 y 4.1
    facturan 15/75 por millon, y de opus 4.5 en adelante 5/25, tres veces
    menos (:ref:`h-docs-218`).
    """
    if not raw or raw == MODELO_SINTETICO:
        return None
    valor = str(raw)
    return valor if valor.startswith(MODEL_ID_PREFIX) else None


def normalize_model_alias(raw: str | None) -> str | None:
    """El alias que escribio quien lanzo el agente — que NO es el modelo.

    Es dato real y no derivable del transcript: dice que se PIDIO, mientras
    que ``model`` dice que SIRVIO el turno. Los dos pueden diferir, y el
    registro del cliente lo declara: ``sonnet`` resuelve a ``claude-sonnet-5``
    por defecto y a ``claude-sonnet-4-5`` en cuatro proveedores.

    Se valida contra los cuatro alias declarados: un valor que no es ni
    identificador ni alias no tiene procedencia y no se guarda.
    """
    if not raw:
        return None
    valor = str(raw)
    return valor if valor in MODEL_ALIASES else None


def api_error(transcript_path) -> dict | None:
    """El error de API que mato al agente, si el transcript lo declara.

    No es heuristica: el cliente escribe el fallo como un evento propio, con
    su motivo en clave. La ultima linea de un agente muerto por limite de
    sesion trae ``isApiErrorMessage: true``, ``error: 'rate_limit'``,
    ``apiErrorStatus: 429`` y un ``message.model`` de ``<synthetic>`` — el
    mensaje lo fabrica el cliente, no el modelo.

    Por eso este discriminador vale **sin sidecar**, a diferencia de la firma
    de rol: aquella infiere el desenlace de una forma calibrada, esta lo lee
    declarado. Un agente con este evento esta muerto, y el motivo no hay que
    adivinarlo.

    Vive en el hook —y no en el reconciliador, que es donde nacio— porque el
    hook es el modulo base: el reconciliador lo importa, no al reves. Con la
    causa de muerte a columna (#600) sus dos consumidores la necesitan, y
    copiarla habria duplicado el mecanismo (:ref:`h-docs-222`).

    Origen: H-DOCS-208. Los cuatro agentes que el limite de sesion mato el
    2026-08-19 quedaron en ``running`` porque ``SubagentStop`` no dispara ante
    un error de API — la fila nunca se cerraba y su costo (12 134 818 de
    ``equiv_cost`` combinado) quedaba invisible.
    """
    ultimo = None
    cuota = None
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                # ``quotaLimits`` viaja en su propia linea, no en la del error:
                # medido, los 4 transcripts que lo declaran son subconjunto de
                # los 16 con error, y aportan el TIPO de limite — no agentes
                # nuevos. Se acumula aparte para no perderlo si el reseteo de
                # abajo descarta la linea del error.
                q = obj.get("quotaLimits")
                if isinstance(q, dict) and q.get("status") == "rejected":
                    cuota = q
                if obj.get("isApiErrorMessage"):
                    ultimo = obj
                elif obj.get("type") in ("assistant", "user"):
                    # Un mensaje real posterior significa que el agente
                    # sobrevivio al error: solo cuenta el que cierra.
                    ultimo = None
                    cuota = None
    except Exception:
        return None
    if not ultimo:
        return None
    texto = ""
    contenido = (ultimo.get("message") or {}).get("content") or []
    if contenido and isinstance(contenido, list):
        texto = (contenido[0] or {}).get("text", "")
    if cuota:
        # El ``resetsAt`` no gana columna propia: es forense del momento, no
        # agregable. Va al detalle, que es donde se lee cuando alguien
        # investiga ESE agente.
        texto = f"{texto} · quotaLimits={json.dumps(cuota, sort_keys=True)}".strip(" ·")
    return {
        "reason": ultimo.get("error") or "api_error",
        "api_error_status": ultimo.get("apiErrorStatus"),
        "api_error_detail": texto[:600] or None,
        "rate_limit_type": (cuota or {}).get("rateLimitType"),
    }


def _moda(conteo: dict[str, int]) -> str | None:
    """El valor mas frecuente, o ``None`` si el conteo esta vacio.

    Se prefiere la moda al primero o al ultimo porque un transcript puede
    cruzar varios valores —seis builds del cliente conviven en el corpus— y
    el representativo de la fila es el que domino, no el que quedo al borde.
    """
    return max(conteo, key=lambda k: conteo[k]) if conteo else None


def _extract_usage(transcript_path: str) -> dict:
    """Uso de tokens del transcript, deduplicado por ``message.id``.

    Puerto de la logica ya probada de ``save-agent-result.mjs`` — ver el
    comentario H-DOCS-135/H-DOCS-136 ahi para la evidencia medida de por
    que el dedup es obligatorio (sin el, un turno con N tool-calls infla
    el conteo ~2x).

    Ademas del uso, devuelve dos cosas que el mismo recorrido ya tenia a la
    vista y descartaba (:ref:`h-docs-219`):

    1. **El modelo**, por la MODA de ``message.model``. El sidecar
       ``agent-<id>.meta.json`` es la fuente preferente pero falta en un
       tercio de los casos; este recorrido lo recupera casi siempre. La moda
       —no el primero ni el ultimo— porque un transcript puede traer
       ``<synthetic>`` mezclado: es el mensaje que fabrica el cliente, no
       una respuesta del modelo.

    2. **El perfil de ejecucion**, que NO es el mismo entre modelos. Dos ejes
       medidos que el store no guardaba:

       - ``thinking_tokens`` (``usage.output_tokens_details``) — se facturan
         como salida, que es el componente de peso 5x, y su proporcion varia
         por familia.
       - el reparto de ``cache_creation`` por **TTL**, que el payload declara
         campo a campo en ``usage.cache_creation``. Es lo que decide la razon
         de peso: 1.25x para 5 min, 2.00x para 1 hora.

    ``<synthetic>`` se excluye del conteo de turnos: su ``usage`` es todo
    ceros, asi que no altera el costo, pero contarlo como turno inflaria la
    unica columna que mide cuantas veces respondio el modelo.
    """
    por_id: dict[str, dict] = {}
    # Los tres ejes que hacen COMPARABLES dos filas: con que esfuerzo corrio,
    # que build lo sirvio y con que tier se facturo (:ref:`h-docs-222`, #599).
    # ``effort`` y ``version`` viven en el nivel superior de la linea, no en
    # ``message``, asi que se recogen ANTES del filtro por tipo: el recorrido
    # anterior las descartaba sin verlas.
    esfuerzos: dict[str, int] = {}
    versiones: dict[str, int] = {}
    tiers: dict[str, int] = {}
    # #601 — las dos señales de :ref:`h-docs-222` que faltaban, y viven en
    # niveles distintos: ``compactMetadata`` en el nivel superior de la linea
    # (medido: 3 eventos, 0 dentro de ``message``) y ``stop_reason`` dentro de
    # ``message``.
    compactaciones = 0
    tokens_tirados = 0
    ultimo_cierre: str | None = None
    # El DENOMINADOR del recorrido (:ref:`h-docs-427`, tarea #899). Sin el, la
    # suma no dice sobre cuantos mensajes se computo, y un transcript truncado
    # publica la misma cifra que uno completo. Son DOS contadores y no uno
    # porque el hueco tiene dos causas distintas —un mensaje sin ``usage`` y un
    # ``id`` repetido que el dedup absorbe— y colapsarlas escondería cual ocurrio.
    assistant_messages = 0
    messages_without_usage = 0
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue

                if obj.get("effort"):
                    esfuerzos[str(obj["effort"])] = esfuerzos.get(str(obj["effort"]), 0) + 1
                if obj.get("version"):
                    versiones[str(obj["version"])] = versiones.get(str(obj["version"]), 0) + 1

                cm = obj.get("compactMetadata")
                if isinstance(cm, dict):
                    compactaciones += 1
                    tokens_tirados = max(
                        tokens_tirados, int(cm.get("cumulativeDroppedTokens") or 0))

                if obj.get("type") != "assistant":
                    continue
                msg = obj.get("message") or {}
                if msg.get("role") != "assistant":
                    continue
                assistant_messages += 1
                # ANTES del guard de ``usage``: un mensaje puede declarar como
                # cerro el turno sin traer contabilidad, y leerlo despues del
                # guard lo perderia en silencio.
                if msg.get("stop_reason"):
                    ultimo_cierre = str(msg["stop_reason"])
                usage = msg.get("usage")
                mid = msg.get("id")
                if not usage or not mid:
                    messages_without_usage += 1
                    continue
                if usage.get("service_tier"):
                    tier = str(usage["service_tier"])
                    tiers[tier] = tiers.get(tier, 0) + 1
                cache_creation = usage.get("cache_creation") or {}
                detalle = usage.get("output_tokens_details") or {}
                por_id[mid] = {
                    "model": msg.get("model"),
                    "input": usage.get("input_tokens", 0) or 0,
                    "cache_creation": usage.get("cache_creation_input_tokens", 0) or 0,
                    "cache_read": usage.get("cache_read_input_tokens", 0) or 0,
                    "output": usage.get("output_tokens", 0) or 0,
                    "cache_5m": cache_creation.get("ephemeral_5m_input_tokens", 0) or 0,
                    "cache_1h": cache_creation.get("ephemeral_1h_input_tokens", 0) or 0,
                    "thinking": detalle.get("thinking_tokens", 0) or 0,
                }
    except Exception:
        return {}
    if not por_id:
        return {}
    campos = ("input", "cache_creation", "cache_read", "output",
              "cache_5m", "cache_1h", "thinking")
    totales = dict.fromkeys(campos, 0)
    modelos: dict[str, int] = {}
    turnos = 0
    for v in por_id.values():
        for k in campos:
            totales[k] += v[k]
        mod = v["model"]
        if mod and mod != MODELO_SINTETICO:
            modelos[mod] = modelos.get(mod, 0) + 1
            turnos += 1

    # La razon de ``cache_creation`` se DERIVA del reparto medido, no se fija
    # a mano. Con el reparto ausente (transcript viejo, o campo que el cliente
    # no emitio) cae al 1.25x que la formula usaba, y eso queda declarado en
    # el perfil como ``ttl_medido: false``.
    con_ttl = totales["cache_5m"] + totales["cache_1h"]
    if con_ttl:
        razon = (
            totales["cache_5m"] * RAZON_CACHE_WRITE["5m"]
            + totales["cache_1h"] * RAZON_CACHE_WRITE["1h"]
        ) / con_ttl
    else:
        razon = RAZON_CACHE_WRITE["5m"]

    equiv = round(
        totales["input"] + razon * totales["cache_creation"]
        + 0.1 * totales["cache_read"] + 5 * totales["output"]
    )
    crudo = max(modelos, key=lambda m: modelos[m]) if modelos else None
    modelo = normalize_model(crudo)
    return {
        # Sin ningun mensaje no-sintetico, ``turns`` cae al conteo de ids: es
        # el comportamiento anterior, y no hay con que mejorarlo.
        "turns": turnos or len(por_id),
        # El alcance de esta suma, para que quien la cite pueda publicarlo
        # (:ref:`h-docs-427`). ``usage_messages`` es el numerador —ids unicos
        # que aportaron tokens— y ``assistant_messages`` el universo recorrido.
        # Su diferencia se reparte entre ``messages_without_usage`` y los ids
        # repetidos que el dedup absorbio; las dos van por separado porque una
        # es un hueco y la otra es el mecanismo funcionando.
        "usage_messages": len(por_id),
        "assistant_messages": assistant_messages,
        "messages_without_usage": messages_without_usage,
        "input_tokens": totales["input"],
        "cache_creation_tokens": totales["cache_creation"],
        "cache_read_tokens": totales["cache_read"],
        "output_tokens": totales["output"],
        "equiv_cost": equiv,
        "derived_model": modelo,
        # --- Los tres ejes de comparabilidad (:ref:`h-docs-222`, #599). Cada
        # uno por su MODA, no por la primera ni la ultima: un transcript puede
        # cruzar varios valores y el representativo es el que domina. El
        # desglose completo va al perfil, para que la moda nunca lo oculte.
        "effort": _moda(esfuerzos),
        "client_version": _moda(versiones),
        "service_tier": _moda(tiers),
        # --- El cierre y la compactacion (:ref:`h-docs-222`, #601).
        #
        # ``stop_reason`` va por el ULTIMO valor, no por la moda: la pregunta
        # que responde es «como cerro este agente», y eso lo dice su ultimo
        # turno. La moda diria ``tool_use`` en casi todos —es lo que devuelve
        # cada turno intermedio— y borraria justo la distincion util.
        #
        # ``dropped_tokens`` toma el MAXIMO de los ``cumulativeDroppedTokens``
        # vistos porque el campo ya es acumulado: con dos compactaciones, la
        # segunda incluye a la primera, y sumarlas contaria dos veces.
        "stop_reason": ultimo_cierre,
        "compactions": compactaciones or None,
        "dropped_tokens": tokens_tirados or None,
        "perfil": {
            "thinking_tokens": totales["thinking"],
            "cache_write_5m": totales["cache_5m"],
            "cache_write_1h": totales["cache_1h"],
            "cache_write_ratio": round(razon, 4),
            "ttl_medido": bool(con_ttl),
            # Verbatim, incluido ``<synthetic>``: el perfil registra lo que el
            # transcript declaro, no lo que la columna ``model`` acepta.
            "modelos_vistos": dict(modelos),
            "turnos_sinteticos": len(por_id) - turnos,
            # El desglose de lo que la columna resume por moda. Sin el, un
            # agente que cruzo dos builds o bajo el esfuerzo a mitad se lee
            # como uniforme — que es la ceguera de
            # ``metrica-decide-la-conclusion.md`` aplicada a nuestra propia
            # telemetria.
            "esfuerzos_vistos": dict(esfuerzos),
            "versiones_vistas": dict(versiones),
            "tiers_vistos": dict(tiers),
        },
    }


def _extract_cache_resets(transcript_path: str) -> list[int]:
    """Turnos (1-indexados, mismo orden que ``_extract_usage``) donde
    ``cache_read`` cae más de 50% respecto al turno anterior, viniendo de un
    valor >10000 — señal de que el caché de contexto se invalidó y el turno
    tuvo que reescribirlo completo desde cero (H-DOCS-171).

    Medido: dos agentes de una misma tanda de 4 paralelos mostraron
    exactamente este patrón (``cache_read`` cayendo a la misma línea base en
    ambos, con sólo 10-15s de gap — descarta expiración por TTL de 5 min) y
    su costo real terminó siendo 1.6-2x más alto que el titular que el
    harness había reportado en el momento del evento de fallo. Un tercer
    agente de la misma tanda, sin ningún reset, sí coincidió con su titular.
    """
    por_id: dict[str, dict[str, int]] = {}
    order: list[str] = []
    try:
        with open(transcript_path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                if obj.get("type") != "assistant":
                    continue
                msg = obj.get("message") or {}
                if msg.get("role") != "assistant":
                    continue
                usage = msg.get("usage")
                mid = msg.get("id")
                if not usage or not mid:
                    continue
                if mid not in por_id:
                    order.append(mid)
                por_id[mid] = {
                    "cache_read": usage.get("cache_read_input_tokens", 0) or 0,
                    "cache_creation": usage.get("cache_creation_input_tokens", 0) or 0,
                    "input": usage.get("input_tokens", 0) or 0,
                    "output": usage.get("output_tokens", 0) or 0,
                }
    except Exception:
        return []
    resets: list[int] = []
    prev_cr: int | None = None
    for n, mid in enumerate(order, 1):
        v = por_id[mid]
        vacio = not (v["cache_read"] or v["cache_creation"] or v["input"] or v["output"])
        if vacio:
            continue
        if prev_cr is not None and prev_cr > 10000 and v["cache_read"] < prev_cr * 0.5:
            resets.append(n)
        prev_cr = v["cache_read"]
    return resets


def _extract_meta(transcript_path: str) -> dict:
    """Lee el sidecar ``agent-<id>.meta.json`` junto al transcript, si existe.

    El sidecar nombra el tipo ``agentType`` — NO ``subagent_type``, que es como
    lo llama el payload del hook y la columna del store. Leerlo por el nombre
    de la columna devuelve ``None`` sin error, y la fila queda en
    ``'desconocido'``: el defecto que dejó 188 de 227 filas sin tipo. Ver
    H-DOCS-178.

    ``spawnDepth`` es la única señal del sidecar que describe la POSICIÓN del
    agente en el árbol de despacho; se expone para que el store pueda
    responder si un agente anidado falla más que uno lanzado desde el
    orquestador.
    """
    ruta = str(transcript_path)
    if not ruta.endswith(".jsonl"):
        return {}
    meta_path = Path(ruta[: -len(".jsonl")] + ".meta.json")
    if not meta_path.exists():
        return {}
    try:
        datos = json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    conocidas = {"model", "description", "agentType", "spawnDepth", "toolUseId"}
    return {
        "model": datos.get("model"),
        "description": datos.get("description"),
        "subagent_type": datos.get("agentType"),
        "spawn_depth": datos.get("spawnDepth"),
        "tool_use_id": datos.get("toolUseId"),
        # Lo que el sidecar traiga y aquí no tenga columna va a la ranura
        # abierta en vez de perderse: una clave nueva del harness se guarda
        # desde el primer día y se promueve a columna cuando se consulte.
        "extra": {k: v for k, v in datos.items() if k not in conocidas} or None,
    }


def _telemetria(transcript) -> dict:
    """Duración, usos de herramienta y prompt — un solo barrido del transcript.

    Las tres salen del mismo archivo que ya se lee para el costo, y las tres
    son lo que el titular del harness muestra en vivo («24 min · 540k tokens ·
    90 usos de la herramienta bash») y el store no guardaba. Directiva del
    ejecutor 2026-08-19.

    La duración se mide entre el primer y el último ``timestamp`` del
    transcript, **no** con ``updated_at - started_at``: aquéllas dicen cuándo
    el store vio al agente, no cuánto trabajó, y en una fila que el hook no
    cerró son la misma marca (H-DOCS-208).

    *Métrica:* bloques ``tool_use`` emitidos por el asistente, agrupados por
    ``name``.
    *Ciega a:* el trabajo que un `Bash` hace dentro de una sola llamada — un
    guion de 300 líneas cuenta lo mismo que un ``ls``. Es una medida de
    ACTIVIDAD, no de esfuerzo.
    """
    tools: dict[str, int] = {}
    prompt = None
    primero = ultimo = None
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
                ts = obj.get("timestamp")
                if ts:
                    primero = primero or ts
                    ultimo = ts
                msg = obj.get("message") or {}
                if obj.get("type") == "assistant":
                    for bloque in msg.get("content") or []:
                        if isinstance(bloque, dict) and bloque.get("type") == "tool_use":
                            nombre = bloque.get("name") or "desconocida"
                            tools[nombre] = tools.get(nombre, 0) + 1
                elif obj.get("type") == "user" and prompt is None:
                    # Sólo el primer mensaje de usuario GENUINO: los ecos de
                    # `tool_result` también llegan con type 'user', y tomar uno
                    # de ésos guardaría la salida de un comando como si fuera
                    # el encargo.
                    cont = msg.get("content")
                    if isinstance(cont, str):
                        prompt = cont
                    elif isinstance(cont, list) and cont and all(
                        isinstance(b, dict) and b.get("type") == "text" for b in cont
                    ):
                        prompt = "\n".join(b.get("text", "") for b in cont)
    except Exception:
        return {}

    duracion = None
    if primero and ultimo:
        try:
            from datetime import datetime
            fmt = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
            duracion = int((fmt(ultimo) - fmt(primero)).total_seconds())
        except Exception:
            duracion = None
    return {
        "duration_s": duracion,
        "tool_uses_total": sum(tools.values()) or None,
        "tool_uses_json": json.dumps(tools, ensure_ascii=False) if tools else None,
        "prompt": prompt,
    }

def destination_args(repo: str | None = None,
                     claude_dir: str | None = None) -> list[str] | None:
    """Compone el destino del store. Es PARÁMETRO del consumidor, no del mecanismo.

    Devuelve ``None`` —no un default— cuando no se declara ninguno: thyrox no
    sabe a qué store escribe un kaupamex-*, y fabricar ``["--repo", "docs"]``
    metería el nombre de un consumidor dentro del proveedor.

    ``claude_dir`` gana sobre ``repo`` porque es el más específico: nombra el
    directorio, no el repo que hay que resolver.
    """
    if claude_dir:
        return ["--claude-dir", str(claude_dir)]
    if repo:
        return ["--repo", str(repo)]
    return None


def type_source(payload: dict) -> str:
    """La PROCEDENCIA del tipo de agente, que no es su valor.

    H-DOCS-481: ``desconocido`` colapsa dos hechos con veredictos distintos, y
    la fuente los produce por caminos separados (binario 2.1.246):

        SubagentStart   agent_type: n        — sin alternativa
        SubagentStop    agent_type: a ?? ""  — cadena VACÍA si el cliente no lo tiene

    Misma forma que ``usage_source`` para los tokens: la columna guarda de dónde
    viene el dato, no el dato — por eso puede declarar que no hay dato.
    """
    if payload.get("agent_type"):
        return "payload"
    if "agent_type" in payload:
        return "vacio_en_origen"
    return "ausente"


def build_command(mode: str, payload: dict, store_path: Path,
                  destination: list[str]) -> list[str] | None:
    """Compone la invocación del store SIN ejecutarla.

    Separar componer de ejecutar es lo que permite medir la forma del comando
    sin escribir en ningún store — antes las dos vivían en ``main()`` y la única
    prueba posible era dejarlo escribir.

    Devuelve ``None`` sin ``agent_id``: no hay sujeto que registrar.
    """
    agent_id = payload.get("agent_id")
    if not agent_id:
        return None

    subcomando = "registrar-sesion" if mode == "start" else "actualizar-sesion"
    cmd = [sys.executable, str(store_path), subcomando, *destination,
           "--agent-id", str(agent_id)]

    if mode == "start":
        cmd += [
            "--subagent-type", payload.get("agent_type") or "desconocido",
            "--type-source", type_source(payload),
            "--session-id", payload.get("session_id") or "desconocida",
            "--status", "running",
        ]
    return cmd


def _destination_from_argv(argv: list[str]) -> list[str] | None:
    """Lee el destino que el CONSUMIDOR inyecta por línea de comandos.

    `AGENT_STORE_CLAUDE_DIR` se conserva como último recurso porque es lo que
    permite ejercitar el mecanismo de punta a punta contra un store temporal —
    una prueba que contamina el artefacto que audita no es una prueba. Pero ya
    no hay default de repo: sin destino declarado, el mecanismo rehúsa.
    """
    for bandera, clave in (("--claude-dir", "claude_dir"), ("--repo", "repo")):
        if bandera in argv:
            i = argv.index(bandera)
            if i + 1 < len(argv):
                return destination_args(**{clave: argv[i + 1]})
    return destination_args(claude_dir=os.environ.get("AGENT_STORE_CLAUDE_DIR"))


def main() -> None:
    mode = "start" if "--start" in sys.argv else "stop"

    destino = _destination_from_argv(sys.argv)
    if destino is None:
        # Rehusar, no inventar: un destino fabricado escribiría en el store
        # equivocado y nadie lo notaría. Sale 0 — el contrato del hook es no
        # romper el flujo del consumidor.
        print("register_session: destino no declarado "
              "(--repo <nombre> | --claude-dir <ruta>)", file=sys.stderr)
        return

    try:
        payload = json.load(sys.stdin)
    except Exception:
        return

    agent_id = payload.get("agent_id")
    agent_type = payload.get("agent_type")
    session_id = payload.get("session_id")
    if not agent_id:
        return

    # H-DOCS-481: `desconocido` colapsa dos hechos distintos, y el veredicto
    # sobre a quién corresponde el defecto depende de cuál sea. La fuente los
    # produce por caminos separados, medidos en el ejecutable 2.1.246:
    #
    #   SubagentStart   agent_type: n        — sin alternativa
    #   SubagentStop    agent_type: a ?? ""  — cadena VACÍA si el cliente no lo tiene
    #
    # Y `SubagentStart` no dispara en este entorno (:ref:`h-docs-167`), así que
    # toda alta viene del segundo — el que puede emitir el vacío. La columna
    # guarda la PROCEDENCIA, no el dato, igual que `usage_source` para los
    # tokens (:ref:`h-docs-427`).
    if agent_type:
        type_source = "payload"
    elif "agent_type" in payload:
        type_source = "vacio_en_origen"
    else:
        type_source = "ausente"

    if mode == "start":
        cmd = [
            sys.executable, str(AGENT_STORE), "registrar-sesion",
            *destino,
            "--agent-id", agent_id,
            "--subagent-type", agent_type or "desconocido",
            "--type-source", type_source,
            "--session-id", session_id or "desconocida",
            "--status", "running",
        ]
    else:
        cmd = [
            sys.executable, str(AGENT_STORE), "actualizar-sesion",
            *destino,
            "--agent-id", agent_id,
            "--status", "completed",
            # El alta pudo no ocurrir nunca: SubagentStart no dispara en este
            # entorno (H-DOCS-167). Sin esto el UPDATE da rowcount 0 y el
            # agente no queda registrado — medido: 5 de 5 agentes ausentes.
            "--crear-si-falta",
            "--session-id", session_id or "desconocida",
            "--subagent-type", agent_type or "desconocido",
            "--type-source", type_source,
        ]
        # El transcript DEL SUBAGENTE llega en ``agent_transcript_path``, no en
        # ``transcript_path`` — ése es el de la sesión principal, que
        # ``createBaseHookInput`` mete en todo payload. Leer el campo equivocado
        # no vacía el dato: lo llena con el uso de la sesión entera.
        #
        #   ccb: packages/agent/hooks.ts:4074-4078
        #       hook_event_name: 'SubagentStop',
        #       agent_id: subagentId,
        #       agent_transcript_path: getAgentTranscriptPath(subagentId),
        transcript_path = (
            payload.get("agent_transcript_path")
            or payload.get("transcript_path")
        )
        # La ruta que el cliente declara se GUARDA, exista o no. Es el único
        # dato que separa las dos causas de una fila sin uso medido, y sin él
        # quedan idénticas: `getAgentTranscriptPath(subagentId)` la CALCULA sin
        # comprobar que el archivo esté (:ref:`h-docs-481`).
        #
        # Medido al declararlo: de 394 filas con `source='hook'`, 0 tenían
        # contraparte en disco, mientras las 278 de reconciliación coincidían
        # 278 de 278. Sin la ruta no se puede distinguir «el cliente apunta a
        # una raíz que no miramos» de «el subagente no dejó transcript».
        # `background_tasks` es el ÚNICO campo del payload que nombra la CLASE
        # del emisor. El ejecutable lo construye por tarea del registro y le
        # pone su `kind` — medido en `2.1.246/claude_strings.txt`, la función
        # que arma la lista reparte por `case`: `agent` (que además adjunta
        # `agent_type`), `monitor_mcp`, `mcp_task`, `local_workflow`,
        # `in_process_teammate`, `remote_agent`, `dream`, `monitor_ws`,
        # `auto_mode_scan`, `local_bash`.
        #
        # Por qué hace falta: el transcript declarado ya descartó «apunta a una
        # raíz que no miramos» (la ruta que el cliente calcula es la que el
        # reconciliador barre, y el archivo no está). Lo que queda por saber es
        # QUIÉN emite, y ese dato viaja aquí.
        #
        # `figura_en_fondo` es falso explícito, no ausencia: sin él, «el agente
        # no era una tarea de fondo» y «nadie midió» quedan iguales.
        # `claves_de_payload` — el sucesor de la sonda de arriba, y responde a
        # OTRA pregunta. Aquélla preguntaba «¿de qué clase es el emisor?» y el
        # registro de tareas contestó que de ninguna: 30 de 30 eventos con
        # `figura_en_fondo` falso y el registro VACÍO (:ref:`h-docs-499`).
        #
        # La pregunta viva es «¿qué trae el payload que distinga a este emisor
        # de un subagente del tool Agent?», y no se puede responder leyendo los
        # cuatro campos que este hook ya nombra: sólo ve lo que fue a buscar.
        # Guardar el CONJUNTO DE CLAVES —los nombres, nunca los valores— deja
        # que el próximo evento declare su propia forma.
        #
        # Nombres y no valores por dos razones: un valor puede traer contenido
        # de la sesión (la lista blanca del anonimizador, tarea #662), y para
        # separar dos poblaciones basta con que sus formas difieran.
        marca = {"claves_de_payload": sorted(payload)}
        tareas = payload.get("background_tasks")
        if transcript_path:
            marca["agent_transcript_path"] = transcript_path
            marca["transcript_presente"] = os.path.exists(transcript_path)
        if isinstance(tareas, list):
            clases = {}
            homonima = None
            for tarea in tareas:
                if not isinstance(tarea, dict):
                    continue
                clase = tarea.get("kind") or "sin_kind"
                clases[clase] = clases.get(clase, 0) + 1
                if tarea.get("id") == agent_id:
                    homonima = tarea
            marca["clases_de_fondo"] = clases
            marca["figura_en_fondo"] = homonima is not None
            if homonima is not None:
                marca["tarea_de_fondo"] = homonima
        if marca:
            cmd += ["--metadata-merge-json", json.dumps(marca)]
        if transcript_path:
            uso = _extract_usage(transcript_path)
            tele = _telemetria(transcript_path)
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
            # La procedencia de la medición, pegada al bloque que mide. Ver
            # :ref:`h-docs-427`: sin ella, NULL en las cuatro columnas no
            # distingue «no gastó» de «nadie lo midió», y medido eran 353 de
            # 353 las filas de este hook sin un solo token.
            if any(k in uso for k in ("input_tokens", "cache_creation_tokens",
                                      "cache_read_tokens", "output_tokens")):
                cmd += ["--usage-source", "transcript"]
            # Los tres ejes de comparabilidad (:ref:`h-docs-222`, #599). Van
            # aparte del bloque de uso porque son opcionales: un transcript
            # viejo puede no declarar `effort`, y su ausencia es legitima.
            for flag, key in (
                ("--effort", "effort"),
                ("--client-version", "client_version"),
                ("--service-tier", "service_tier"),
            ):
                if uso.get(key) is not None:
                    cmd += [flag, str(uso[key])]
            # La causa de muerte (#600). El hook no la tenia: sólo la miraba el
            # reconciliador, así que un agente muerto por API quedaba sin
            # motivo hasta que pasara ese barrido — y con `SubagentStop` sin
            # disparar ante un error de API, podía no pasar nunca a tiempo.
            fallo = api_error(transcript_path) or {}
            for flag, key in (
                ("--api-error-status", "api_error_status"),
                ("--api-error-detail", "api_error_detail"),
                ("--rate-limit-type", "rate_limit_type"),
            ):
                if fallo.get(key) is not None:
                    cmd += [flag, str(fallo[key])]
            # El cierre y la compactacion (#601). Van con el bloque de uso —de
            # ahi salen— pero aparte, porque su ausencia es legitima: 274 de 277
            # transcripts nunca se compactaron.
            for flag, key in (
                ("--stop-reason", "stop_reason"),
                ("--compactions", "compactions"),
                ("--dropped-tokens", "dropped_tokens"),
            ):
                if uso.get(key) is not None:
                    cmd += [flag, str(uso[key])]
            # La telemetria del titular en vivo — duracion, usos de herramienta y
            # encargo (#587). Sale del MISMO transcript que ya se lee para el
            # costo, y se escribe aqui y no en un pase posterior porque aqui es
            # el unico momento en que el archivo existe con certeza: el payload
            # entrega su ruta al disparar. Medido en :ref:`h-docs-427`: de las
            # 353 filas que este hook habia escrito sin telemetria, **0**
            # conservaban su transcript cuando el reconciliador pasó.
            #
            # Van aparte del bloque de uso porque su ausencia es legitima: un
            # agente que no llamo a ninguna herramienta deja `tool_uses_total`
            # en NULL, y ese NULL significa «no hubo», no «nadie midio».
            for flag, key in (
                ("--duration-s", "duration_s"),
                ("--tool-uses-total", "tool_uses_total"),
                ("--tool-uses-json", "tool_uses_json"),
                ("--prompt", "prompt"),
            ):
                valor = tele.get(key)
                if valor is not None:
                    cmd += [flag, str(valor)]
            meta = _extract_meta(transcript_path)
            # Manda el transcript, no el sidecar. El sidecar declara lo que se
            # PIDIO — y lo declara como alias (``sonnet``), que ni siquiera fija
            # la version: el registro del cliente lo resuelve distinto por
            # proveedor (:ref:`h-docs-220`). El transcript declara lo que
            # SIRVIO el turno, que es lo unico ponderable (#286). El sidecar
            # solo entra si trae un identificador completo, y ademas falta en
            # un tercio de los casos (:ref:`h-docs-219`).
            modelo = uso.get("derived_model") or normalize_model(meta.get("model"))
            if modelo:
                cmd += ["--model", modelo]
            alias = normalize_model_alias(meta.get("model"))
            if alias:
                cmd += ["--model-alias", alias]
            if meta.get("description"):
                cmd += ["--description", meta["description"]]
            if meta.get("spawn_depth") is not None:
                cmd += ["--spawn-depth", str(meta["spawn_depth"])]
            # Sólo rellena si el alta quedó en 'desconocido' (el UPDATE lo
            # protege con NULLIF): el `agent_type` del payload de SubagentStart
            # es la fuente preferente cuando llegó.
            if meta.get("subagent_type"):
                # El sidecar es la OTRA procedencia posible del tipo: pisa la
                # del payload sólo cuando el alta quedó en `desconocido` (el
                # UPDATE lo protege con NULLIF), así que declararla aquí no
                # falsea una fila que ya traía tipo real.
                cmd += ["--subagent-type", meta["subagent_type"],
                        "--type-source", "sidecar"]
            if meta.get("tool_use_id"):
                cmd += ["--tool-use-id", meta["tool_use_id"]]
            # El perfil de ejecucion va junto a lo que el sidecar traiga sin
            # columna propia: los dos son metadata del agente y comparten
            # ranura. Se consulta con ``json_extract``; se promueve a columna
            # cuando alguna consulta lo pida de verdad.
            extra = dict(meta.get("extra") or {})
            if uso.get("perfil"):
                extra["perfil_ejecucion"] = uso["perfil"]
            if extra:
                cmd += ["--metadata-json", json.dumps(extra, ensure_ascii=False)]
        # Nivel de retención, decidido con el campo del propio payload.
        # `last_assistant_message` es opcional en el esquema de SubagentStop:
        # su AUSENCIA es la firma del agente que murió sin entregar.
        mensaje_final = payload.get("last_assistant_message")
        entrego = bool(mensaje_final and str(mensaje_final).strip())
        cmd += ["--retention-level", "3" if entrego else "4"]
        # La vía de captura es un hecho de ESTA ejecución, no del sidecar:
        # el hook disparó, luego la fila la vio el hook.
        cmd += ["--source", "hook"]
    # `spool=True`: si la escritura falla, el evento se encola en disco y
    # `drenar_carrete.py` lo reenvia al arrancar la proxima sesion (#652,
    # `heng: part7/ch29.md` §29.3). Los dos comandos que este hook emite son
    # idempotentes —resuelven con COALESCE sobre la misma clave— asi que
    # reenviar uno ya aplicado no cambia la fila.
    run_and_log(f"register_agent_session.py --{mode}", cmd, timeout=10, spool=True)


if __name__ == "__main__":
    main()
