#!/usr/bin/env python3
"""La fila decia `tool_use` y el agente habia entregado su reporte.

Mitad ROJA de TASK-THYROX-0155. El store tenia 325 filas `completed` con
`stop_reason='tool_use'` — un cierre que, leido literal, dice que el agente
paro llamando a una herramienta. Medido sobre los 109 transcripts que
sobreviven: los 109 cierran con un bloque `text`, el reporte. Ninguno paro en
una herramienta.

El valor no lo pone el agente: lo pone la REGLA. `_extract_usage` resuelve el
cierre por el ULTIMO NO NULO (`register_session.py`), asi que un mensaje final
con `stop_reason: null` la hace retroceder al anterior, que es la llamada a
herramienta del turno previo.

Y el nulo del mensaje final tampoco es del agente. El cliente emite DOS clases
de linea `assistant`, y el ejecutable las declara (2.1.266):

    por bloque      `message: {...<parcial>, content: <bloque>}`, `apiBlockIndex`
                    del bloque, SIN recomputar `usage` — hereda la del
                    `message_start`, de ahi `output_tokens` de un digito.
    reconciliada    `message: {..., usage: K7(<delta>, <base>)}`, con la
                    contabilidad del evento terminal y su `stop_reason`.

Cuando la ultima linea del transcript es de la primera clase, el campo esta
presente y vale nulo. La medicion separa las dos poblaciones sin solape:
`output_tokens` 1..10 en el grupo acusado contra 24..3429 en el otro, sobre
cuerpos de mediana 2736 y 2804 caracteres.

**La regla NO se cambia, y eso esta medido.** Los 16 `stop_sequence` del store
son EXACTAMENTE los 16 con `api_error_status` — dos instrumentos independientes
que coinciden. Tomar el ultimo a secas rompería ese control cruzado. Lo que
falta es la OTRA cifra: `last_stop_reason`, el valor crudo del ultimo mensaje,
que es el unico que distingue «cerro asi» de «la regla retrocedio».

*Metrica:* las dos columnas de cierre que `_extract_usage` devuelve para un
transcript con cada una de las dos formas medidas.
*Ciega a:* por que el cliente no llega a la emision reconciliada —eso es flujo
suyo, no se lee del transcript—; y a los 216 de los 325 cuyo transcript ya no
esta en disco, que conservan `tool_use` sin forma de re-derivarlo.

CONTROL DE ANULACION: retirada la escritura de `last_stop_reason` (la clave
fuera del dict que `_extract_usage` devuelve), caen las aserciones que la
nombran y SOBREVIVEN las de `stop_reason` — el veredicto de la regla no
cambia. Ese contraste es lo que hace que el verde signifique algo: sin el, no
distinguiria «la columna nueva declara el cierro crudo» de «la fila sigue
diciendo tool_use».
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

def _thyrox_root() -> Path:
    """La raiz por MARCADOR, no por `parents[N]`.

    `parents[N]` cuenta niveles del arbol de ORIGEN: al mover el archivo, el
    indice sigue resolviendo y apunta a otro sitio — falla en silencio. Este
    arbol lo prohibe y lo barrio (`bin/check_path_arithmetic`). El marcador es
    el mismo que `reach.THYROX_MARKER` declara; se repite aqui, y solo aqui,
    porque este es el arranque: no se puede importar `reach` sin localizarlo.
    """
    aqui = Path(__file__).resolve()
    marcador = Path("src") / "paths" / "reach.py"
    for nivel in (aqui.parent, *aqui.parents):
        if (nivel / marcador).is_file():
            return nivel
    raise RuntimeError(f"no se encontro la raiz de thyrox ascendiendo desde {aqui}")


HERE = _thyrox_root()

spec = importlib.util.spec_from_file_location(
    "register_session", HERE / "src" / "agents" / "register_session.py")
register_session = importlib.util.module_from_spec(spec)
sys.modules["register_session"] = register_session
spec.loader.exec_module(register_session)

#: El destilador que responde la MISMA pregunta por otro camino. No lo importa
#: el extractor —seria un segundo recorrido de un archivo de 2.0 MB de mediana
#: por agente— sino esta suite, para comprobar que los dos coinciden.
_spec_closing = importlib.util.spec_from_file_location(
    "closing", HERE / "src" / "transcript" / "closing.py")
closing = importlib.util.module_from_spec(_spec_closing)
sys.modules["closing"] = closing
_spec_closing.loader.exec_module(closing)

OK = FAILED = 0


def check(label, expected, obtained):
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected!r}] obtenido=[{obtained!r}]")
        FAILED += 1


#: El cuerpo del reporte final. Su tamano importa: es lo que hace absurdo el
#: `output_tokens` de la linea por bloque, y por eso no es una cadena corta.
REPORT = "Listo. Ambos gates pasan y el barrido quedo registrado. " * 40


def _assistant(message_id, stop_reason, blocks, output_tokens, block_index=0):
    """Una linea `assistant` del transcript, con la forma que el cliente emite.

    `stop_reason` viaja SIEMPRE como clave: en la forma por bloque esta
    presente y vale nulo, que no es lo mismo que estar ausente. Colapsar las
    dos es el defecto que este control existe para separar.
    """
    return json.dumps({
        "type": "assistant",
        "apiBlockIndex": block_index,
        "version": "2.1.266",
        "message": {
            "id": message_id,
            "role": "assistant",
            "model": "claude-sonnet-5",
            "content": blocks,
            "stop_reason": stop_reason,
            "stop_details": None,
            "usage": {
                "input_tokens": 4,
                "cache_creation_input_tokens": 0,
                "cache_read_input_tokens": 120_000,
                "output_tokens": output_tokens,
            },
        },
    })


def _write(path, lines):
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return str(path)


TOOL_CALL = _assistant(
    "msg_previo", "tool_use",
    [{"type": "tool_use", "id": "toolu_1", "name": "Bash", "input": {}}], 219)

#: La forma del grupo acusado: la ultima linea es la EMISION POR BLOQUE — el
#: campo presente y nulo, y una contabilidad de talon sobre un cuerpo largo.
FINAL_PARTIAL = _assistant(
    "msg_final", None, [{"type": "text", "text": REPORT}], 2)

#: La forma del grupo de contraste: la emision RECONCILIADA, con el cierre real
#: y un `output_tokens` proporcional al cuerpo.
FINAL_RECONCILED = _assistant(
    "msg_final", "end_turn", [{"type": "text", "text": REPORT}], 1029)


with tempfile.TemporaryDirectory() as tmp:
    raiz = Path(tmp)

    parcial = register_session._extract_usage(
        _write(raiz / "parcial.jsonl", [TOOL_CALL, FINAL_PARTIAL]))
    reconciliado = register_session._extract_usage(
        _write(raiz / "reconciliado.jsonl", [TOOL_CALL, FINAL_RECONCILED]))

    print("== 1. la REGLA no cambia: sigue publicando el ultimo NO NULO ==")
    # Su control cruzado —16 `stop_sequence` == 16 `api_error_status`— vive en
    # el store y depende de esta regla. Cambiarla lo destruiria.
    check("con el final parcial, la regla retrocede al turno anterior",
          "tool_use", parcial.get("stop_reason"))
    check("con el final reconciliado, la regla publica su cierre",
          "end_turn", reconciliado.get("stop_reason"))

    print("== 2. la columna NUEVA declara el cierre CRUDO del ultimo mensaje ==")
    check("el final parcial no declaro cierre: la columna es nula",
          None, parcial.get("last_stop_reason"))
    check("el final reconciliado si lo declaro",
          "end_turn", reconciliado.get("last_stop_reason"))

    print("== 3. y la clave EXISTE en los dos: nula no es ausente ==")
    # Sin esto, un `dict.get` que devuelve None no distingue «el transcript
    # declaro nulo» de «esta version del extractor no escribe la columna» —
    # que es la misma confusion, un nivel mas arriba, que el caso 2 separa
    # abajo en el transcript.
    check("la clave viaja en el dict del final parcial",
          True, "last_stop_reason" in parcial)
    check("y en el del reconciliado",
          True, "last_stop_reason" in reconciliado)

    print("== 4. las dos cifras DISCREPAN en el grupo acusado y no en el otro ==")
    # Es el caso que hace que la columna gane su sitio: con una sola cifra, la
    # divergencia es invisible.
    check("discrepan con el final parcial", True,
          parcial.get("stop_reason") != parcial.get("last_stop_reason"))
    check("coinciden con el final reconciliado", True,
          reconciliado.get("stop_reason") == reconciliado.get("last_stop_reason"))

    print("== 5. CONTROL CRUZADO: el destilador y el extractor coinciden ==")
    # Las dos derivaciones son independientes —`closing.read()` recorre el
    # archivo por su cuenta— y responden la misma pregunta. Que coincidan es lo
    # que sustituye a compartir el codigo. Si alguna vez divergen, este caso lo
    # dice antes de que una fila del store lo publique.
    for etiqueta, ruta, extraido in (
            ("final parcial", raiz / "parcial.jsonl", parcial),
            ("final reconciliado", raiz / "reconciliado.jsonl", reconciliado)):
        destilado = closing.read(ruta)
        check(f"[{etiqueta}] el cierre crudo coincide",
              destilado.last_stop_reason, extraido.get("last_stop_reason"))
        check(f"[{etiqueta}] la regla coincide",
              destilado.last_declared_stop_reason, extraido.get("stop_reason"))
        check(f"[{etiqueta}] el denominador coincide",
              destilado.assistant_messages, extraido.get("assistant_messages"))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
