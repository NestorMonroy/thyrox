"""Pruebas de ``transcript.usage`` — cuánto costó un transcript, no de quién es.

Adaptación de ``kaupamex-docs:
.claude/scripts/agents/medir_usage_subagentes.py``. Lo que viaja: la lectura
de ``message.usage`` por línea del JSONL, la deduplicación por
``message.id`` y el acumulado en los cuatro componentes que Anthropic factura
por separado. Lo que se inyecta es la tabla de pesos — no hay un precio por
defecto escondido en el primitivo (DEC-04).

Por qué la deduplicación por ``message.id`` es el corazón de este primitivo
-----------------------------------------------------------------------------

Un turno emitido en streaming aparece varias veces en el JSONL con el MISMO
``message.id`` y el MISMO ``message.usage`` — la documentación oficial lo dice
desde el otro lado (``ccdoc: cost-tracking.md``, *Understand token usage*):
*"all messages in a streamed response share the same usage"*. Sumar cada
aparición cuenta ese turno tantas veces como fragmentos tenga. Medido en la
fuente que se adapta: **3880 mensajes con usage sobre 1983 ids únicos** — casi
el doble. El caso 2 de abajo es el que DISCRIMINA esto: tres líneas con el
mismo id y el mismo ``usage`` tienen que contar como UNA.

Por qué los pesos NO llevan un valor por defecto
--------------------------------------------------

``medir_usage_subagentes.py:63`` declaraba ``PESO = {..., 'cache_read': 0.1,
...}`` y su propio comentario advertía (H-DOCS-1008) que en el tier
``tier_10_50_cache_read_0_25`` la caché leída NO vale 0.1× el input — el peso
es una propiedad del **contrato de precio**, no del transcript. El caso 7
confirma que ``weighted({})`` da 0.0: no hay ningún peso agazapado si el
llamador no lo declara.

Por qué ``accumulate`` de CERO líneas NO rehúsa
--------------------------------------------------

``repo.pending_work.sweep([])`` rehúsa porque una lista de repos vacía es
ambigua: ¿nadie configuró nada, o de verdad no hay repos? Aquí no aplica la
misma premisa. ``accumulate`` no recibe una lista de configuración — recibe
líneas YA leídas de un archivo concreto. Un transcript cuyas líneas no
contienen ningún ``usage`` de asistente describe un hecho medible y real («este
dato no gastó nada»), igual que ``roster.job_liveness.sweep([])`` no rehúsa
porque un roster vacío es un estado tranquilo legítimo, no una lista de
configuración olvidada. El caso 6 lo confirma: cero líneas da un ``Usage`` en
ceros, sin excepción.

*Métrica:* las cuatro claves de ``message.usage`` (``input_tokens``,
``cache_creation_input_tokens``, ``cache_read_input_tokens``,
``output_tokens``) por línea ``type: assistant`` con ``message.id`` único.
*Ciega a:* un mensaje del asistente sin ``message.id`` — se cuenta sin poder
deduplicarlo (caso 5); y a si el ``usage`` reportado por el cliente es exacto
— no se verifica contra nada externo.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))

from transcript import usage as tu  # noqa: E402

OK = 0
FAILED = 0


def check(label: str, expected, obtained) -> None:
    global OK, FAILED
    if expected == obtained:
        print(f"  ok    {label}")
        OK += 1
    else:
        print(f"  FALLO {label}\n        esperado=[{expected}] obtenido=[{obtained}]")
        FAILED += 1


def assistant(message_id: str | None, *, input_tokens=0, cache_creation=0,
              cache_read=0, output=0, drop_keys=()) -> dict:
    """Una línea ``assistant`` con su ``usage`` — omitiendo claves si se pide."""
    body = {"input_tokens": input_tokens,
            "cache_creation_input_tokens": cache_creation,
            "cache_read_input_tokens": cache_read,
            "output_tokens": output}
    for key in drop_keys:
        body.pop(key, None)
    message = {"role": "assistant", "usage": body}
    if message_id is not None:
        message["id"] = message_id
    return {"type": "assistant", "message": message}


def assistant_sin_usage(message_id: str = "sin-usage") -> dict:
    return {"type": "assistant", "message": {"role": "assistant", "id": message_id}}


def user(text: str = "hola") -> dict:
    return {"type": "user", "message": {"role": "user", "content": text}}


print("== 1. usage_of — un mensaje assistant con las cuatro claves ==")
linea = assistant("m1", input_tokens=10, cache_creation=20, cache_read=30, output=40)
check("las cuatro claves mapeadas",
      {"input": 10, "cache_creation": 20, "cache_read": 30, "output": 40},
      tu.usage_of(linea))

print("== 2. usage_of — un mensaje sin type assistant da None ==")
check("un mensaje de usuario no aplica", None, tu.usage_of(user()))

print("== 3. usage_of — un assistant SIN usage da None, no revienta ==")
check("sin la clave usage", None, tu.usage_of(assistant_sin_usage()))

print("== 4. usage_of — clave AUSENTE dentro de usage cuenta 0, no revienta ==")
sin_cache_creation = assistant("m2", input_tokens=5, cache_read=7, output=9,
                                drop_keys=("cache_creation_input_tokens",))
check("cache_creation en 0 cuando falta la clave",
      {"input": 5, "cache_creation": 0, "cache_read": 7, "output": 9},
      tu.usage_of(sin_cache_creation))

print("== 5. accumulate — suma básica de dos mensajes con ids distintos ==")
lineas = [assistant("a1", input_tokens=1, cache_creation=2, cache_read=3, output=4),
          assistant("a2", input_tokens=10, cache_creation=20, cache_read=30, output=40)]
resultado = tu.accumulate(lineas)
check("input sumado", 11, resultado.input)
check("cache_creation sumado", 22, resultado.cache_creation)
check("cache_read sumado", 33, resultado.cache_read)
check("output sumado", 44, resultado.output)
check("dos ids únicos aportaron", 2, resultado.messages)
check("total() suma los cuatro", 110, resultado.total())

print("== 6. DISCRIMINA: tres líneas con el MISMO id cuentan UNA vez ==")
# El defecto medido en la fuente: un turno en streaming se repite con el
# mismo message.id y el mismo usage. Sumar las tres cuenta el turno 3 veces.
repetido = [assistant("dup", input_tokens=100, cache_creation=200,
                       cache_read=300, output=400) for _ in range(3)]
dedupe = tu.accumulate(repetido)
check("input NO se triplica", 100, dedupe.input)
check("cache_read NO se triplica", 300, dedupe.cache_read)
check("un solo id único, aunque aparezca 3 veces", 1, dedupe.messages)

print("== 7. accumulate ignora lo que no aplica sin romperse ==")
mixto = [user("algo"), assistant_sin_usage("x"),
         assistant("m3", input_tokens=1, output=1)]
mixto_resultado = tu.accumulate(mixto)
check("sólo el que trae usage cuenta", 1, mixto_resultado.messages)
check("y su input se refleja", 1, mixto_resultado.input)

print("== 8. accumulate de CERO líneas da Usage en ceros, sin excepción ==")
# A diferencia de repo.pending_work.sweep([]), aquí no hay ambigüedad de
# configuración: accumulate recibe líneas ya leídas, y cero de ellas con
# usage es un hecho medible, no una lista vacía por descuido.
vacio = tu.accumulate([])
check("los cuatro componentes en 0", (0, 0, 0, 0), (vacio.input, vacio.cache_creation,
                                                     vacio.cache_read, vacio.output))
check("cero mensajes únicos", 0, vacio.messages)
check("total() también da 0", 0, vacio.total())

print("== 9. un message.id AUSENTE no se deduplica — se cuenta igual ==")
sin_id = [assistant(None, input_tokens=5, output=5),
          assistant(None, input_tokens=5, output=5)]
sin_id_resultado = tu.accumulate(sin_id)
check("las dos apariciones sin id se suman (no se puede deduplicar)",
      10, sin_id_resultado.input)
check("y cada una cuenta como su propio mensaje", 2, sin_id_resultado.messages)

print("== 10. weighted — con pesos inyectados da la combinación esperada ==")
uso = tu.Usage(input=2, cache_creation=3, cache_read=5, output=7, messages=1)
pesos = {"input": 1.0, "cache_creation": 1.25, "cache_read": 0.1, "output": 5.0}
esperado = 2 * 1.0 + 3 * 1.25 + 5 * 0.1 + 7 * 5.0
check("weighted() combina cada componente con su peso", esperado, uso.weighted(pesos))

print("== 11. weighted — SIN peso inyectado da 0.0, no hay precio oculto ==")
check("un mapping vacío no asume ningún peso por defecto", 0.0, uso.weighted({}))

print(f"\n{OK} ok, {FAILED} fallos")
raise SystemExit(1 if FAILED else 0)
